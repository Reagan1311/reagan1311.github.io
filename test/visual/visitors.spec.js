const { test, expect } = require("@playwright/test");

test.skip(process.env.VISITORS_TEST !== "1", "Build with visitors.preview enabled; see docs/VISITORS.md.");

const stats = {
  total: 8,
  places: 1,
  countryCount: 1,
  countries: [{ code: "SG", count: 8 }],
  unknownCountryVisits: 0,
  source: "self-hosted",
  metric: "visits",
};
const home = "/al-folio/";
function activityFixture(counts, since = "2026-08-25", undatedVisits = 0) {
  const days = counts.map((count, index) => ({ date: new Date(Date.UTC(2026, 7, 25 + index)).toISOString().slice(0, 10), count }));
  return {
    timeZone: "Asia/Shanghai",
    since,
    start: "2026-08-25",
    end: "2026-09-23",
    today: counts[29],
    last30Days: counts.reduce((sum, count) => sum + (count || 0), 0),
    undatedVisits,
    days,
  };
}

test.beforeEach(async ({ page }) => {
  // Never let the test runner write analytics, even if the site configuration changes.
  await page.route("https://stats.genli.top/**", (route) => route.abort());
  await page.route(/google-analytics\.com|googletagmanager\.com/, (route) => route.abort());
});

async function liveFixture(page, baseURL, { failCollect = false, failStats = false, data = stats } = {}) {
  let collects = 0;
  const origin = new URL(baseURL).origin;
  await page.route(`${origin}/**`, async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const response = await route.fetch();
    const body = (await response.text())
      .replace(/data-production="false"/g, 'data-production="true"')
      .replace(/data-allowed-origins=("[^"]*"|'[^']*')/g, `data-allowed-origins="[&quot;${origin}&quot;]"`)
      .replace(/data-site-url="[^"]*"/g, `data-site-url="${origin}"`);
    await route.fulfill({ response, body });
  });
  await page.route("https://stats.genli.top/**", async (route) => {
    const collect = new URL(route.request().url()).pathname === "/collect";
    if (collect) collects += 1;
    await route.fulfill({
      status: (collect && failCollect) || (!collect && failStats) ? 503 : collect ? 204 : 200,
      headers: { "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" },
      body: collect ? "" : JSON.stringify(data),
    });
  });
  return () => collects;
}

