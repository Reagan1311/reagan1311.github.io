import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import worker from "../src/index.js";
import { DAY, archiveDay, archivedStats, inspectAnalytics, readRange, syncAnalytics } from "../src/analytics.js";

const now = Date.parse("2026-09-21T12:00:00Z");
const tag = "a".repeat(32);
const settings = {
  enabled: true,
  maxPageSize: 1000,
  maxDuration: 31 * 86400,
  notOlderThan: 180 * 86400,
  availableFields: ["sum_visits", "dimensions_countryName", "dimensions_refererHost", "dimensions_userAgentOS", "dimensions_deviceType"],
};
const inspected = { account: "b".repeat(32), hosts: ["genli.top", "www.genli.top"], siteTags: [tag], settings };
const raw = (count = 3) => ({
  total: [{ sum: { visits: count } }],
  country: [{ dimensions: { countryName: "SG" }, sum: { visits: count } }],
  referrer: [{ dimensions: { refererHost: "www.google.com" }, sum: { visits: count } }],
  os: [{ dimensions: { userAgentOS: "MacOSX" }, sum: { visits: count } }],
  device: [{ dimensions: { deviceType: "desktop" }, sum: { visits: count } }],
});
function api(resolver = () => raw(), customSettings = settings) {
  const calls = [];
  const fetcher = async (url, options) => {
    assert.equal(url, "https://api.cloudflare.com/client/v4/graphql");
    const request = JSON.parse(options.body);
    calls.push(request);
    let data;
    if (request.query.includes("settings {")) data = { settings: { rumPageloadEventsAdaptiveGroups: customSettings } };
    else if (request.query.includes("sites:")) data = { sites: [{ dimensions: { siteTag: tag, requestHost: "www.genli.top" }, sum: { visits: 3 } }] };
    else data = await resolver(request);
    return Response.json({ data: { viewer: { accounts: [data] } } });
  };
  return { fetcher, calls };
}
function setup(t) {
  const sql = new DatabaseSync(":memory:");
  sql.exec("PRAGMA foreign_keys=ON");
  const directory = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort())
    sql.exec(readFileSync(new URL(file, directory), "utf8"));
  t.after(() => sql.close());
  const DB = {
    prepare(query) {
      const statement = sql.prepare(query);
      const wrap = (values = []) => ({
        bind: (...bound) => wrap(bound),
        first: async () => statement.get(...values) || null,
        run: async () => ({ meta: { changes: statement.run(...values).changes } }),
        all: async () => ({ results: statement.all(...values) }),
        execute: () => ({ results: statement.all(...values) }),
      });
      return wrap();
    },
    async batch(statements) {
      sql.exec("BEGIN");
      try {
        const result = statements.map((statement) => statement.execute());
        sql.exec("COMMIT");
        return result;
      } catch (error) {
        sql.exec("ROLLBACK");
        throw error;
      }
    },
  };
  const env = {
    DB,
    CF_ACCOUNT_ID: inspected.account,
    CF_HOSTS: inspected.hosts.join(","),
    CF_ANALYTICS_TOKEN: "test-only-token",
    ALLOWED_ORIGINS: "https://genli.top,https://www.genli.top",
    READ_LIMITER: { limit: async () => ({ success: true }) },
  };
  return { sql, env };
}
const snapshot = (total) => ({
  total,
  dimensions: [
    { dimension: "country", value: "SG", visits: total },
    { dimension: "referrer", value: "direct", visits: total },
    { dimension: "os", value: "Windows", visits: total },
    { dimension: "device", value: "Desktop", visits: total },
  ],
});
function ready(sql, since = "2026-03-01T00:00:00Z") {
  sql.prepare("UPDATE cf_sync_state SET history_start=?,bootstrap_complete=1,last_success=? WHERE id=1").run(since, new Date(now).toISOString());
}

test("inspection verifies dataset permissions and finds the configured site's Visits", async (t) => {
  const { env } = setup(t);
  const mock = api();
  const result = await inspectAnalytics(env, now, mock.fetcher);
  assert.deepEqual(result.siteTags, [tag]);
  assert.deepEqual(mock.calls[1].variables.filter.OR, [{ requestHost: "genli.top" }, { requestHost: "www.genli.top" }]);
  await assert.rejects(inspectAnalytics(env, now, api(undefined, { ...settings, enabled: false }).fetcher), /unavailable/);
  await assert.rejects(inspectAnalytics(env, now, api(undefined, { ...settings, availableFields: ["sum_visits"] }).fetcher), /dimensions/);
});

test("Visits are not page views, sampleInterval is not multiplied, labels are coarse", async (t) => {
  const { env } = setup(t);
  const mock = api(() => {
    const result = raw(3);
    result.total[0].count = 99;
    result.total[0].avg = { sampleInterval: 10 };
    return result;
  });
  const result = await readRange(env, inspected, now - DAY, now, mock.fetcher);
  assert.equal(result.total, 3);
  assert.deepEqual(
    result.dimensions.map((row) => row.value),
    ["SG", "google.com", "macOS", "Desktop"]
  );
  const filter = mock.calls[0].variables.filter;
  assert.equal(filter.datetime_lt, new Date(now).toISOString());
  assert.deepEqual(filter.AND[1], { OR: [{ siteTag: tag }] });
});

test("possibly truncated responses are split into non-overlapping time ranges", async (t) => {
  const { env } = setup(t);
  const small = { ...inspected, settings: { ...settings, maxPageSize: 2 } };
  const mock = api(({ variables }) => {
    const data = raw();
    if (Date.parse(variables.filter.datetime_lt) - Date.parse(variables.filter.datetime_geq) > DAY / 2)
      data.referrer.push({ dimensions: { refererHost: "github.com" }, sum: { visits: 1 } });
    return data;
  });
  const result = await readRange(env, small, now - DAY, now, mock.fetcher);
  assert.equal(mock.calls.length, 3);
  assert.equal(result.total, 6);
  assert.equal(mock.calls[1].variables.filter.datetime_lt, mock.calls[2].variables.filter.datetime_geq);
});

