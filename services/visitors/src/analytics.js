const endpoint = "https://api.cloudflare.com/client/v4/graphql";
const dataset = "rumPageloadEventsAdaptiveGroups";
const fields = { country: "countryName", referrer: "refererHost", os: "userAgentOS", device: "deviceType" };
export const DAY = 86400000;
export const dayOf = (time) => new Date(time).toISOString().slice(0, 10);
export const nextDay = (day) => dayOf(Date.parse(day) + DAY);

function configuration(env) {
  const account = env.CF_ACCOUNT_ID;
  const hosts = (env.CF_HOSTS || "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean)
    .sort();
  if (!/^[a-f0-9]{32}$/.test(account || "") || !hosts.length || !env.CF_ANALYTICS_TOKEN) throw new Error("Analytics is not configured");
  return { account, hosts };
}

export async function graphql(env, query, variables = {}, fetcher = fetch) {
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Cloudflare analytics HTTP ${response.status}`);
  const payload = await response.json();
  // Never persist raw API errors: an upstream error may include query or account details.
  if (payload.errors?.length || !payload.data?.viewer?.accounts?.[0]) throw new Error("Cloudflare analytics query failed");
  return payload.data.viewer.accounts[0];
}

export async function inspectAnalytics(env, now = Date.now(), fetcher = fetch) {
  const config = configuration(env);
  const data = await graphql(
    env,
    `query($account: string!) { viewer { accounts(filter: {accountTag: $account}) {
    settings { ${dataset} { enabled availableFields maxPageSize maxDuration notOlderThan } }
  } } }`,
    { account: config.account },
    fetcher
  );
  const settings = data.settings?.[dataset];
  if (!settings?.enabled || !(settings.notOlderThan > 0) || !(settings.maxDuration > 0) || !(settings.maxPageSize >= 2))
    throw new Error("Web Analytics is unavailable for this account");
  const required = ["sum_visits", ...Object.values(fields).map((field) => `dimensions_${field}`)];
  if (!required.every((field) => settings.availableFields?.includes(field))) throw new Error("Required Web Analytics dimensions are unavailable");
  const duration = Math.min(settings.notOlderThan, settings.maxDuration, (7 * DAY) / 1000);
  const filter = {
    datetime_geq: new Date(now - duration * 1000 + 60000).toISOString(),
    datetime_lt: new Date(now).toISOString(),
    OR: config.hosts.map((host) => ({ requestHost: host })),
  };
  const sites = await graphql(
    env,
    `query($account: string!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!) {
    viewer { accounts(filter: {accountTag: $account}) {
      sites: ${dataset}(limit: 100, filter: $filter) { dimensions { siteTag requestHost } sum { visits } }
    } } }`,
    { account: config.account, filter },
    fetcher
  );
  if (!Array.isArray(sites.sites) || sites.sites.length >= 100) throw new Error("Cannot identify the Web Analytics site");
  const foundTags = [...new Set(sites.sites.map((row) => row.dimensions?.siteTag).filter((tag) => /^[a-f0-9]{32}$/.test(tag || "")))].sort();
  const configuredTags = (env.CF_SITE_TAGS || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .sort();
  const siteTags = configuredTags.length ? configuredTags : foundTags;
  if (!siteTags.length || siteTags.some((tag) => !/^[a-f0-9]{32}$/.test(tag)))
    throw new Error("No Web Analytics site found for the configured hosts");
  if (!configuredTags.length && siteTags.length !== 1) throw new Error("Multiple Web Analytics sites found; configure CF_SITE_TAGS explicitly");
  return { ...config, siteTags, settings, dataset, metric: "visits", observed: sites.sites };
}

export function normalizeDimension(dimension, value, hosts) {
  const text = typeof value === "string" ? value.trim() : "";
  if (dimension === "country") {
    const code = text.toUpperCase();
    return /^[A-Z]{2}$/.test(code) && !["XX", "ZZ", "EU", "AP"].includes(code) ? code : "unknown";
  }
  if (dimension === "referrer") {
    if (!text) return "direct";
    try {
      const host = new URL(`https://${text}`).hostname.toLowerCase().replace(/^www\./, "");
      if (hosts.some((own) => own.replace(/^www\./, "") === host)) return "direct";
      return host.includes(".") && host.length <= 253 && !/[:\[\]]/.test(host) && !/^[\d.]+$/.test(host) ? host : "direct";
    } catch {
      return "direct";
    }
  }
  if (dimension === "device") return { desktop: "Desktop", mobile: "Mobile", tablet: "Tablet", bot: "Bot" }[text.toLowerCase()] || "Unknown";
  if (dimension === "os") {
    if (/^(unknown|other|)$/.test(text.toLowerCase())) return "Unknown";
    if (/mac/i.test(text)) return "macOS";
    if (/ios|iphone|ipad/i.test(text)) return "iOS";
    if (/windows/i.test(text)) return "Windows";
    if (/android/i.test(text)) return "Android";
    if (/chrome os|cros/i.test(text)) return "Chrome OS";
    if (/linux|ubuntu/i.test(text)) return "Linux";
    return text.slice(0, 80);
  }
  throw new Error("Unsupported dimension");
}