test("preview loads the local globe only on expansion and supports themes and reopening", async ({ page }, testInfo) => {
  const libraryRequests = [];
  const apiRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("globe.gl-")) libraryRequests.push(request.url());
    if (request.url().includes("stats.genli.top")) apiRequests.push(request.url());
  });
  // Observe the real library's animation controls without replacing its renderer.
  await page.route("**/globe.gl-2.46.2.min.js", async (route) => {
    const response = await route.fetch();
    const observer = `
      const ActualGlobe = window.Globe;
      window.Globe = class extends ActualGlobe {
        constructor(...args) {
          super(...args);
          window.__visitorTestGlobe = this;
          for (const name of ['pauseAnimation', 'resumeAnimation']) {
            const original = this[name];
            this[name] = (...values) => {
              window.__visitorAnimationPaused = name === 'pauseAnimation';
              return original.apply(this, values);
            };
          }
        }
      };
    `;
    await route.fulfill({ response, body: `${await response.text()}\n${observer}` });
  });
  await page.goto(home);
  const toggle = page.locator("#visitor-toggle");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(libraryRequests).toHaveLength(0);
  await toggle.click();
  await expect(page.locator("#visitor-summary")).toHaveText("🌍 42 visits from 3 countries and 3 locations");
  await expect(page.locator("#visitor-preview")).toBeVisible();
  await expect(page.locator("#visitor-activity")).toHaveCount(0);
  await expect(page.locator("#visitor-chart")).toHaveCount(0);
  await expect(page.locator("#visitor-globe")).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  await expect(page.locator("#visitor-globe canvas")).toHaveCount(1);
  await page.locator(".visitor-section").screenshot({ path: testInfo.outputPath("visitors-light.png") });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await page.locator(".visitor-section").screenshot({ path: testInfo.outputPath("visitors-dark.png") });
  await toggle.click();
  await expect(page.locator("#visitor-panel")).toBeHidden();
  expect(await page.evaluate(() => window.__visitorAnimationPaused)).toBe(true);
  await toggle.click();
  await expect(page.locator("#visitor-globe canvas")).toHaveCount(1);
  expect(await page.evaluate(() => window.__visitorAnimationPaused)).toBe(false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => page.evaluate(() => window.__visitorTestGlobe.controls().autoRotate)).toBe(false);
  expect(libraryRequests).toHaveLength(1);
  expect(apiRequests).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("one collection per tab session across refreshes and language navigation", async ({ page, baseURL }) => {
  const collects = await liveFixture(page, baseURL);
  await page.goto(home);
  await expect.poll(collects).toBe(1);
  await page.locator("#visitor-toggle").click();
  await expect(page.locator("#visitor-summary")).toHaveText("🌍 8 visits from 1 country and 1 location");
  await expect(page.locator("#visitor-summary strong")).toHaveText(["8", "1", "1"]);
  await page.reload();
  await page.goto(`${home}zh/`);
  await page.locator("#visitor-toggle").click();
  await expect(page.locator("#visitor-summary")).toHaveText("🌍 来自 1 个国家 / 地区、1 个地点的 8 次访问");
  await expect(page.locator("#visitor-activity")).toHaveCount(0);
  expect(collects()).toBe(1);
  expect(await page.evaluate(() => sessionStorage.getItem("visitor-recorded:https://stats.genli.top"))).toBe("true");
});

test("ordinary pages collect without loading statistics or a map", async ({ page, baseURL }) => {
  const requests = [];
  const collects = await liveFixture(page, baseURL);
  page.on("request", (request) => {
    if (request.url().includes("stats.genli.top")) requests.push(request.url());
  });
  await page.goto(`${home}publications/`);
  await expect.poll(collects).toBe(1);
  await expect(page.locator("#visitor-toggle")).toHaveCount(0);
  expect(requests).toEqual(["https://stats.genli.top/collect"]);
  await page.goto(home);
  await page.locator("#visitor-toggle").click();
  await expect(page.locator("#visitor-summary")).toContainText("8 visits");
  expect(collects()).toBe(1);
});

test("failed collection can retry on navigation and stores the session flag only after success", async ({ page, baseURL }) => {
  const collects = await liveFixture(page, baseURL, { failCollect: true });
  await page.goto(`${home}publications/`);
  await expect.poll(collects).toBe(1);
  expect(await page.evaluate(() => sessionStorage.getItem("visitor-recorded:https://stats.genli.top"))).toBeNull();
  let retries = 0;
  await page.route("https://stats.genli.top/collect", async (route) => {
    retries++;
    await route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": new URL(baseURL).origin }, body: "" });
  });
  await page.goto(home);
  await expect.poll(() => retries).toBe(1);
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("visitor-recorded:https://stats.genli.top"))).toBe("true");
  await page.reload();
  await page.locator("#visitor-toggle").click();
  await expect(page.locator("#visitor-summary")).toContainText("8 visits");
  expect(retries).toBe(1);
});