test("daily replacement is idempotent and a failed dimension insert rolls back the complete day", async (t) => {
  const { env, sql } = setup(t);
  const args = [env, "2026-09-20", now - DAY, now, snapshot(5), new Date(now).toISOString()];
  await archiveDay(...args);
  await archiveDay(...args);
  assert.equal(sql.prepare("SELECT SUM(visits) AS n FROM cf_days").get().n, 5);
  sql.exec("CREATE TRIGGER broken BEFORE INSERT ON cf_dimensions BEGIN SELECT RAISE(ABORT,'storage failure'); END");
  await assert.rejects(archiveDay(env, "2026-09-20", now - DAY, now, snapshot(9), new Date(now).toISOString()));
  assert.equal(sql.prepare("SELECT visits FROM cf_days").get().visits, 5);
  assert.equal(sql.prepare("SELECT SUM(visits) AS n FROM cf_dimensions").get().n, 20);
});

test("archive counts countries once, preserves unknown visits, and retains old daily totals", async (t) => {
  const { env, sql } = setup(t);
  await archiveDay(env, "2025-01-01", Date.parse("2025-01-01"), Date.parse("2025-01-02"), snapshot(4), new Date(now).toISOString());
  const current = snapshot(3);
  current.dimensions[0].visits = 2;
  current.dimensions.push({ dimension: "country", value: "unknown", visits: 1 });
  await archiveDay(env, "2026-09-21", now - 3600000, now, current, new Date(now).toISOString());
  ready(sql, "2025-01-01T00:00:00Z");
  const data = await archivedStats(env, now);
  assert.equal(data.total, 7);
  assert.equal(data.countryCount, 1);
  assert.deepEqual(data.countries, [{ code: "SG", count: 6 }]);
  assert.equal(data.unknownCountryVisits, 1);
  assert.equal(data.stale, false);
  assert.equal((await archivedStats(env, now + 4 * 3600000)).stale, true);
});

test("bootstrap resumes after failure without repeating completed days", async (t) => {
  const { env, sql } = setup(t);
  const shortSettings = { ...settings, notOlderThan: (2 * DAY) / 1000 };
  const first = api(undefined, shortSettings);
  let result = await syncAnalytics(env, { now, fetcher: first.fetcher, maxDays: 1 });
  assert.equal(result.status, "importing");
  assert.equal(await archivedStats(env, now), null);
  const cursor = sql.prepare("SELECT next_day FROM cf_sync_state").get().next_day;
  await assert.rejects(
    syncAnalytics(env, {
      now,
      fetcher: api(() => {
        throw new Error("offline");
      }, shortSettings).fetcher,
    })
  );
  assert.equal(sql.prepare("SELECT next_day FROM cf_sync_state").get().next_day, cursor);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM cf_days").get().n, 1);
  result = await syncAnalytics(env, { now, fetcher: first.fetcher });
  assert.equal(result.status, "ready");
  assert.equal((await archivedStats(env, now)).total, 9);
  await syncAnalytics(env, { now, fetcher: first.fetcher });
  assert.equal((await archivedStats(env, now)).total, 9);
  assert.equal(sql.prepare("SELECT last_error FROM cf_sync_state").get().last_error, null);
});

test("concurrent syncs are locked and failed reads preserve the last good snapshot", async (t) => {
  const { env, sql } = setup(t);
  sql.prepare("UPDATE cf_sync_state SET lock_owner='other',lock_until=? WHERE id=1").run(new Date(now + 60000).toISOString());
  assert.deepEqual(
    await syncAnalytics(env, {
      now,
      fetcher: () => {
        throw new Error("must not fetch");
      },
    }),
    { status: "busy" }
  );
  sql.exec("UPDATE cf_sync_state SET lock_owner=NULL,lock_until=NULL WHERE id=1");
  await archiveDay(env, "2026-09-21", now - 3600000, now, snapshot(7), new Date(now).toISOString());
  ready(sql);
  await assert.rejects(
    syncAnalytics(env, {
      now,
      fetcher: () => {
        throw new Error("offline");
      },
    })
  );
  const data = await archivedStats(env, now);
  assert.equal(data.total, 7);
  assert.equal(data.stale, true);
});

test("the public v2 endpoint is read-only, supports both origins, and reports unavailable instead of zero", async (t) => {
  const { env, sql } = setup(t);
  const request = (origin) => new Request("https://stats.genli.top/stats/v2", { headers: { Origin: origin } });
  assert.equal((await worker.fetch(request("https://genli.top"), env)).status, 503);
  await archiveDay(env, "2026-09-21", now - 3600000, now, snapshot(1), new Date(now).toISOString());
  ready(sql);
  for (const origin of ["https://genli.top", "https://www.genli.top"]) {
    const response = await worker.fetch(request(origin), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
    assert.equal((await response.json()).total, 1);
  }
  assert.equal((await worker.fetch(request("https://evil.example"), env)).status, 403);
  assert.equal(sql.prepare("SELECT visits FROM cf_days").get().visits, 1);
  env.LEGACY_COLLECTION_ENABLED = "false";
  assert.equal((await worker.fetch(new Request("https://stats.genli.top/collect", { method: "POST" }), env)).status, 410);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM locations").get().n, 0);
  assert.equal((await worker.fetch(new Request("https://stats.genli.top/internal/analytics/status"), env)).status, 404);
});