function visits(row) {
  const count = row?.sum?.visits;
  if (!Number.isFinite(count) || count < 0) throw new Error("Invalid Visits metric");
  return count;
}

function combine(parts) {
  const combined = { total: 0, dimensions: [] };
  const counts = new Map();
  for (const part of parts) {
    combined.total += part.total;
    for (const row of part.dimensions) {
      const key = JSON.stringify([row.dimension, row.value]);
      counts.set(key, (counts.get(key) || 0) + row.visits);
    }
  }
  combined.dimensions = [...counts].map(([key, visits]) => {
    const [dimension, value] = JSON.parse(key);
    return { dimension, value, visits };
  });
  return combined;
}

export async function readRange(env, inspected, start, end, fetcher = fetch, depth = 0) {
  if (!(end > start)) throw new Error("Invalid date range");
  if (depth > 20) throw new Error("Analytics result is too large to import completely");
  const limit = Math.min(inspected.settings.maxPageSize, 1000);
  if (end - start > inspected.settings.maxDuration * 1000) {
    const middle = Math.min(start + inspected.settings.maxDuration * 1000, end);
    return combine([
      await readRange(env, inspected, start, middle, fetcher, depth + 1),
      await readRange(env, inspected, middle, end, fetcher, depth + 1),
    ]);
  }
  const filter = {
    datetime_geq: new Date(start).toISOString(),
    datetime_lt: new Date(end).toISOString(),
    AND: [{ OR: inspected.hosts.map((host) => ({ requestHost: host })) }, { OR: inspected.siteTags.map((tag) => ({ siteTag: tag })) }],
  };
  const groups = Object.entries(fields)
    .map(([alias, field]) => `${alias}: ${dataset}(limit: $limit, filter: $filter) { dimensions { ${field} } sum { visits } }`)
    .join("\n");
  const data = await graphql(
    env,
    `query($account: string!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!, $limit: uint64!) {
    viewer { accounts(filter: {accountTag: $account}) {
      total: ${dataset}(limit: 1, filter: $filter) { sum { visits } }
      ${groups}
    } }
  }`,
    { account: inspected.account, filter, limit },
    fetcher
  );
  if (!Array.isArray(data.total) || data.total.length > 1 || !Object.keys(fields).every((key) => Array.isArray(data[key])))
    throw new Error("Incomplete analytics response");
  // A result exactly at the limit might be truncated. Split time, never archive a top-N subset.
  if (Object.keys(fields).some((key) => data[key].length >= limit)) {
    if (end - start <= 1000) throw new Error("Analytics result is truncated");
    const middle = Math.floor((start + end) / 2);
    return combine([
      await readRange(env, inspected, start, middle, fetcher, depth + 1),
      await readRange(env, inspected, middle, end, fetcher, depth + 1),
    ]);
  }
  const total = data.total.length ? visits(data.total[0]) : 0;
  const dimensions = [];
  for (const [dimension, field] of Object.entries(fields)) {
    if (total > 0 && !data[dimension].length) throw new Error("Incomplete analytics dimension");
    for (const row of data[dimension]) {
      if (!row.dimensions || !(field in row.dimensions)) throw new Error("Missing analytics dimension");
      const count = visits(row);
      if (count > 0) dimensions.push({ dimension, value: normalizeDimension(dimension, row.dimensions[field], inspected.hosts), visits: count });
    }
  }
  // Cloudflare returns sampling-adjusted aggregates. Do not multiply them by sampleInterval again.
  return combine([{ total, dimensions }]);
}