test("collection strips referrer paths and concurrent panel reads wait for a single write", async ({ page, baseURL }) => {
  await liveFixture(page, baseURL);
  let finish;
  let started;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const collected = new Promise((resolve) => {
    started = resolve;
  });
  let writes = 0;
  let reads = 0;
  await page.route("https://stats.genli.top/collect", async (route) => {
    writes++;
    const payload = route.request().postDataJSON();
    expect(payload.referrer).toBe("https://www.google.com");
    expect(typeof payload.touch).toBe("boolean");
    expect(route.request().headers()["content-type"]).toContain("text/plain");
    started();
    await pending;
    await route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": new URL(baseURL).origin }, body: "" });
  });
  page.on("request", (request) => {
    if (request.url() === "https://stats.genli.top/stats") reads++;
  });
  await page.goto(home, { referer: "https://www.google.com/search?q=private" });
  await collected;
  await page.locator("#visitor-toggle").click();
  expect(reads).toBe(0);
  finish();
  await expect(page.locator("#visitor-summary")).toContainText("8 visits");
  expect(writes).toBe(1);
  expect(reads).toBe(1);
});

test("a fresh tab session counts independently and an earlier session flag remains compatible", async ({ page, baseURL, context }) => {
  await liveFixture(page, baseURL);
  await page.addInitScript(() => sessionStorage.setItem("visitor-recorded:https://stats.genli.top", "1"));
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/collect")) requests++;
  });
  await page.goto(home);
  await page.locator("#visitor-toggle").click();
  await expect(page.locator("#visitor-summary")).toContainText("8 visits");
  expect(requests).toBe(0);
  const fresh = await context.newPage();
  try {
    const collects = await liveFixture(fresh, baseURL);
    await fresh.goto(home);
    await expect.poll(collects).toBe(1);
    await expect.poll(() => fresh.evaluate(() => sessionStorage.getItem("visitor-recorded:https://stats.genli.top"))).toBe("true");
  } finally {
    await fresh.close();
  }
});

test("blocked session storage skips collection while keeping statistics readable", async ({ page, baseURL }) => {
  const collects = await liveFixture(page, baseURL);
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new Error("Storage blocked");
      },
    });
  });
  await page.goto(home);
  await page.locator("#visitor-toggle").click();
  await expect(page.locator("#visitor-summary")).toContainText("8 visits");
  expect(collects()).toBe(0);
});

test("library failure retains totals and retry recovers", async ({ page }) => {
  const library = "**/globe.gl-2.46.2.min.js";
  await page.route(library, (route) => route.abort());
  await page.goto(home);
  await page.locator("#visitor-toggle").click();
  await expect(page.locator("#visitor-summary")).toHaveText("🌍 42 visits from 3 countries and 3 locations");
  await expect(page.locator("#visitor-retry")).toBeVisible();
  await page.unroute(library);
  await page.locator("#visitor-retry").click();
  await expect(page.locator("#visitor-globe")).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  await expect(page.locator("#visitor-retry")).toBeHidden();
});

test("statistics failure displays an error instead of an invented zero", async ({ page, baseURL }) => {
  await liveFixture(page, baseURL, { failStats: true });
  await page.goto(home);
  await page.locator("#visitor-toggle").click();
  await expect(page.locator("#visitor-error")).toContainText("statistics are temporarily unavailable", { timeout: 30000 });
  await expect(page.locator("#visitor-summary")).not.toContainText("0 visits");
  await expect(page.locator("#visitor-retry")).toBeVisible();
});

test("WebGL unavailable retains the accessible numeric summary", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /webgl/.test(type) ? null : original.call(this, type, ...args);
    };
  });
  await page.goto(`${home}zh/`);
  await page.locator("#visitor-toggle").click();
  await expect(page.locator("#visitor-summary")).toHaveText("🌍 来自 3 个国家 / 地区、3 个地点的 42 次访问");
  await expect(page.locator("#visitor-retry")).toBeVisible({ timeout: 30000 });
  await expect(page.locator("#visitor-globe")).toBeHidden();
});

