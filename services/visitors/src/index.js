import legacy from "./counter.js";
import { archivedStats, inspectAnalytics, syncAnalytics } from "./analytics.js";
export { clientCategory, referrerDomain, locationFromRequest } from "./counter.js";

async function authorized(request, env) {
  if (!env.SYNC_SECRET) return false;
  const supplied = request.headers.get("Authorization") || "";
  if (supplied.length > 512) return false;
  const digest = (value) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const [actual, expected] = await Promise.all([digest(supplied), digest(`Bearer ${env.SYNC_SECRET}`)]);
  return new Uint8Array(actual).reduce((difference, byte, index) => difference | (byte ^ new Uint8Array(expected)[index]), 0) === 0;
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/internal/analytics/")) {
      if (!(await authorized(request, env))) return new Response(null, { status: 404 });
      try {
        let data;
        if (path === "/internal/analytics/inspect" && request.method === "GET") data = await inspectAnalytics(env);
        else if (path === "/internal/analytics/sync" && request.method === "POST") data = await syncAnalytics(env);
        else if (path === "/internal/analytics/status" && request.method === "GET")
          data = await env.DB.prepare(
            "SELECT source,history_start,next_day,bootstrap_complete,last_success,last_error FROM cf_sync_state WHERE id=1"
          ).first();
        else return new Response(null, { status: 404 });
        return Response.json(data, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
    }
    if (path !== "/stats/v2") {
      if (path === "/collect" && env.LEGACY_COLLECTION_ENABLED === "false" && request.method === "POST")
        return Response.json(
          { error: "Collection retired; statistics now use Cloudflare Analytics" },
          { status: 410, headers: { "Cache-Control": "no-store" } }
        );
      return legacy.fetch(request, env);
    }
    const origin = request.headers.get("Origin");
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim());
    const headers = new Headers({ "Cache-Control": "no-store", Vary: "Origin", "X-Content-Type-Options": "nosniff" });
    const respond = (data, status = 200) => (data === null ? new Response(null, { status, headers }) : Response.json(data, { status, headers }));
    if (origin && !allowed.includes(origin)) return respond({ error: "Origin not allowed" }, 403);
    if (origin) headers.set("Access-Control-Allow-Origin", origin);
    if (request.method === "OPTIONS") {
      if (!origin || request.headers.get("Access-Control-Request-Method") !== "GET") return respond({ error: "Invalid preflight" }, 403);
      headers.set("Access-Control-Allow-Methods", "GET");
      return respond(null, 204);
    }
    if (request.method !== "GET") return respond({ error: "Method not allowed" }, 405);
    try {
      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`${new Date().toISOString().slice(0, 10)}:${request.headers.get("CF-Connecting-IP") || "unknown"}`)
      );
      const key = [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      if (!(await env.READ_LIMITER.limit({ key }).then((result) => result.success))) {
        headers.set("Retry-After", "60");
        return respond({ error: "Too many requests" }, 429);
      }
      const data = await archivedStats(env);
      return data ? respond(data) : respond({ error: "Cloudflare statistics are not ready yet" }, 503);
    } catch {
      return respond({ error: "Statistics temporarily unavailable" }, 503);
    }
  },
  async scheduled(controller, env, context) {
    // Staged deployments can be inspected before enabling the hourly job.
    if (env.CF_SYNC_ENABLED !== "true") return;
    context.waitUntil(
      syncAnalytics(env).catch(() => {
        console.error("Cloudflare analytics synchronization failed");
      })
    );
  },
};
