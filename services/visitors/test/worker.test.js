import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import worker, { clientCategory, referrerDomain } from "../src/counter.js";
import { last30Dates } from "../src/daily.js";

const origin = "https://genli.top";
const singapore = { country: "SG", regionCode: "01", city: "Singapore", latitude: "1.3521", longitude: "103.8198" };
const NOW = Date.parse("2026-09-23T04:00:00Z");
const activityCounts = (count = 0) => ({
  activity: {
    timeZone: "Asia/Shanghai",
    since: "2026-09-23",
    start: "2026-08-25",
    end: "2026-09-23",
    today: count,
    last30Days: count,
    undatedVisits: 0,
    days: last30Dates(NOW).map((date, index) => ({ date, count: index === 29 ? count : null })),
  },
});

const dimensionCounts = (count) => ({
  referrers: count ? [{ name: "direct", count }] : [],
  operatingSystems: count ? [{ name: "Unknown", count }] : [],
  deviceTypes: count ? [{ name: "Unknown", count }] : [],
});
const countryCounts = (known = 0, unknown = 0) => ({
  source: "self-hosted",
  metric: "visits",
  countryCount: known ? 1 : 0,
  countries: known ? [{ code: "SG", count: known }] : [],
  unknownCountryVisits: unknown,
});

function setup(t, now = NOW) {
  t.mock.timers.enable({ apis: ["Date"], now });
  const sql = new DatabaseSync(":memory:");
  sql.exec(readFileSync(new URL("../migrations/0001_locations.sql", import.meta.url), "utf8"));
  sql.exec(readFileSync(new URL("../migrations/0002_dimensions.sql", import.meta.url), "utf8"));
  sql.exec(readFileSync(new URL("../migrations/0004_daily_visits.sql", import.meta.url), "utf8"));
  sql.prepare("UPDATE visitor_counter_meta SET daily_started_at = ? WHERE id = 1").run(new Date(now).toISOString());
  t.after(() => sql.close());
  const limiter = { limit: async () => ({ success: true }) };
  const env = {
    ALLOWED_ORIGINS: `${origin},https://www.genli.top`,
    COLLECT_LIMITER: limiter,
    READ_LIMITER: limiter,
    DB: {
      prepare(query) {
        const statement = sql.prepare(query);
        const wrap = (values = []) => ({
          bind: (...bound) => wrap(bound),
          execute: () => ({ results: statement.all(...values) }),
        });
        return wrap();
      },
      async batch(statements) {
        sql.exec("BEGIN");
        try {
          const results = statements.map((statement) => statement.execute());
          sql.exec("COMMIT");
          return results;
        } catch (error) {
          sql.exec("ROLLBACK");
          throw error;
        }
      },
    },
  };
  const call = (path, { method = path === "/collect" ? "POST" : "GET", cf = singapore, headers = { Origin: origin }, body } = {}) => {
    const request = new Request(`https://stats.genli.top${path}`, { method, headers, body });
    Object.defineProperty(request, "cf", { value: cf });
    return worker.fetch(request, env);
  };
  return { env, sql, call };
}

test("empty database and successful atomic city aggregation", async (t) => {
  const { call, sql } = setup(t);
  assert.deepEqual(await (await call("/stats")).json(), {
    total: 0,
    places: 0,
    points: [],
    ...dimensionCounts(0),
    ...countryCounts(),
    ...activityCounts(),
  });
  const responses = await Promise.all(Array.from({ length: 25 }, () => call("/collect")));
  assert.ok(responses.every((response) => response.status === 204));
  assert.deepEqual(await (await call("/stats")).json(), {
    ...dimensionCounts(25),
    ...countryCounts(25),
    ...activityCounts(25),
    total: 25,
    places: 1,
    points: [{ country: "SG", city: "Singapore", lat: 1.4, lon: 103.8, count: 25 }],
  });
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM locations").get().n, 1);
});

test("unknown or invalid coordinates count without plotting a false zero point", async (t) => {
  const { call } = setup(t);
  for (const cf of [{}, { ...singapore, latitude: null }, { ...singapore, latitude: "" }, { ...singapore, longitude: "181" }]) {
    assert.equal((await call("/collect", { cf })).status, 204);
  }
  assert.deepEqual(await (await call("/stats")).json(), {
    total: 4,
    places: 0,
    points: [],
    ...dimensionCounts(4),
    ...countryCounts(3, 1),
    ...activityCounts(4),
  });
  await call("/collect");
  const result = await (await call("/stats")).json();
  assert.equal(result.total, 5);
  assert.equal(result.places, 1);
  assert.equal(result.points[0].count, 4);
});