test("globe tap opens ranked country details; dragging stays on the homepage", async ({ page, baseURL, isMobile }, testInfo) => {
  const data = {
    total: 25,
    places: 3, // Multiple cities in one country must count as separate locations.
    countryCount: 2,
    unknownCountryVisits: 3,
    countries: [
      { code: "SG", count: 8 },
      { code: "US", count: 7 },
      { code: "US", count: 7 },
    ],
  };
  const collects = await liveFixture(page, baseURL, { data });
  await page.goto(home);
  await page.locator("#visitor-toggle").click();
  const globe = page.locator("#visitor-globe");
  await expect(globe).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  await expect(page.locator('#navbar a[href$="visitors.html"]')).toHaveCount(0);
  await globe.scrollIntoViewIfNeeded();
  const bounds = await globe.boundingBox();
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y + 15, { steps: 5 });
  await page.mouse.move(x, y, { steps: 5 });
  await page.mouse.up();
  await expect(page).toHaveURL(new URL(home, baseURL).href);
  if (isMobile) await globe.tap();
  else await globe.click();
  await expect(page).toHaveURL(new URL(`${home}visitors.html`, baseURL).href);
  await expect(page.locator("#visitor-tracker")).toHaveCount(1);
  await expect(page.locator("#visitor-toggle")).toHaveCount(0);
  await expect(page.locator('#navbar a[href$="visitors.html"]')).toHaveCount(0);
  await expect(page.locator("#visitor-summary")).toHaveText("🌍 25 visits from 2 countries and 3 locations");
  await expect(page.locator("#visitor-countries tr")).toHaveCount(2);
  await expect(page.locator("#visitor-countries tr").first()).toHaveText(/United States\s*14/);
  await expect(page.locator("#visitor-cities")).toHaveCount(0);
  await expect(page.locator("#visitor-unlocated")).toContainText("3 visits with an unknown country");
  await expect(globe).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  await globe.click();
  await expect(page).toHaveURL(new URL(`${home}visitors.html`, baseURL).href);
  expect(collects()).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator(".visitor-section-details").screenshot({ path: testInfo.outputPath("visitor-details-light.png") });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await page.locator(".visitor-section-details").screenshot({ path: testInfo.outputPath("visitor-details-dark.png") });
});

test("Chinese homepage supports keyboard navigation to localized details without a navigation item", async ({ page, baseURL }) => {
  await page.goto(`${home}zh/`);
  await page.locator("#visitor-toggle").click();
  await expect(page.locator(".visitor-details-link")).toHaveAttribute("href", `${home}zh/visitors.html`);
  await page.locator("#visitor-globe").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new URL(`${home}zh/visitors.html`, baseURL).href);
  await expect(page.locator(".post-title")).toHaveText("访客统计");
  await expect(page.locator("#visitor-today")).toHaveText("1");
  await expect(page.locator("#visitor-last30")).toHaveText("42");
  await expect(page.locator("#visitor-total")).toHaveText("42");
  await expect(page.locator("#visitor-chart button")).toHaveCount(30);
  await expect(page.locator("#visitor-countries tr").first()).toHaveText(/新加坡\s*24/);
  await expect(page.locator("#visitor-cities-title")).toHaveCount(0);
  await expect(page.locator('#navbar a[href$="visitors.html"]')).toHaveCount(0);
  await expect(page.locator(".visitor-page-links a").first()).toHaveAttribute("href", `${home}zh/`);
  await expect(page.locator(".visitor-page-links a[lang]")).toHaveCount(0);
});

test("detail page handles empty data and visits without known countries", async ({ page, baseURL }) => {
  const data = { total: 0, places: 0, countryCount: 0, countries: [], unknownCountryVisits: 0 };
  await liveFixture(page, baseURL, { data });
  await page.goto(`${home}visitors.html`);
  await expect(page.locator("#visitor-summary")).toHaveText("🌍 0 visits from 0 countries and 0 locations");
  await expect(page.locator("#visitor-empty")).toBeVisible();
  await expect(page.locator("#visitor-tables")).toBeVisible();
  await expect(page.locator("#visitor-countries tr")).toHaveCount(0);
  await expect(page.locator("#visitor-unlocated")).toBeHidden();
  data.total = 5;
  data.unknownCountryVisits = 5;
  await page.reload();
  await expect(page.locator("#visitor-summary")).toHaveText("🌍 5 visits from 0 countries and 0 locations");
  await expect(page.locator("#visitor-unlocated")).toContainText("5 visits with an unknown country");
  await expect(page.locator("#visitor-empty")).toBeVisible();
});

