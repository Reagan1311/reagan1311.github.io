import { dailyActivity, dayInShanghai, last30Dates } from "./daily.js";

function label(value) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

function coordinate(value, bound) {
  if (value == null || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= bound ? Math.round(number * 10) / 10 : null;
}

export function locationFromRequest(cf = {}) {
  const country = label(cf.country);
  const region = label(cf.regionCode || cf.region);
  const city = label(cf.city);
  let lat = coordinate(cf.latitude, 90);
  let lon = coordinate(cf.longitude, 180);
  if (!city || !country || lat === null || lon === null) lat = lon = null;
  return { key: JSON.stringify([country, region, city]), country, region, city, lat, lon };
}

export function clientCategory(userAgent = "", touch = false) {
  const ua = userAgent.slice(0, 1024);
  if (/bot|crawler|spider|headless|slurp/i.test(ua)) return { os: "Unknown", device: "Bot" };
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && touch)) return { os: "iOS", device: "Tablet" };
  if (/iPhone|iPod/i.test(ua)) return { os: "iOS", device: "Mobile" };
  if (/Android/i.test(ua)) return { os: "Android", device: /Mobile/i.test(ua) ? "Mobile" : "Tablet" };
  if (/Windows Phone/i.test(ua)) return { os: "Windows", device: "Mobile" };
  const os = /Windows/i.test(ua)
    ? "Windows"
    : /CrOS/i.test(ua)
      ? "Chrome OS"
      : /Macintosh|Mac OS X/i.test(ua)
        ? "macOS"
        : /Linux|X11/i.test(ua)
          ? "Linux"
          : "Unknown";
  return { os, device: /Tablet/i.test(ua) ? "Tablet" : /Mobile/i.test(ua) ? "Mobile" : os === "Unknown" ? "Unknown" : "Desktop" };
}

export function referrerDomain(value, allowed) {
  try {
    if (typeof value !== "string" || value.length > 2048) return "direct";
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const internal = allowed.some((origin) => new URL(origin).hostname.replace(/^www\./, "") === host);
    if (!/^https?:$/.test(url.protocol) || internal || !host.includes(".") || host.length > 253 || /[:\[\]]/.test(host) || /^[\d.]+$/.test(host))
      return "direct";
    return host;
  } catch {
    return "direct";
  }
}