test("cities with the same name in different regions remain distinct; zero coordinates are valid", async (t) => {
  const { call } = setup(t);
  await call("/collect", { cf: { ...singapore, regionCode: "A", latitude: "0", longitude: "0" } });
  await call("/collect", { cf: { ...singapore, regionCode: "B" } });
  const stats = await (await call("/stats")).json();
  assert.equal(stats.places, 2);
  assert.equal(stats.total, 2);
  assert.equal(stats.points[0].lat, 0);
});

test("countries aggregate across cities without requiring coordinates and include unknown visits honestly", async (t) => {
  const { call } = setup(t);
  for (const cf of [singapore, { country: "SG" }, { country: "US" }, { country: "XX" }, { country: "T1" }, {}]) {
    assert.equal((await call("/collect", { cf })).status, 204);
  }
  const data = await (await call("/stats")).json();
  assert.equal(data.total, 6);
  assert.equal(data.countryCount, 2);
  assert.deepEqual(data.countries, [
    { code: "SG", count: 2 },
    { code: "US", count: 1 },
  ]);
  assert.equal(data.unknownCountryVisits, 3);
  assert.equal(
    data.countries.reduce((sum, row) => sum + row.count, data.unknownCountryVisits),
    data.total
  );
  assert.equal(data.places, 1);
});

test("the configured deployment collects without Analytics secrets or archive tables", async (t) => {
  const { call } = setup(t);
  const config = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  assert.match(config, /"main": "src\/counter.js"/);
  assert.equal((await call("/collect")).status, 204);
  assert.equal((await call("/stats")).status, 200);
  assert.equal((await call("/stats/v2")).status, 404);
  assert.equal((await call("/internal/analytics/status")).status, 404);
});

test("write requests require the configured origin and correct method", async (t) => {
  const { call } = setup(t);
  for (const badOrigin of ["https://evil.example", "https://genli.top.evil.example", "null"]) {
    const response = await call("/collect", { headers: { Origin: badOrigin } });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
  }
  assert.equal((await call("/collect", { headers: {} })).status, 403);
  assert.equal((await call("/collect", { method: "GET" })).status, 405);
  assert.equal((await call("/stats", { method: "POST" })).status, 405);
  assert.equal((await call("/missing")).status, 404);
  assert.equal((await (await call("/stats")).json()).total, 0);
});

test("public read and preflight headers are correct", async (t) => {
  const { call } = setup(t);
  const preflight = await call("/collect", { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "POST" } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(preflight.headers.get("Access-Control-Allow-Methods"), "POST");
  const response = await call("/stats");
  assert.equal(response.headers.get("Vary"), "Origin");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal((await call("/stats", { headers: {} })).status, 200);
});

test("rate limiting rejects writes before the database and does not retain raw IP", async (t) => {
  const { call, env } = setup(t);
  let limiterKey;
  env.COLLECT_LIMITER = {
    limit: async ({ key }) => {
      limiterKey = key;
      return { success: false };
    },
  };
  const response = await call("/collect", { headers: { Origin: origin, "CF-Connecting-IP": "192.0.2.1" } });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.match(limiterKey, /^[a-f0-9]{64}$/);
  assert.equal((await (await call("/stats")).json()).total, 0);
});

test("storage failures return a retryable error without exposing internals", async (t) => {
  const { call, env } = setup(t);
  env.DB.prepare = () => {
    throw new Error("private database details");
  };
  for (const path of ["/collect", "/stats"]) {
    const response = await call(path);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Statistics temporarily unavailable" });
  }
});

test("public data contains aggregates only", async (t) => {
  const { call, sql } = setup(t);
  await call("/collect", {
    headers: { Origin: origin, "User-Agent": "private-browser", Referer: "https://example.com/private", "CF-Connecting-IP": "192.0.2.1" },
  });
  const publicData = await (await call("/stats")).text();
  const storedData = JSON.stringify(sql.prepare("SELECT * FROM locations").all());
  for (const value of ["private-browser", "example.com/private", "192.0.2.1"]) {
    assert.ok(!publicData.includes(value));
    assert.ok(!storedData.includes(value));
  }
});

test("both production domains collect, read and preflight; lookalikes are denied", async (t) => {
  const { call } = setup(t);
  for (const site of [origin, "https://www.genli.top"]) {
    for (const path of ["/collect", "/stats"]) {
      const response = await call(path, { headers: { Origin: site } });
      assert.equal(response.status, path === "/collect" ? 204 : 200);
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), site);
    }
    assert.equal((await call("/collect", { method: "OPTIONS", headers: { Origin: site, "Access-Control-Request-Method": "POST" } })).status, 204);
  }
  assert.equal((await call("/collect", { headers: { Origin: "https://www.genli.top.evil.com" } })).status, 403);
});