export async function archiveDay(env, day, start, end, snapshot, updatedAt, cursor = null) {
  const statements = [
    env.DB.prepare(
      `INSERT INTO cf_days(day,range_start,range_end,visits,synced_at) VALUES(?,?,?,?,?)
      ON CONFLICT(day) DO UPDATE SET range_start=excluded.range_start,range_end=excluded.range_end,visits=excluded.visits,synced_at=excluded.synced_at`
    ).bind(day, new Date(start).toISOString(), new Date(end).toISOString(), snapshot.total, updatedAt),
    env.DB.prepare("DELETE FROM cf_dimensions WHERE day=?").bind(day),
  ];
  for (let index = 0; index < snapshot.dimensions.length; index += 500) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO cf_dimensions(day,dimension,value,visits)
      SELECT ?, json_extract(value,'$.dimension'), json_extract(value,'$.value'), json_extract(value,'$.visits') FROM json_each(?)`
      ).bind(day, JSON.stringify(snapshot.dimensions.slice(index, index + 500)))
    );
  }
  if (cursor) statements.push(env.DB.prepare("UPDATE cf_sync_state SET next_day=? WHERE id=1").bind(cursor));
  await env.DB.batch(statements);
}

export async function syncAnalytics(env, { now = Date.now(), fetcher = fetch, maxDays = 12 } = {}) {
  const owner = crypto.randomUUID();
  const locked = await env.DB.prepare(
    "UPDATE cf_sync_state SET lock_owner=?,lock_until=? WHERE id=1 AND (lock_until IS NULL OR lock_until < ?) RETURNING id"
  )
    .bind(owner, new Date(now + 15 * 60 * 1000).toISOString(), new Date(now).toISOString())
    .all();
  if (!locked.results.length) return { status: "busy" };
  try {
    const inspected = await inspectAnalytics(env, now, fetcher);
    const source = JSON.stringify({ account: inspected.account, hosts: inspected.hosts, siteTags: inspected.siteTags, dataset, metric: "visits" });
    let state = await env.DB.prepare("SELECT * FROM cf_sync_state WHERE id=1").first();
    if (state.source && state.source !== source) throw new Error("Analytics source changed; archive must be reviewed before continuing");
    if (!state.source) {
      const historyStart = new Date(now - inspected.settings.notOlderThan * 1000 + 60000).toISOString();
      await env.DB.prepare("UPDATE cf_sync_state SET source=?,history_start=?,next_day=? WHERE id=1")
        .bind(source, historyStart, historyStart.slice(0, 10))
        .run();
      state = await env.DB.prepare("SELECT * FROM cf_sync_state WHERE id=1").first();
    }
    const today = dayOf(now);
    const days = [];
    if (!state.bootstrap_complete) {
      for (let day = state.next_day; day <= today && days.length < maxDays; day = nextDay(day)) days.push(day);
    } else {
      for (let offset = 7; offset >= 0; offset--) {
        const day = dayOf(now - offset * DAY);
        if (day >= state.history_start.slice(0, 10)) days.push(day);
      }
    }
    let processed = 0;
    const deadline = Date.now() + 90000;
    for (const day of days) {
      if (Date.now() >= deadline) break;
      const start = Math.max(Date.parse(day), Date.parse(state.history_start));
      const end = Math.min(Date.parse(nextDay(day)), now);
      if (end <= start) continue;
      const snapshot = await readRange(env, inspected, start, end, fetcher);
      await archiveDay(env, day, start, end, snapshot, new Date(now).toISOString(), state.bootstrap_complete ? null : nextDay(day));
      processed++;
    }
    state = await env.DB.prepare("SELECT * FROM cf_sync_state WHERE id=1").first();
    const complete = state.bootstrap_complete || state.next_day > today;
    if (complete && processed === days.length)
      await env.DB.prepare("UPDATE cf_sync_state SET bootstrap_complete=1,last_success=?,last_error=NULL WHERE id=1")
        .bind(new Date(now).toISOString())
        .run();
    return { status: complete ? "ready" : "importing", processed, nextDay: state.next_day, since: state.history_start };
  } catch (error) {
    await env.DB.prepare("UPDATE cf_sync_state SET last_error=? WHERE id=1").bind("Analytics synchronization failed").run();
    throw error;
  } finally {
    await env.DB.prepare("UPDATE cf_sync_state SET lock_owner=NULL,lock_until=NULL WHERE id=1 AND lock_owner=?").bind(owner).run();
  }
}

export async function archivedStats(env, now = Date.now()) {
  const [stateResult, totalResult, rowsResult] = await env.DB.batch([
    env.DB.prepare("SELECT history_start,bootstrap_complete,last_success,last_error FROM cf_sync_state WHERE id=1"),
    env.DB.prepare("SELECT COALESCE(SUM(visits),0) AS total FROM cf_days"),
    env.DB.prepare("SELECT dimension,value,SUM(visits) AS visits FROM cf_dimensions GROUP BY dimension,value ORDER BY visits DESC,value"),
  ]);
  const state = stateResult.results[0];
  if (!state?.bootstrap_complete || !state.last_success) return null;
  const rows = (dimension) =>
    rowsResult.results
      .filter((row) => row.dimension === dimension)
      .map((row) => ({ name: row.value, count: Math.round(row.visits) }))
      .filter((row) => row.count > 0);
  const countryRows = rows("country");
  const countries = countryRows.filter((row) => row.name !== "unknown").map((row) => ({ code: row.name, count: row.count }));
  return {
    total: Math.round(totalResult.results[0].total),
    countryCount: countries.length,
    countries,
    unknownCountryVisits: countryRows.find((row) => row.name === "unknown")?.count || 0,
    referrers: rows("referrer"),
    operatingSystems: rows("os"),
    deviceTypes: rows("device"),
    since: state.history_start.slice(0, 10),
    updatedAt: state.last_success,
    stale: Boolean(state.last_error) || now - Date.parse(state.last_success) > 3 * 3600000,
    source: "cloudflare-web-analytics",
    metric: "visits",
  };
}