test("detail data can retry independently of an unavailable globe", async ({ page, baseURL }) => {
  await liveFixture(page, baseURL, { failStats: true });
  await page.route("**/globe.gl-2.46.2.min.js", (route) => route.abort());
  await page.goto(`${home}visitors.html`);
  await expect(page.locator("#visitor-error")).toContainText("statistics are temporarily unavailable");
  await expect(page.locator("#visitor-breakdown")).toBeHidden();
  await page.route("https://stats.genli.top/stats", (route) =>
    route.fulfill({
      status: 200,
      headers: { "Access-Control-Allow-Origin": new URL(baseURL).origin, "Content-Type": "application/json" },
      body: JSON.stringify(stats),
    })
  );
  await page.locator("#visitor-retry").click();
  await expect(page.locator("#visitor-countries tr")).toHaveCount(1);
  await expect(page.locator("#visitor-globe")).toBeHidden();
  await expect(page.locator("#visitor-error")).not.toContainText("statistics are temporarily unavailable");
});

test("detail dimensions remain available without known countries and render names safely", async ({ page, baseURL }, testInfo) => {
  await liveFixture(page, baseURL, {
    data: {
      total: 8,
      places: 0,
      countryCount: 0,
      countries: [],
      referrers: [
        { name: "google.com", count: 3 },
        { name: "direct", count: 4 },
        { name: "<img src=x onerror=alert(1)>", count: 1 },
      ],
      operatingSystems: [
        { name: "Windows", count: 5 },
        { name: "iOS", count: 3 },
      ],
      deviceTypes: [
        { name: "Mobile", count: 3 },
        { name: "Desktop", count: 5 },
      ],
    },
  });
  await page.goto(`${home}visitors.html`);
  await expect(page.locator("#visitor-referrers tr").first()).toHaveText(/Direct \/ unknown source\s*4/);
  await expect(page.locator("#visitor-referrers img")).toHaveCount(0);
  await expect(page.locator("#visitor-operatingSystems")).toHaveCount(0);
  await expect(page.locator("#visitor-deviceTypes tr").first()).toHaveText(/Desktop\s*5/);
  await expect(page.locator("#visitor-empty")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator(".visitor-metrics").screenshot({ path: testInfo.outputPath("visitor-metrics-light.png") });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await page.locator(".visitor-metrics").screenshot({ path: testInfo.outputPath("visitor-metrics-dark.png") });
  await page.goto(`${home}zh/visitors.html`);
  await expect(page.locator("#visitor-deviceTypes tr").first()).toHaveText(/电脑\s*5/);
  await expect(page.locator("#visitor-referrers tr").first()).toHaveText(/直接访问 \/ 来源未知\s*4/);
});

test("both production domains collect once and read the self-hosted API", async ({ page, baseURL }) => {
  for (const origin of ["https://genli.top", "https://www.genli.top"]) {
    await page.route(`${origin}/**`, async (route) => {
      const target = new URL(route.request().url());
      const response = await route.fetch({ url: new URL(target.pathname, baseURL).href, maxRetries: 2 });
      const body =
        route.request().resourceType() === "document"
          ? (await response.text()).replace(/data-production="false"/g, 'data-production="true"')
          : await response.body();
      await route.fulfill({ response, body });
    });
    const requests = [];
    await page.route("https://stats.genli.top/**", async (route) => {
      requests.push({ url: route.request().url(), method: route.request().method() });
      const collect = route.request().method() === "POST";
      await route.fulfill({
        status: collect ? 204 : 200,
        headers: { "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" },
        body: collect ? "" : JSON.stringify(stats),
      });
    });
    await page.goto(`${origin}${home}visitors.html`);
    await expect(page.locator("#visitor-summary")).toHaveText("🌍 8 visits from 1 country and 1 location");
    await page.reload();
    await page.goto(`${origin}${home}zh/visitors.html`);
    await expect(page.locator("#visitor-summary")).toHaveText("🌍 来自 1 个国家 / 地区、1 个地点的 8 次访问");
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.filter((request) => request.method === "POST")).toEqual([{ method: "POST", url: "https://stats.genli.top/collect" }]);
    expect(requests.filter((request) => request.method === "GET").every((request) => request.url.endsWith("/stats"))).toBe(true);
    await expect(page.locator("#visitor-preview")).toBeHidden();
  }
});

