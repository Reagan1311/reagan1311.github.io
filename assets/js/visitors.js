(() => {
  const tracker = document.getElementById("visitor-tracker");
  if (!tracker || tracker.dataset.initialized) return;
  tracker.dataset.initialized = "true";

  const zh = tracker.dataset.language === "zh";
  const words = zh
    ? {
        show: "🌍 访客地图",
        hide: "收起地图",
        loading: "正在加载访客统计…",
        statsError: "暂时无法获取访客统计，请稍后重试。",
        globeError: "暂时无法显示地球，访问统计仍可查看。",
        visits: "次访问",
      }
    : {
        show: "🌍 Visitor Map",
        hide: "Hide Map",
        loading: "Loading visitor statistics…",
        statsError: "Visitor statistics are temporarily unavailable. Please try again.",
        globeError: "The globe is unavailable. You can still view the visit totals.",
        visits: "visits",
      };

  let api;
  let live = false;
  let allowedOrigins = [];
  try {
    api = new URL(tracker.dataset.apiUrl);
    const configured = JSON.parse(tracker.dataset.allowedOrigins || "null");
    allowedOrigins = Array.isArray(configured) ? configured : [new URL(tracker.dataset.siteUrl).origin];
    live = tracker.dataset.production === "true" && allowedOrigins.includes(location.origin) && api.protocol === "https:";
  } catch {
    // An unconfigured endpoint must never send analytics from a preview.
  }

  async function request(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, { ...options, credentials: "omit", signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  let collection = null;
  let recorded = false;
  function collectVisit() {
    if (!live || recorded) return Promise.resolve();
    if (collection) return collection;
    const key = `visitor-recorded:${api.origin}`;
    try {
      if (sessionStorage.getItem(key)) {
        recorded = true;
        return Promise.resolve();
      }
      // If storage is blocked, skip collection instead of counting each refresh.
      sessionStorage.setItem(`${key}:storage-check`, "1");
      sessionStorage.removeItem(`${key}:storage-check`);
    } catch {
      return Promise.resolve();
    }
    let referrer = "";
    try {
      const source = new URL(document.referrer);
      if (/^https?:$/.test(source.protocol)) referrer = source.origin;
    } catch {
      // Direct navigation and hidden referrers have no referring origin.
    }
    collection = request(new URL("/collect", api), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({ referrer, touch: navigator.maxTouchPoints > 0 }),
      keepalive: true,
    })
      .then(() => {
        recorded = true;
        sessionStorage.setItem(key, "true");
      })
      .catch(() => {
        // Leave failed requests retryable on a later page or panel refresh.
      })
      .finally(() => {
        collection = null;
      });
    return collection;
  }

  // Collect on ordinary pages as well, before checking for the optional map UI.
  collectVisit();
  const isDetails = tracker.dataset.view === "details";
  const toggle = document.getElementById("visitor-toggle");
  const panel = document.getElementById("visitor-panel");
  if (!panel) return;
  const box = document.getElementById("visitor-globe");
  const summary = document.getElementById("visitor-summary");
  const error = document.getElementById("visitor-error");
  const retry = document.getElementById("visitor-retry");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const previewEnd = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const previewCounts = [1, 0, 2, 1, 1, 0, 0, 2, 2, 1, 3, 1, 3, 2, 1, 0, 2, 2, 1, 1, 0, 3, 2, 3, 2, 2, 1, 0, 2, 1];
  const previewDays = previewCounts.map((count, index) => ({
    date: new Date(Date.parse(`${previewEnd}T00:00:00Z`) - (29 - index) * 86400000).toISOString().slice(0, 10),
    count,
  }));
  const preview = {
    total: 42,
    places: 3,
    activity: {
      timeZone: "Asia/Shanghai",
      since: previewDays[0].date,
      start: previewDays[0].date,
      end: previewEnd,
      today: 1,
      last30Days: 42,
      undatedVisits: 0,
      days: previewDays,
    },
    countryCount: 3,
    countries: [
      { code: "SG", count: 24 },
      { code: "GB", count: 12 },
      { code: "KR", count: 6 },
    ],
    referrers: [
      { name: "direct", count: 20 },
      { name: "google.com", count: 12 },
      { name: "github.com", count: 10 },
    ],
    operatingSystems: [
      { name: "Windows", count: 20 },
      { name: "macOS", count: 12 },
      { name: "iOS", count: 10 },
    ],
    deviceTypes: [
      { name: "Desktop", count: 32 },
      { name: "Mobile", count: 8 },
      { name: "Tablet", count: 2 },
    ],
    unknownCountryVisits: 0,
  };
  document.getElementById("visitor-preview").hidden = live;

  let globe = null;
  let globeTask = null;
  let libraryTask = null;
  let mapTask = null;
  let stats = null;
  let loading = false;
  let globeFailed = false;
  let statsFailed = false;
  let regionNames;
  try {
    regionNames = new Intl.DisplayNames([zh ? "zh-CN" : "en"], { type: "region" });
  } catch {
    // Older browsers can still display country codes.
  }

  function countryName(code) {
    try {
      return regionNames ? regionNames.of(code) : code;
    } catch {
      return code;
    }
  }

  function validateActivity(activity, total) {
    if (activity == null) return null; // Older Worker versions still provide lifetime totals.
    const isDate = (value) =>
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
    const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
    if (
      activity.timeZone !== "Asia/Shanghai" ||
      ![activity.start, activity.end, activity.since].every(isDate) ||
      !Array.isArray(activity.days) ||
      activity.days.length !== 30 ||
      !isCount(activity.today) ||
      !isCount(activity.last30Days) ||
      !isCount(activity.undatedVisits) ||
      activity.last30Days > total ||
      activity.undatedVisits > total
    )
      throw new Error("Invalid daily statistics");
    const start = Date.parse(`${activity.start}T00:00:00Z`);
    for (const [index, day] of activity.days.entries()) {
      const expected = new Date(start + index * 86400000).toISOString().slice(0, 10);
      if (day.date !== expected || (day.date < activity.since ? day.count !== null : !isCount(day.count))) {
        throw new Error("Invalid daily series");
      }
    }
    if (
      activity.end !== activity.days[29].date ||
      activity.today !== activity.days[29].count ||
      activity.last30Days !== activity.days.reduce((sum, day) => sum + (day.count || 0), 0)
    )
      throw new Error("Inconsistent daily statistics");
    return activity;
  }

  function renderActivity() {
    if (!isDetails) return;
    const activity = stats.activity;
    const note = document.getElementById("visitor-history-note");
    const history = document.getElementById("visitor-history");
    const setCount = (id, count) => {
      const element = document.getElementById(id);
      element.textContent = count == null ? "—" : count.toLocaleString();
      element.nextElementSibling.textContent = zh ? "次访问" : count === 1 ? "visit" : "visits";
    };
    setCount("visitor-total", stats.total);
    setCount("visitor-today", activity?.today);
    setCount("visitor-last30", activity?.last30Days);
    document.getElementById("visitor-activity").hidden = false;
    history.hidden = !activity;
    if (!activity) {
      note.textContent = zh ? "每日统计暂未提供。" : "Daily statistics are not available yet.";
      note.hidden = false;
      return;
    }
    const chart = document.getElementById("visitor-chart");
    const readout = document.getElementById("visitor-chart-readout");
    readout.textContent = zh ? "每日访问" : "Daily visits";
    const maximum = Math.max(1, ...activity.days.map((day) => day.count || 0));
    const fragment = document.createDocumentFragment();
    activity.days.forEach(({ date, count }, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "visitor-day";
      button.dataset.count = count == null ? "unknown" : String(count);
      button.tabIndex = index === 29 ? 0 : -1;
      const label = `${date} · ${count == null ? (zh ? "未记录" : "Not recorded") : `${count.toLocaleString()} ${zh ? "次访问" : count === 1 ? "visit" : "visits"}`}`;
      button.setAttribute("aria-label", label);
      button.title = label;
      const bar = document.createElement("span");
      bar.className = "visitor-bar";
      bar.setAttribute("aria-hidden", "true");
      bar.style.setProperty("--bar-height", `${((count || 0) / maximum) * 100}%`);
      button.appendChild(bar);
      const describe = () => {
        readout.textContent = label;
      };
      button.addEventListener("pointerenter", describe);
      button.addEventListener("focus", describe);
      button.addEventListener("click", describe);
      button.addEventListener("keydown", (event) => {
        const next = { ArrowLeft: Math.max(0, index - 1), ArrowRight: Math.min(29, index + 1), Home: 0, End: 29 }[event.key];
        if (next == null) return;
        event.preventDefault();
        chart.querySelectorAll("button").forEach((item, i) => {
          item.tabIndex = i === next ? 0 : -1;
        });
        chart.children[next].focus();
      });
      fragment.appendChild(button);
    });
    chart.replaceChildren(fragment);
    for (const [id, value] of [
      ["visitor-chart-start", activity.start],
      ["visitor-chart-end", activity.end],
    ]) {
      const element = document.getElementById(id);
      element.dateTime = value;
      element.textContent = value;
    }
    note.textContent = zh ? `每日数据自 ${activity.since} 起记录。` : `Daily data recorded since ${activity.since}.`;
    if (activity.undatedVisits > 0)
      note.textContent += zh
        ? ` ${activity.undatedVisits.toLocaleString()} 次较早的访问已计入累计，未计入每日统计。`
        : ` ${activity.undatedVisits.toLocaleString()} earlier visits are included in Totals only.`;
    note.hidden = activity.since <= activity.start && activity.undatedVisits === 0;
  }

  function renderBreakdown() {
    if (!isDetails) return;
    function fillTable(id, rows) {
      const body = document.getElementById(id);
      const fragment = document.createDocumentFragment();
      rows.forEach((values) => {
        const row = document.createElement("tr");
        values.forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.appendChild(cell);
        });
        fragment.appendChild(row);
      });
      body.replaceChildren(fragment);
    }

    fillTable(
      "visitor-countries",
      stats.countries.map(({ code, count }) => [countryName(code), count.toLocaleString()])
    );
    const labels = {
      direct: zh ? "直接访问 / 来源未知" : "Direct / unknown source",
      unknown: zh ? "未记录（历史访问）" : "Not recorded (earlier visits)",
      Unknown: zh ? "无法识别" : "Unknown",
      Desktop: zh ? "电脑" : "Desktop",
      Mobile: zh ? "手机" : "Mobile",
      Tablet: zh ? "平板" : "Tablet",
      Bot: zh ? "爬虫" : "Bot",
    };
    for (const dimension of ["referrers", "deviceTypes"]) {
      const rows = (Array.isArray(stats[dimension]) ? stats[dimension] : [])
        .filter((row) => typeof row.name === "string" && Number.isSafeInteger(row.count) && row.count > 0)
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
      fillTable(
        `visitor-${dimension}`,
        rows.map(({ name, count }) => [Object.hasOwn(labels, name) ? labels[name] : name, count.toLocaleString()])
      );
      document.getElementById(`visitor-${dimension}-empty`).hidden = rows.length > 0;
    }

    const unlocated = stats.unknownCountryVisits || 0;
    const note = document.getElementById("visitor-unlocated");
    note.hidden = unlocated === 0;
    note.textContent = zh
      ? `${unlocated.toLocaleString()} 次访问的国家未知，已计入总数。`
      : `${unlocated.toLocaleString()} visits with an unknown country are included in the total.`;
    document.getElementById("visitor-empty").hidden = stats.countries.length > 0;
    document.getElementById("visitor-breakdown").hidden = false;
  }

  function updateErrors() {
    error.textContent = [statsFailed ? words.statsError : "", globeFailed ? words.globeError : ""].filter(Boolean).join(" ");
    error.hidden = !error.textContent;
    retry.hidden = !error.textContent;
  }

  function loadLibrary() {
    if (typeof window.Globe === "function") return Promise.resolve();
    if (libraryTask) return libraryTask;
    libraryTask = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      let timer;
      const finish = (failure) => {
        clearTimeout(timer);
        script.onload = script.onerror = null;
        if (failure) {
          script.remove();
          reject(new Error("Globe library unavailable"));
        } else resolve();
      };
      script.src = tracker.dataset.globeUrl;
      script.async = true;
      script.onload = () => finish(typeof window.Globe !== "function");
      script.onerror = () => finish(true);
      timer = setTimeout(() => finish(true), 15000);
      document.head.appendChild(script);
    }).catch((failure) => {
      libraryTask = null;
      throw failure;
    });
    return libraryTask;
  }

  function loadMap() {
    if (!mapTask) {
      mapTask = request(tracker.dataset.mapUrl)
        .then((response) => response.json())
        .then((data) => {
          if (!Array.isArray(data.features)) throw new Error("Invalid map");
          return data.features;
        })
        .catch((failure) => {
          mapTask = null;
          throw failure;
        });
    }
    return mapTask;
  }

  function resize() {
    if (!globe || panel.hidden) return;
    const size = box.clientWidth;
    if (size) globe.width(size).height(size);
  }

  function motion() {
    if (!globe) return;
    globe.controls().autoRotate = !reducedMotion.matches;
    if (panel.hidden || document.hidden) globe.pauseAnimation();
    else globe.resumeAnimation();
  }

  function theme() {
    if (!globe) return;
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    const counts = new Map((stats?.countries || []).map(({ code, count }) => [code, count]));
    globe.polygonCapColor((feature) => (counts.has(feature.properties.code) ? "#e84c5c" : dark ? "#7197b5" : "#99bfdc"));
    globe.polygonSideColor(() => (dark ? "#24425c" : "#d5eafa"));
    globe.polygonStrokeColor(() => (dark ? "#24425c" : "#d5eafa"));
    globe.globeMaterial().color.set(dark ? "#24425c" : "#d5eafa");
    globe.atmosphereColor(dark ? "#426f96" : "#acd6ef");
  }

  function tooltip(feature) {
    const element = document.createElement("div");
    element.className = "visitor-point-label";
    const code = feature.properties.code;
    const count = stats?.countries.find((row) => row.code === code)?.count || 0;
    element.textContent = `${countryName(code)} · ${count.toLocaleString()} ${zh ? "次访问" : count === 1 ? "visit" : "visits"}`;
    return element;
  }

  function disposeGlobe() {
    if (globe) {
      globe.pauseAnimation();
      globe._destructor();
      globe = null;
    }
    box.replaceChildren();
  }

  async function ensureGlobe() {
    if (globe) return;
    if (globeTask) return globeTask;
    globeTask = Promise.all([loadLibrary(), loadMap()])
      .then(([, countries]) => {
        if (panel.hidden) return;
        try {
          globe = new window.Globe(box, { animateIn: !reducedMotion.matches, rendererConfig: { antialias: true, alpha: true } })
            .backgroundColor("rgba(0,0,0,0)")
            .showGraticules(true)
            .showAtmosphere(true)
            .atmosphereAltitude(0.17)
            .polygonsData(countries)
            .polygonAltitude(0.006)
            .polygonsTransitionDuration(0)
            .polygonLabel(tooltip);
          globe.controls().autoRotateSpeed = 0.6;
          globe.controls().enableZoom = false;
          globe.pointOfView({ lat: 20, lng: 105, altitude: 2.1 }, 0);
          globe.globeMaterial().shininess = 8;
          const canvas = box.querySelector("canvas");
          canvas.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            disposeGlobe();
            globeFailed = true;
            box.hidden = true;
            updateErrors();
          });
          theme();
          resize();
          motion();
          box.dataset.ready = "true";
        } catch (failure) {
          disposeGlobe();
          throw failure;
        }
      })
      .finally(() => {
        globeTask = null;
      });
    return globeTask;
  }

  async function loadStats() {
    await collectVisit();
    const data = live ? await (await request(new URL("/stats", api))).json() : preview;
    if (
      !Number.isSafeInteger(data.total) ||
      data.total < 0 ||
      !Number.isSafeInteger(data.places) ||
      data.places < 0 ||
      data.places > data.total ||
      !Array.isArray(data.countries)
    ) {
      throw new Error("Invalid statistics");
    }
    const activity = isDetails ? validateActivity(data.activity, data.total) : null;
    const countries = new Map();
    data.countries.forEach((row) => {
      if (/^[A-Z]{2}$/.test(row.code) && !["XX", "ZZ", "EU", "AP"].includes(row.code) && Number.isSafeInteger(row.count) && row.count > 0) {
        countries.set(row.code, (countries.get(row.code) || 0) + row.count);
      }
    });
    stats = {
      ...data,
      activity,
      countries: [...countries].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count || a.code.localeCompare(b.code)),
    };
    const total = document.createElement("strong");
    total.textContent = stats.total.toLocaleString();
    const locationTotal = document.createElement("strong");
    locationTotal.textContent = stats.places.toLocaleString();
    summary.replaceChildren(
      ...(zh
        ? ["🌍 来自 ", locationTotal, " 个地点的 ", total, " 次访问"]
        : ["🌍 ", total, stats.total === 1 ? " visit from " : " visits from ", locationTotal, stats.places === 1 ? " location" : " locations"])
    );
    renderActivity();
    renderBreakdown();
    theme();
  }

  async function load() {
    if (loading) return;
    loading = true;
    retry.hidden = true;
    globeFailed = statsFailed = false;
    error.hidden = true;
    box.hidden = false;
    panel.setAttribute("aria-busy", "true");
    if (!stats) summary.textContent = words.loading;
    await Promise.all([
      loadStats().catch(() => {
        statsFailed = true;
        if (!stats) summary.textContent = "";
      }),
      ensureGlobe().catch(() => {
        globeFailed = true;
        box.hidden = true;
      }),
    ]);
    // The panel may have closed while resources loaded, then reopened while
    // statistics were still pending. Initialize the globe if it was skipped.
    if (!panel.hidden && !globe && !globeFailed) {
      try {
        await ensureGlobe();
      } catch {
        globeFailed = true;
        box.hidden = true;
      }
    }
    loading = false;
    panel.removeAttribute("aria-busy");
    updateErrors();
  }

  if (toggle) {
    toggle.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      toggle.setAttribute("aria-expanded", String(!panel.hidden));
      toggle.textContent = panel.hidden ? words.show : words.hide;
      if (!panel.hidden) {
        resize();
        load();
      }
      motion();
    });
  }
  if (!isDetails) {
    let pointer = null;
    const navigate = () => location.assign(tracker.dataset.detailsUrl);
    box.addEventListener("pointerdown", (event) => {
      pointer =
        event.isPrimary && event.button === 0
          ? { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), moved: false }
          : null;
    });
    box.addEventListener("pointermove", (event) => {
      if (pointer && event.pointerId === pointer.id && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 6) {
        pointer.moved = true;
      }
    });
    box.addEventListener("pointercancel", () => {
      pointer = null;
    });
    box.addEventListener("pointerup", (event) => {
      const start = pointer;
      pointer = null;
      if (
        start &&
        event.pointerId === start.id &&
        !start.moved &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 6 &&
        performance.now() - start.time < 500
      )
        navigate();
    });
    box.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        navigate();
      }
    });
  }
  retry.addEventListener("click", load);
  new ResizeObserver(resize).observe(box);
  new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  reducedMotion.addEventListener("change", motion);
  document.addEventListener("visibilitychange", motion);
  window.addEventListener("pagehide", () => globe && globe.pauseAnimation());
  window.addEventListener("pageshow", motion);
  if (isDetails) load();
})();
