const { test, expect } = require("@playwright/test");

const section = ".selected-publications";
const rows = `${section} .bibliography > li`;
const visibleRows = `${rows}:not([hidden])`;

async function visiblePaperIds(page) {
  return page.locator(visibleRows).evaluateAll((items) => items.map((item) => item.querySelector(".row > [id]").id));
}

async function expectFeatured(page) {
  await expect(page.locator(`${rows}:has(#flash)`)).toBeHidden();
  await expect(page.locator(`${rows}:has(#evo-depth)`)).toBeVisible();
  await expect(page.locator(`${rows}:has(#wm-survey)`)).toBeVisible();
  const count = await page.locator(visibleRows).count();
  await expect(page.locator(".selected-publication-filter-status")).toHaveText(
    page.url().includes("/zh/") ? `当前显示 ${count} 篇论文` : `Showing ${count} publications`
  );
  await expect(page.locator('[data-publication-filter="all"]')).toHaveAttribute("aria-pressed", "true");
}

test.beforeEach(async ({ page, baseURL }) => {
  // These checks need only the local site, and must never record analytics.
  const origin = new URL(baseURL).origin;
  await page.route("**/*", (route) => (new URL(route.request().url()).origin === origin ? route.continue() : route.abort()));
});

test.describe("Featured without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  for (const language of ["", "zh/"]) {
    test(`initial HTML shows Featured on /${language}`, async ({ page }) => {
      await page.goto(`/al-folio/${language}`, { waitUntil: "domcontentloaded" });
      await expectFeatured(page);
      await expect(page.locator(section)).not.toHaveAttribute("data-filters-ready", "true");
    });
  }
});

for (const language of ["", "zh/"]) {
  test(`delayed scripts preserve Featured and category switching on /${language}`, async ({ page }) => {
    let releaseScript;
    const scriptGate = new Promise((resolve) => (releaseScript = resolve));
    await page.route("**/featured-ready-check.js", async (route) => {
      await scriptGate;
      await route.fulfill({ contentType: "application/javascript", body: "" });
    });
    await page.route(`**/al-folio/${language}`, async (route) => {
      const response = await route.fetch();
      const body = (await response.text()).replace("</head>", '<script defer src="/al-folio/featured-ready-check.js"></script></head>');
      await route.fulfill({ response, body });
    });

    try {
      await page.goto(`/al-folio/${language}`, { waitUntil: "commit" });
      await expect(page.locator(section)).toBeVisible();
      await page.waitForFunction(() => document.readyState === "interactive");
      await expect(page.locator(section)).not.toHaveAttribute("data-filters-ready", "true");
      await expectFeatured(page);
      const initialIds = await visiblePaperIds(page);

      releaseScript();
      await expect(page.locator(section)).toHaveAttribute("data-filters-ready", "true");
      expect(await visiblePaperIds(page)).toEqual(initialIds);

      const filters = await page
        .locator("[data-publication-filter]")
        .evaluateAll((buttons) => buttons.map((button) => button.dataset.publicationFilter));
      for (const filter of filters.filter((value) => value !== "all")) {
        await page.locator(`[data-publication-filter="${filter}"]`).click();
        const expectedIds = await page
          .locator(`${rows}[data-publication-tags~="${filter}"]`)
          .evaluateAll((items) => items.map((item) => item.querySelector(".row > [id]").id));
        expect(await visiblePaperIds(page)).toEqual(expectedIds);
      }
      await page.locator('[data-publication-filter="efficient"]').click();
      await expect(page.locator(`${rows}:has(#flash)`)).toBeVisible();
      await page.locator('[data-publication-filter="all"]').click();
      expect(await visiblePaperIds(page)).toEqual(initialIds);

      await page.reload({ waitUntil: "domcontentloaded" });
      await expectFeatured(page);
      expect(await visiblePaperIds(page)).toEqual(initialIds);
    } finally {
      releaseScript();
    }
  });
}

test("full publication list is not filtered by homepage Featured settings", async ({ page }) => {
  await page.goto("/al-folio/publications/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".bibliography > li:has(#flash)")).toBeVisible();
  await expect(page.locator(".bibliography > li[hidden]")).toHaveCount(0);
  await expect(page.locator(".bibliography > li[data-show-in-all]")).toHaveCount(0);
});