test("dimensions aggregate atomically and strip private referrer details", async (t) => {
  const { call, sql } = setup(t);
  const options = {
    headers: { Origin: origin, "User-Agent": "Mozilla/5.0 (Linux; Android 14) Mobile" },
    body: JSON.stringify({ referrer: "https://www.google.com/search?q=private", touch: true }),
  };
  await Promise.all(Array.from({ length: 10 }, () => call("/collect", options)));
  const data = await (await call("/stats")).json();
  assert.equal(data.total, 10);
  assert.deepEqual(data.referrers, [{ name: "google.com", count: 10 }]);
  assert.deepEqual(data.operatingSystems, [{ name: "Android", count: 10 }]);
  assert.deepEqual(data.deviceTypes, [{ name: "Mobile", count: 10 }]);
  assert.ok(!JSON.stringify(sql.prepare("SELECT * FROM visit_dimensions").all()).includes("private"));
  sql.exec("CREATE TRIGGER fail_dimension BEFORE UPDATE ON visit_dimensions BEGIN SELECT RAISE(ABORT, 'test failure'); END");
  assert.equal((await call("/collect", options)).status, 503);
  assert.deepEqual(await (await call("/stats")).json(), data);
});

test("malformed and oversized bodies never change counters", async (t) => {
  const { call } = setup(t);
  for (const body of ["{", "null", "[]", JSON.stringify({ referrer: "x".repeat(2100) })]) {
    assert.equal((await call("/collect", { body })).status, 400);
  }
  assert.equal((await (await call("/stats")).json()).total, 0);
});

test("referrers and device families use bounded, coarse categories", () => {
  for (const source of ["", "https://www.genli.top/zh/", "https://genli.top/a", "file:///secret", "https://127.0.0.1", "https://[::1]", "nonsense"]) {
    assert.equal(referrerDomain(source, [origin, "https://www.genli.top"]), "direct");
  }
  assert.equal(referrerDomain("https://github.com/private?token=secret", [origin]), "github.com");
  for (const [ua, touch, os, device] of [
    ["iPhone", false, "iOS", "Mobile"],
    ["iPad", false, "iOS", "Tablet"],
    ["Macintosh", true, "iOS", "Tablet"],
    ["Macintosh", false, "macOS", "Desktop"],
    ["Android", false, "Android", "Tablet"],
    ["Windows NT", false, "Windows", "Desktop"],
    ["X11 CrOS", false, "Chrome OS", "Desktop"],
    ["Linux", false, "Linux", "Desktop"],
    ["Googlebot", false, "Unknown", "Bot"],
    ["", false, "Unknown", "Unknown"],
  ])
    assert.deepEqual(clientCategory(ua, touch), { os, device });
});

test("migration labels existing visits as unrecorded without altering locations", (t) => {
  const sql = new DatabaseSync(":memory:");
  t.after(() => sql.close());
  sql.exec(readFileSync(new URL("../migrations/0001_locations.sql", import.meta.url), "utf8"));
  sql.exec("INSERT INTO locations VALUES ('old', 'SG', '', 'Singapore', 1.4, 103.8, 7)");
  sql.exec(readFileSync(new URL("../migrations/0002_dimensions.sql", import.meta.url), "utf8"));
  assert.equal(sql.prepare("SELECT visits FROM locations").get().visits, 7);
  const dimensions = sql.prepare("SELECT * FROM visit_dimensions").all();
  assert.equal(dimensions.length, 3);
  assert.ok(dimensions.every((row) => row.value === "unknown" && row.visits === 7));
});