test("a production build on localhost still uses previews without any API request", async ({ page, baseURL }) => {
  const origin = new URL(baseURL).origin;
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().includes("stats.genli.top")) requests++;
  });
  await page.route(`${origin}/**`, async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(/data-production="false"/g, 'data-production="true"') });
  });
  await page.goto(`${home}visitors.html`);
  await expect(page.locator("#visitor-summary")).toHaveText("🌍 42 visits from 3 countries and 3 locations");
  await expect(page.locator("#visitor-preview")).toBeVisible();
  await expect(page.locator("#visitor-referrers tr")).toHaveCount(3);
  expect(requests).toBe(0);
});

test("singular summary and country coloring work without invented archive dates", async ({ page, baseURL }, testInfo) => {
  await liveFixture(page, baseURL, { data: { ...stats, total: 1, countries: [{ code: "SG", count: 1 }] } });
  await page.addInitScript(() => {
    Object.defineProperty(window, "__countryGlobe", { writable: true, value: null });
  });
  await page.route("**/globe.gl-2.46.2.min.js", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: `${await response.text()}\nconst ActualGlobe = window.Globe; window.Globe = class extends ActualGlobe { constructor(...args) { super(...args); window.__countryGlobe = this; } };`,
    });
  });
  await page.goto(`${home}visitors.html`);
  await expect(page.locator("#visitor-summary")).toHaveText("🌍 1 visit from 1 country and 1 location");
  await expect(page.locator("#visitor-summary strong")).toHaveText(["1", "1", "1"]);
  await expect(page.locator("#visitor-period")).toHaveCount(0);
  await expect(page.locator("#visitor-stale")).toHaveCount(0);
  await expect(page.locator("#visitor-globe")).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  const globe = await page.evaluate(() => {
    const globe = window.__countryGlobe;
    const country = globe.polygonsData().find((feature) => feature.properties.code === "SG");
    return { color: globe.polygonCapColor()(country), label: globe.polygonLabel()(country).textContent, points: globe.pointsData().length };
  });
  expect(globe).toEqual({ color: "#e84c5c", label: "Singapore · 1 visit", points: 0 });
  await page.screenshot({ path: testInfo.outputPath("country-details-light.png"), fullPage: true });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await page.screenshot({ path: testInfo.outputPath("country-details-dark.png"), fullPage: true });
});

