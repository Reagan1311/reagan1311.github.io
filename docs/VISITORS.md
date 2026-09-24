# Self-hosted visitor counter

This site uses a Cloudflare Worker + D1 counter at `https://stats.genli.top`.
Jekyll and GitHub Pages continue to serve the website. The deployed Worker entry
point is `services/visitors/src/counter.js`; it receives visits directly from the
browser and returns cumulative and daily aggregates. No Cloudflare Analytics token, cron
sync, or KV namespace is required.

D1 owns the counters: SQL increments run together in a transaction. Workers KV is
[eventually consistent](https://developers.cloudflare.com/kv/concepts/how-kv-works/)
and does not support atomic read/modify/write counters. It could be added later
for cached public summaries, with an explicit freshness tradeoff.

## Counting and privacy

All pages using the shared footer attempt collection, even with the globe closed.
The About homepage displays a compact visit/location summary and the globe.
Only `/visitors.html` (Chinese: `/zh/visitors.html`) displays today, last 30 days
and lifetime visits, the daily bar chart, country rankings, referring domains,
operating systems and device types. The globe colors countries and loads its
local assets only when needed.

Both summaries use the API's `places` count: distinct geolocated
country/region/city combinations, rather than the number of countries. Multiple
cities within one country count as separate locations; repeated visits to the
same location do not increase that location count. Visits without a geolocated
city remain in total visits but do not add a location.

The selected metric is **visits per tab session**. After a successful POST, the
browser stores `visitor-recorded:https://stats.genli.top` in `sessionStorage`.
Refreshing or switching between `/` and `/zh/` in that tab does not count again.
A new independent tab session can count separately. Browser tab duplication,
restoration, or opening with an opener can copy session storage; this is not a
count of unique people or page views. Apex and www have separate browser storage;
the site's canonical-domain redirect should run before collection.

The labels use **visits**, rather than pageviews, because this session rule is
unchanged. Dates use **Asia/Shanghai (UTC+8)**. Today starts at local midnight;
the rolling window includes today and the preceding 29 calendar days. A visit
belongs to the date of its successful collection. Leaving a tab open past midnight
does not create another visit automatically.

The chart has one bar per day, with a date/count readout on hover, tap or keyboard
focus. Arrow keys, Home and End move through the days. Light and dark themes and
both site languages are supported. Tracked days with no visits show a baseline;
days before daily tracking began are marked as unrecorded, not invented zeros.
Earlier undated visits remain in the lifetime total only. The first tracked day
can be partial, starting when the migration is applied.

Collection begins independently of the map and is shared with any pending stats
read. A read waits for that attempt before fetching the current totals. Failed
collection leaves the flag unset, allowing another attempt on navigation or panel
refresh. If session storage is blocked, collection is skipped and totals remain
readable. If a write commits but its response is lost, a later retry can count
again: deduplication is browser-side, not a server-side exactly-once guarantee.

The client sends only a referring origin and a touch-capability boolean. The
Worker normalizes the referrer to a domain, treats internal links as direct, and
uses the request User-Agent for coarse OS/device categories. No raw IP, raw
User-Agent, full referrer URL, cookie, browser identifier or per-visit log is
stored in D1. An IP-derived daily digest is used only in Cloudflare's short-lived
rate limiter. Cloudflare itself processes requests under the account settings.

The existing `locations` table retains cumulative country/region/city rows and
approximate edge coordinates rounded to one decimal place. Country counts include
rows without city coordinates. Unknown countries remain in the overall total and
are shown separately. `visit_dimensions` stores cumulative referrer/OS/device
counts. `visitor_daily` stores one aggregate row per active UTC+8 calendar day;
`visitor_counter_meta` records when daily tracking started. All five increments use one
[D1 batch transaction](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch);
a failed dimension or daily write rolls back the entire visit.

These are approximate usage statistics: blocked scripts, failed requests, browser
storage behavior and automated traffic affect the count. CORS restricts browser
origins but is not authentication. Collection is limited to 30 requests/minute per
IP-derived key at each Cloudflare location; reads to 120. The counter is not for
billing or security decisions. Request logging is disabled in this configuration.

## Current deployment and publishing

The existing Worker and D1 database are named `genli-visitor-stats`; their IDs and
the `stats.genli.top` custom domain are already in `wrangler.jsonc`. A read-only
check on 2026-09-21 returned zero visits from the existing `/stats` API.

On 2026-09-21, Wrangler was authenticated using its official device login flow and
Worker version `ccedd0dd-f75f-4c4b-967a-fb86e361ba66` was deployed to
`stats.genli.top`. Public GET `/stats` returned the new self-hosted response, and
GET plus collection preflight passed for both production origins. These checks
did not add visits; the total remained zero. Required D1 migrations 0001 and 0002
were already applied, so no database migration was run that day.

On 2026-09-23, migrations 0003 and 0004 were applied and Worker version
`9a258ef9-6fa7-4b85-aed4-5ff6a4041763` was deployed. Migration 0003 only creates
separate, unused archive tables; migration 0004 enables the daily counter.
Read-only checks confirmed 30 daily entries, the UTC+8 date range and both
production CORS origins. Today, last 30 days and lifetime totals remained zero;
no production test visits were created.
Wrangler remains logged in locally for the requested deployment; credentials are
outside this repository. The Jekyll frontend still needs publishing through the
site workflow.

This revision adds UTC+8 daily aggregates and the today, last 30 days and lifetime
visits display with a 30-day bar chart. It preserves the existing session counting,
country globe, referrer and device statistics. The previous Analytics experiment (`src/index.js`,
`src/analytics.js`, migration 0003 and its tests) remains in the repository but is
not included in the configured Worker. Its archive data is not added to the
counter, and the configured cron list is empty.

Deploy the updated Worker **before** publishing the frontend: the frontend expects
the new `countries` array. The previous `/stats` fields remain available for older
clients. Apply migration 0004 before deploying this version of the Worker. It adds
the daily counters and tracking start time without changing existing totals. The
frontend tolerates an older API by showing lifetime totals and leaving daily
statistics unavailable. Local changes and a successful dry run do not publish
either service.

Use Node.js 22.13+ and a Cloudflare account authorized for the configured Worker,
D1 database and custom domain. Never put credentials in the repo or `_config.yml`.
For future deployments, check the login with `wrangler whoami` and authenticate
locally when needed:

```sh
cd services/visitors
npm ci
npm test
npx wrangler login --scopes account:read user:read workers:write workers_routes:write workers_scripts:write d1:write zone:read
npx wrangler whoami
npx wrangler d1 migrations apply genli-visitor-stats --remote
npx wrangler deploy --dry-run --outdir /tmp/visitor-counter-worker
npx wrangler deploy
```

If the browser cannot reach the localhost callback, use `npx wrangler login
--device --scopes account:read user:read workers:write workers_routes:write
workers_scripts:write d1:write zone:read` and complete the official device-code
flow instead.

For a fresh installation, first create a D1 database with `npx wrangler d1 create
YOUR_DATABASE`, and update the account/database IDs, database name, route and
allowed origins. Choose unused integer rate-limit namespace IDs in that account.
The current schema requires migrations 0001, 0002 and 0004; the migration runner also
preserves migration 0003's separate, unused Analytics archive tables.

Verify using reads and preflights, which do not create visits:

```sh
curl -fsS https://stats.genli.top/stats
curl -i https://stats.genli.top/stats -H 'Origin: https://genli.top'
curl -i https://stats.genli.top/stats -H 'Origin: https://www.genli.top'
curl -i -X OPTIONS https://stats.genli.top/collect \
  -H 'Origin: https://genli.top' \
  -H 'Access-Control-Request-Method: POST'
curl -i -X OPTIONS https://stats.genli.top/collect \
  -H 'Origin: https://www.genli.top' \
  -H 'Access-Control-Request-Method: POST'
```

GET should return `source: "self-hosted"`, `metric: "visits"`, `countries` and
`activity` with 30 daily entries.
Each CORS response should echo the allowed origin; preflights should return 204.
To end the local login session later, run `npx wrangler logout`.

Publish the site through its existing workflow with this configuration (already
present in `_config.yml`):

```yaml
visitors:
  enabled: true
  api_url: https://stats.genli.top
  allowed_origins:
    - https://genli.top
    - https://www.genli.top
  preview: false
```

Real API access requires a production Jekyll build **and** a matching browser
origin. Local copies of production builds show explicitly labeled mock data and
never contact the API. To disable the integration, set `visitors.enabled: false`
and publish the site; stored totals remain intact.

## API

| Endpoint           | Behavior                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /collect`    | Allowed `Origin` required. Optional JSON `{ referrer, touch }` in a `text/plain` body, at most 2 KiB. Empty bodies are supported. Returns 204 after all counters commit. |
| `GET /stats`       | Public cumulative and daily aggregates; does not increment any counter.                                                                                                  |
| `OPTIONS /collect` | CORS preflight for POST; no database writes.                                                                                                                             |
| `OPTIONS /stats`   | CORS preflight for GET; no database writes.                                                                                                                              |

Example empty response (the `activity` field is described below):

```json
{
  "source": "self-hosted",
  "metric": "visits",
  "total": 0,
  "countryCount": 0,
  "countries": [],
  "unknownCountryVisits": 0,
  "places": 0,
  "points": [],
  "referrers": [],
  "operatingSystems": [],
  "deviceTypes": []
}
```

`countries` contains `{ code, count }` rows sorted by count. Country counts plus
`unknownCountryVisits` sum to `total`. The original `points` array contains
`{ country, city, lat, lon, count }`; `places` is its length. The three other
dimensions contain `{ name, count }` rows. `direct` is a direct/internal/hidden
referrer; `unknown` marks visits predating dimension collection; OS/device
`Unknown` means a new visit could not be classified.

The additional `activity` object contains:

| Field           | Meaning                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `timeZone`      | `Asia/Shanghai` (fixed UTC+8 calendar boundaries).                                                                                  |
| `since`         | Local date when daily tracking began.                                                                                               |
| `start`, `end`  | First and last dates in the inclusive 30-day window.                                                                                |
| `today`         | Visits counted today.                                                                                                               |
| `last30Days`    | Sum of the available daily counts in the window.                                                                                    |
| `undatedVisits` | Historical visits without daily records, included in `total` only.                                                                  |
| `days`          | Exactly 30 chronological `{ date, count }` entries. Count is `null` before `since`, otherwise a nonnegative integer including zero. |

The frontend indicates incomplete history with the daily tracking start date and,
when present, the number of earlier undated visits. The API reads the cumulative
and daily tables in a single D1 batch to keep each response consistent.

No collection start date is invented for historical rows. Rejected origins return
403, invalid methods 405, malformed/oversized metadata 400, rate limits 429 with
`Retry-After: 60`, and storage failures 503. API failures display an error instead
of false zero totals. Globe failures leave the numeric summary and tables usable.

## Local verification

Development Jekyll builds with the enabled feature show **42 visits from 3
locations**, labeled as preview data. Use a config override if the feature is
disabled; do not change production settings for a preview.

```sh
bundle exec jekyll serve --host 127.0.0.1 --port 4000 --baseurl /al-folio
# In another terminal, at the repository root:
npm ci
npx playwright install chromium webkit
NO_WEBSERVER=1 VISITORS_TEST=1 npm run test:visual -- test/visual/visitors.spec.js
# Backend tests and local Worker:
cd services/visitors
npm ci
npm test
npx wrangler d1 migrations apply genli-visitor-stats --local
npx wrangler dev --ip 127.0.0.1
```

Worker tests exercise real SQL and transactional rollback with in-memory SQLite.
Browser tests intercept all production counter requests. They cover tab-session
deduplication, retries, blocked storage, referrer stripping, both origins, ordinary
pages, preview isolation, country rankings, language changes, themes, touch/drag
navigation, lazy loading and WebGL fallback. Daily tests cover UTC+8 midnight,
inclusive 30-day boundaries, leap days, zero/unrecorded history, migration of
existing totals, transaction rollback, keyboard/touch interaction and responsive
charts in both themes and languages. Local Worker writes use local D1 only.
The CI workflow `.github/workflows/visitors.yml` runs backend tests and a dry run.

This feature is an intentional site customization. The shared footer includes the
site-specific template; shared plugin runtime remains owned by its gem. When
changing plugin-owned local overrides, run `bundle exec al-folio upgrade overrides
audit`, review the changes, and acknowledge changed files in
`.al-folio-overrides.yml`.