test("daily visits cross midnight in Shanghai, not UTC, including month and year boundaries", async (t) => {
  const { call } = setup(t, Date.parse("2026-12-31T15:59:59.999Z"));
  await call("/collect");
  const before = await (await call("/stats")).json();
  assert.equal(before.activity.end, "2026-12-31");
  assert.equal(before.activity.today, 1);
  t.mock.timers.setTime(Date.parse("2026-12-31T16:00:00Z"));
  const midnight = await (await call("/stats")).json();
  assert.equal(midnight.activity.end, "2027-01-01");
  assert.equal(midnight.activity.today, 0);
  await call("/collect");
  const after = await (await call("/stats")).json();
  assert.equal(after.total, 2);
  assert.equal(after.activity.today, 1);
  assert.equal(after.activity.last30Days, 2);
  assert.deepEqual(after.activity.days.slice(-2), [
    { date: "2026-12-31", count: 1 },
    { date: "2027-01-01", count: 1 },
  ]);
});

test("30-day window includes today and 29 previous days, fills zeros and retains older lifetime counts", async (t) => {
  const { call } = setup(t, Date.parse("2026-08-24T00:00:00Z"));
  for (const [date, count] of [
    ["2026-08-24", 3],
    ["2026-08-25", 5],
    ["2026-09-22", 7],
    ["2026-09-23", 11],
  ]) {
    t.mock.timers.setTime(Date.parse(`${date}T00:00:00Z`));
    for (let i = 0; i < count; i++) await call("/collect");
  }
  const data = await (await call("/stats")).json();
  assert.equal(data.total, 26);
  assert.equal(data.activity.today, 11);
  assert.equal(data.activity.last30Days, 23);
  assert.equal(data.activity.undatedVisits, 0);
  assert.equal(data.activity.days.length, 30);
  assert.deepEqual(data.activity.days[0], { date: "2026-08-25", count: 5 });
  assert.deepEqual(data.activity.days[1], { date: "2026-08-26", count: 0 });
  assert.equal(data.activity.days.at(-1).date, "2026-09-23");
  t.mock.timers.setTime(Date.parse("2026-10-01T00:00:00Z"));
  const later = await (await call("/stats")).json();
  assert.equal(later.total, 26);
  assert.equal(later.activity.last30Days, 18);
  assert.equal(later.activity.today, 0);
});

test("daily series includes leap day and all-zero tracked dates", async (t) => {
  const { call } = setup(t, Date.parse("2028-02-01T00:00:00Z"));
  t.mock.timers.setTime(Date.parse("2028-03-01T00:00:00Z"));
  const { activity } = await (await call("/stats")).json();
  assert.equal(activity.start, "2028-02-01");
  assert.deepEqual(activity.days.at(-2), { date: "2028-02-29", count: 0 });
  assert.equal(activity.days.length, 30);
  assert.ok(activity.days.every((row) => row.count === 0));
});

test("a failed daily write rolls back location and dimension increments", async (t) => {
  const { call, sql } = setup(t);
  const before = await (await call("/stats")).json();
  sql.exec("CREATE TRIGGER fail_daily BEFORE INSERT ON visitor_daily BEGIN SELECT RAISE(ABORT, 'test failure'); END");
  assert.equal((await call("/collect")).status, 503);
  assert.deepEqual(await (await call("/stats")).json(), before);
});

test("migration preserves undated historical visits without assigning them to today", async (t) => {
  const { call, sql } = setup(t);
  sql.exec("DROP TABLE visitor_daily; DROP TABLE visitor_counter_meta");
  sql.exec("INSERT INTO locations VALUES ('old', 'SG', '', 'Singapore', 1.4, 103.8, 7)");
  sql.exec(readFileSync(new URL("../migrations/0004_daily_visits.sql", import.meta.url), "utf8"));
  sql.prepare("UPDATE visitor_counter_meta SET daily_started_at = ?").run(new Date(NOW).toISOString());
  const data = await (await call("/stats")).json();
  assert.equal(data.total, 7);
  assert.equal(data.activity.today, 0);
  assert.equal(data.activity.last30Days, 0);
  assert.equal(data.activity.undatedVisits, 7);
  assert.ok(data.activity.days.slice(0, 29).every((row) => row.count === null));
  await call("/collect");
  const next = await (await call("/stats")).json();
  assert.equal(next.total, 8);
  assert.equal(next.activity.today, 1);
  assert.equal(next.activity.undatedVisits, 7);
});