test("daily totals and 30 bars support touch, keyboard, localization and both themes", async ({ page, baseURL, isMobile }, testInfo) => {
  const activity = activityFixture([4, 2, 7, 4, 3, 2, 2, 8, 7, 4, 10, 4, 12, 9, 4, 3, 6, 7, 4, 5, 1, 12, 11, 12, 9, 8, 4, 2, 10, 11]);
  expect(activity.last30Days).toBe(187);
  const collects = await liveFixture(page, baseURL, { data: { ...stats, total: 187, countries: [{ code: "SG", count: 187 }], activity } });
  await page.goto(`${home}visitors.html`);
  await expect(page.locator("#visitor-today")).toHaveText("11");
  await expect(page.locator("#visitor-last30")).toHaveText("187");
  await expect(page.locator("#visitor-total")).toHaveText("187");
  await expect(page.locator("#visitor-history")).toBeVisible();
  await expect(page.locator("#visitor-chart button")).toHaveCount(30);
  await expect(page.locator("#visitor-chart-start")).toHaveText("2026-08-25");
  await expect(page.locator("#visitor-chart-end")).toHaveText("2026-09-23");
  await expect(page.locator("#visitor-history-note")).toBeHidden();
  const first = page.locator("#visitor-chart button").first();
  if (isMobile) await first.tap();
  else await first.hover();
  await expect(page.locator("#visitor-chart-readout")).toHaveText("2026-08-25 · 4 visits");
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#visitor-chart button").nth(1)).toBeFocused();
  await expect(page.locator("#visitor-chart-readout")).toHaveText("2026-08-26 · 2 visits");
  await page.keyboard.press("End");
  await expect(page.locator("#visitor-chart button").last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(first).toBeFocused();
  expect(await page.locator("#visitor-chart button").evaluateAll((buttons) => buttons.filter((button) => button.tabIndex === 0).length)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator("#visitor-activity").screenshot({ path: testInfo.outputPath("daily-light.png") });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await page.locator("#visitor-activity").screenshot({ path: testInfo.outputPath("daily-dark.png") });
  await page.goto(`${home}zh/visitors.html`);
  await expect(page.locator(".visitor-totals dt")).toHaveText(["今日", "近 30 天", "累计"]);
  await page.locator("#visitor-chart button").last().click();
  await expect(page.locator("#visitor-chart-readout")).toHaveText("2026-09-23 · 11 次访问");
  await page.locator("#visitor-activity").screenshot({ path: testInfo.outputPath("daily-zh.png") });
  expect(collects()).toBe(1);
});

test("unrecorded history is distinct from tracked zero days and remains in lifetime totals", async ({ page, baseURL }) => {
  const activity = activityFixture([...Array(28).fill(null), 0, 0], "2026-09-22", 7);
  await liveFixture(page, baseURL, { data: { ...stats, total: 7, activity } });
  await page.goto(`${home}visitors.html`);
  await expect(page.locator("#visitor-today")).toHaveText("0");
  await expect(page.locator("#visitor-last30")).toHaveText("0");
  await expect(page.locator("#visitor-total")).toHaveText("7");
  await expect(page.locator('#visitor-chart button[data-count="unknown"]')).toHaveCount(28);
  await expect(page.locator('#visitor-chart button[data-count="0"]')).toHaveCount(2);
  await expect(page.locator("#visitor-history-note")).toContainText("7 earlier visits are included in Totals only");
  await page.locator("#visitor-chart button").first().click();
  await expect(page.locator("#visitor-chart-readout")).toHaveText("2026-08-25 · Not recorded");
  const bars = await page.locator(".visitor-bar").evaluateAll((bars) => bars.map((bar) => bar.getBoundingClientRect().height));
  expect(bars.every((height) => Number.isFinite(height) && height <= 2)).toBe(true);
});

test("an older backend shows totals without inventing daily zeros", async ({ page, baseURL }) => {
  await liveFixture(page, baseURL);
  await page.goto(`${home}visitors.html`);
  await expect(page.locator("#visitor-total")).toHaveText("8");
  await expect(page.locator("#visitor-today")).toHaveText("—");
  await expect(page.locator("#visitor-last30")).toHaveText("—");
  await expect(page.locator("#visitor-history")).toBeHidden();
  await expect(page.locator("#visitor-history-note")).toContainText("not available yet");
});

test("inconsistent daily totals fail visibly without displaying invented counters", async ({ page, baseURL }) => {
  const activity = activityFixture(Array(30).fill(0));
  activity.today = 5;
  await liveFixture(page, baseURL, { data: { ...stats, activity } });
  await page.goto(`${home}visitors.html`);
  await expect(page.locator("#visitor-error")).toContainText("statistics are temporarily unavailable");
  await expect(page.locator("#visitor-activity")).toBeHidden();
});