async function metadata(request) {
  if (!request.body) return {};
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2048) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  if (!size) return {};
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    const origin = request.headers.get("Origin");
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim());
    const headers = new Headers({ "Cache-Control": "no-store", Vary: "Origin", "X-Content-Type-Options": "nosniff" });
    const respond = (body, status = 200) => {
      if (body === null) return new Response(null, { status, headers });
      headers.set("Content-Type", "application/json; charset=utf-8");
      return new Response(JSON.stringify(body), { status, headers });
    };

    // CORS is a browser-origin restriction, not authentication or bot detection.
    if (origin && !allowed.includes(origin)) return respond({ error: "Origin not allowed" }, 403);
    if (origin) headers.set("Access-Control-Allow-Origin", origin);
    if (path !== "/collect" && path !== "/stats") return respond({ error: "Not found" }, 404);

    const method = path === "/collect" ? "POST" : "GET";
    if (request.method === "OPTIONS") {
      if (!origin || request.headers.get("Access-Control-Request-Method") !== method) return respond({ error: "Invalid preflight" }, 403);
      headers.set("Access-Control-Allow-Methods", method);
      headers.set("Access-Control-Max-Age", "86400");
      headers.set("Access-Control-Allow-Headers", "Content-Type");
      return respond(null, 204);
    }
    if (request.method !== method) {
      headers.set("Allow", method);
      return respond({ error: "Method not allowed" }, 405);
    }
    if (path === "/collect" && !origin) return respond({ error: "Origin required" }, 403);

    try {
      const now = Date.now();
      // The daily digest is used only in Cloudflare's short-lived rate limiter.
      // No IP, digest, raw user agent, full referrer URL or per-visit record is written to D1.
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const bytes = new TextEncoder().encode(`${new Date().toISOString().slice(0, 10)}:${ip}`);
      const hash = await crypto.subtle.digest("SHA-256", bytes);
      const key = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const limiter = path === "/collect" ? env.COLLECT_LIMITER : env.READ_LIMITER;
      if (!(await limiter.limit({ key })).success) {
        headers.set("Retry-After", "60");
        return respond({ error: "Too many requests" }, 429);
      }

      if (path === "/collect") {
        const data = await metadata(request);
        if (!data) return respond({ error: "Invalid or oversized metadata" }, 400);
        const place = locationFromRequest(request.cf || {});
        const client = clientCategory(request.headers.get("User-Agent") || "", data.touch === true);
        const dimensions = [
          ["referrer", referrerDomain(data.referrer, allowed)],
          ["os", client.os],
          ["device", client.device],
        ];
        const locationStatement = env.DB.prepare(
          `INSERT INTO locations (location_key, country, region, city, lat, lon, visits)
           VALUES (?, ?, ?, ?, ?, ?, 1)
           ON CONFLICT(location_key) DO UPDATE SET
             visits = locations.visits + 1,
             lat = COALESCE(locations.lat, excluded.lat),
             lon = COALESCE(locations.lon, excluded.lon)`
        ).bind(place.key, place.country, place.region, place.city, place.lat, place.lon);
        // Location, dimensions and the daily counter commit in one transaction.
        await env.DB.batch([
          locationStatement,
          ...dimensions.map(([dimension, value]) =>
            env.DB.prepare(
              `INSERT INTO visit_dimensions (dimension, value, visits) VALUES (?, ?, 1)
            ON CONFLICT(dimension, value) DO UPDATE SET visits = visit_dimensions.visits + 1`
            ).bind(dimension, value)
          ),
          env.DB.prepare(
            `INSERT INTO visitor_daily (day, visits) VALUES (?, 1)
             ON CONFLICT(day) DO UPDATE SET visits = visitor_daily.visits + 1`
          ).bind(dayInShanghai(now)),
        ]);
        return respond(null, 204);
      }

      const dates = last30Dates(now);
      const [{ results }, { results: dimensions }, { results: daily }, { results: periodMetadata }] = await env.DB.batch([
        env.DB.prepare("SELECT country, city, lat, lon, visits FROM locations ORDER BY location_key"),
        env.DB.prepare("SELECT dimension, value, visits FROM visit_dimensions ORDER BY visits DESC, value"),
        env.DB.prepare("SELECT day, visits FROM visitor_daily WHERE day >= ? AND day <= ? ORDER BY day").bind(dates[0], dates[29]),
        env.DB.prepare(
          `SELECT daily_started_at, (SELECT COALESCE(SUM(visits), 0) FROM visitor_daily) AS dated_total
           FROM visitor_counter_meta WHERE id = 1`
        ),
      ]);
      const total = results.reduce((sum, row) => sum + row.visits, 0);
      // A known country still counts when the edge cannot locate a city.
      const countryCounts = new Map();
      let unknownCountryVisits = 0;
      for (const row of results) {
        const code = row.country.toUpperCase();
        if (/^[A-Z]{2}$/.test(code) && !["XX", "ZZ", "EU", "AP", "T1"].includes(code)) {
          countryCounts.set(code, (countryCounts.get(code) || 0) + row.visits);
        } else {
          unknownCountryVisits += row.visits;
        }
      }
      const countries = [...countryCounts]
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
      const points = results
        .filter((row) => row.lat !== null && row.lon !== null)
        .map(({ country, city, lat, lon, visits }) => ({ country, city, lat, lon, count: visits }));
      const rows = (dimension) =>
        dimensions.filter((row) => row.dimension === dimension).map(({ value, visits }) => ({ name: value, count: visits }));
      return respond({
        source: "self-hosted",
        metric: "visits",
        total,
        activity: dailyActivity(daily, periodMetadata[0], total, now),
        countryCount: countries.length,
        countries,
        unknownCountryVisits,
        places: points.length,
        points,
        referrers: rows("referrer"),
        operatingSystems: rows("os"),
        deviceTypes: rows("device"),
      });
    } catch {
      return respond({ error: "Statistics temporarily unavailable" }, 503);
    }
  },
};
