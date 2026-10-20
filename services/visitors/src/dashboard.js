export function dashboardHtml(language = "zh") {
  const chinese = language === "zh";
  const title = chinese ? "每日访客来源" : "Daily visitor locations";
  const description = chinese ? "查看最近 30 天的国家和城市访问量。" : "Visits by country and city for the last 30 days.";
  const dateLabel = chinese ? "选择日期" : "Choose a date";
  const countryHeading = chinese ? "国家 / 地区" : "Countries / regions";
  const cityHeading = chinese ? "城市" : "Cities";
  const visitsHeading = chinese ? "访问次数" : "Visits";
  const loading = chinese ? "正在加载…" : "Loading…";
  const empty = chinese ? "这一天暂无记录。每日来源统计从启用之日开始。" : "No visits recorded for this day. Daily location tracking starts when enabled.";
  const beforeStart = chinese ? "这一天早于每日来源统计启用日期。" : "Daily location tracking was not active on this date.";
  const error = chinese ? "无法读取数据。请确认已通过 Cloudflare Access 登录，然后重试。" : "Could not load data. Sign in through Cloudflare Access and try again.";
  const unknownCountry = chinese ? "未知国家 / 地区" : "Unknown country / region";
  const unknownCity = chinese ? "未知城市" : "Unknown city";
  const total = chinese ? "总访问量" : "Total visits";
  const retry = chinese ? "重试" : "Retry";
  const htmlLanguage = chinese ? "zh-CN" : "en";

  return `<!doctype html>
<html lang="${htmlLanguage}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${title}</title>
  <style>
    :root { color-scheme: light dark; font: 16px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: Canvas; color: CanvasText; }
    main { width: min(960px, calc(100% - 32px)); margin: 48px auto; }
    h1 { margin: 0 0 4px; font-size: clamp(1.7rem, 5vw, 2.25rem); }
    p { color: color-mix(in srgb, CanvasText 72%, Canvas); }
    .controls { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin: 28px 0 12px; }
    input, button { min-height: 42px; padding: 8px 12px; border: 1px solid color-mix(in srgb, CanvasText 28%, Canvas); border-radius: 8px; background: Canvas; color: CanvasText; font: inherit; }
    button { cursor: pointer; }
    #status { min-height: 1.5em; }
    .total { font-weight: 650; }
    .tables { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr)); gap: 20px; margin-top: 20px; }
    section { min-width: 0; }
    h2 { font-size: 1.15rem; }
    .table-wrap { overflow-x: auto; border: 1px solid color-mix(in srgb, CanvasText 18%, Canvas); border-radius: 10px; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th, td { padding: 10px 12px; border-bottom: 1px solid color-mix(in srgb, CanvasText 14%, Canvas); }
    th:last-child, td:last-child { text-align: right; white-space: nowrap; }
    tbody tr:last-child td { border-bottom: 0; }
    .muted { color: color-mix(in srgb, CanvasText 62%, Canvas); }
    [hidden] { display: none !important; }
    @media (max-width: 520px) { main { margin: 28px auto; } }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p>${description}</p>
    <div class="controls">
      <label for="date">${dateLabel}</label>
      <input id="date" type="date" required>
      <button id="retry" type="button" hidden>${retry}</button>
    </div>
    <p id="status" role="status" aria-live="polite">${loading}</p>
    <p id="total" class="total" hidden></p>
    <div class="tables" id="tables" hidden>
      <section aria-labelledby="country-title">
        <h2 id="country-title">${countryHeading}</h2>
        <div class="table-wrap"><table><thead><tr><th>${countryHeading}</th><th>${visitsHeading}</th></tr></thead><tbody id="countries"></tbody></table></div>
      </section>
      <section aria-labelledby="city-title">
        <h2 id="city-title">${cityHeading}</h2>
        <div class="table-wrap"><table><thead><tr><th>${countryHeading} / ${cityHeading}</th><th>${visitsHeading}</th></tr></thead><tbody id="cities"></tbody></table></div>
      </section>
    </div>
  </main>
  <script>
    (() => {
      const zh = ${JSON.stringify(chinese)};
      const labels = { empty: ${JSON.stringify(empty)}, beforeStart: ${JSON.stringify(beforeStart)}, error: ${JSON.stringify(error)}, unknownCountry: ${JSON.stringify(unknownCountry)}, unknownCity: ${JSON.stringify(unknownCity)}, total: ${JSON.stringify(total)} };
      const dateInput = document.getElementById("date");
      const status = document.getElementById("status");
      const total = document.getElementById("total");
      const tables = document.getElementById("tables");
      const countriesBody = document.getElementById("countries");
      const citiesBody = document.getElementById("cities");
      const retry = document.getElementById("retry");
      const formatter = new Intl.NumberFormat(zh ? "zh-CN" : "en");
      const regionNames = new Intl.DisplayNames([zh ? "zh-CN" : "en"], { type: "region" });
      const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
      const today = now.toISOString().slice(0, 10);
      const earliest = new Date(Date.parse(today + "T00:00:00Z") - 29 * 86400000).toISOString().slice(0, 10);
      dateInput.min = earliest;
      dateInput.max = today;
      dateInput.value = today;

      function addRow(target, values) {
        const row = document.createElement("tr");
        for (const value of values) {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        }
        target.append(row);
      }

      async function load() {
        const date = dateInput.value;
        if (date < earliest || date > today) return;
        status.textContent = ${JSON.stringify(loading)};
        total.hidden = true;
        tables.hidden = true;
        retry.hidden = true;
        countriesBody.replaceChildren();
        citiesBody.replaceChildren();
        try {
          const response = await fetch("/daily-geography?date=" + encodeURIComponent(date), { credentials: "same-origin", cache: "no-store" });
          if (!response.ok) throw new Error("Request failed");
          const data = await response.json();
          if (!data.available) {
            status.textContent = labels.beforeStart;
            return;
          }
          const rows = Array.isArray(data.rows) ? data.rows : [];
          const countryCounts = new Map();
          const countryName = (code) => {
            if (!code) return labels.unknownCountry;
            try { return regionNames.of(code) || code; } catch { return code; }
          };
          for (const row of rows) {
            const country = row.country || "";
            countryCounts.set(country, (countryCounts.get(country) || 0) + row.visits);
          }
          [...countryCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).forEach(([country, count]) =>
            addRow(countriesBody, [countryName(country), formatter.format(count)])
          );
          rows.forEach((row) => addRow(citiesBody, [
            countryName(row.country) + " · " + (row.city || labels.unknownCity),
            formatter.format(row.visits),
          ]));
          total.textContent = labels.total + ": " + formatter.format(data.visits);
          total.hidden = false;
          tables.hidden = rows.length === 0;
          status.textContent = rows.length ? "" : labels.empty;
        } catch {
          status.textContent = labels.error;
          retry.hidden = false;
        }
      }

      dateInput.addEventListener("change", load);
      retry.addEventListener("click", load);
      load();
    })();
  </script>
</body>
</html>`;
}
