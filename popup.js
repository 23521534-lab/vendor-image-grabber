// popup.js — Vendor Image Grabber
// All vendor logic lives in vendors.js — this file is the UI engine only

// ——— State ———
const state = {
  vendor: null,
  tabId: null,
  tabUrl: "",
  images: [],        // all found image URLs
  filtered: [],      // images after filter
  selected: new Set(),
  scanning: false,
  downloading: false,
  filter: "all",     // "all" | "jpg" | "png" | "webp"
  settings: {
    autoSelect: true,
    throttle: true,
    dedup: true,
  }
};

// ——— DOM ———
const $ = id => document.getElementById(id);
const mainContent = $("mainContent");
const statusDot = $("statusDot");

// ——— Settings persistence ———
async function loadSettings() {
  try {
    const stored = await chrome.storage.local.get("settings");
    if (stored.settings) Object.assign(state.settings, stored.settings);
  } catch (_) {}
}

async function saveSettings() {
  try {
    await chrome.storage.local.set({ settings: state.settings });
  } catch (_) {}
}

// ——— Logging ———
function log(msg, type = "default") {
  const panel = $("logPanel");
  if (!panel) return;
  panel.classList.add("visible");
  const line = document.createElement("div");
  line.className = `log-line ${type}`;
  line.textContent = `> ${msg}`;
  panel.appendChild(line);
  panel.scrollTop = panel.scrollHeight;
}

// ——— Stats ———
function refreshStats() {
  const t = $("statTotal"), s = $("statSelected"), f = $("statFormat");
  if (t) t.textContent = state.filtered.length;
  if (s) s.textContent = state.selected.size;
  if (f) {
    const jpgs = state.images.filter(u => /\.jpe?g/i.test(u)).length;
    const pngs = state.images.filter(u => /\.png/i.test(u)).length;
    const wbp  = state.images.filter(u => /\.webp/i.test(u)).length;
    const dominant = [[jpgs,"JPG"],[pngs,"PNG"],[wbp,"WBP"]].sort((a,b)=>b[0]-a[0]);
    f.textContent = dominant[0][0] > 0 ? dominant[0][1] : "MIX";
  }
  const dlBtn = $("downloadBtn");
  if (dlBtn) dlBtn.disabled = state.selected.size === 0;
}

// ——— Filter logic ———
function applyFilter() {
  const f = state.filter;
  state.filtered = f === "all"
    ? [...state.images]
    : state.images.filter(u => u.toLowerCase().includes(`.${f}`));
  renderGrid();
  refreshStats();
}

// ——— Image grid ———
function renderGrid() {
  const grid = $("imageGrid");
  if (!grid) return;
  grid.innerHTML = "";

  if (state.filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:24px 0;color:var(--muted);font-size:12px;">No images match this filter</div>`;
    return;
  }

  state.filtered.forEach(url => {
    const div = document.createElement("div");
    div.className = "image-thumb" + (state.selected.has(url) ? " selected" : "");
    div.innerHTML = `
      <img src="${url}" loading="lazy" 
        onerror="this.parentElement.innerHTML='<div class=\\'thumb-placeholder\\'>🖼</div>'">
      <div class="thumb-check">✓</div>
    `;
    div.addEventListener("click", () => {
      state.selected.has(url) ? state.selected.delete(url) : state.selected.add(url);
      div.classList.toggle("selected");
      const chk = div.querySelector(".thumb-check");
      if (chk) chk.style.display = state.selected.has(url) ? "flex" : "none";
      refreshStats();
    });
    grid.appendChild(div);
  });
}

// ——— Select all toggle ———
function toggleSelectAll() {
  const allSelected = state.filtered.every(u => state.selected.has(u));
  if (allSelected) {
    state.filtered.forEach(u => state.selected.delete(u));
  } else {
    state.filtered.forEach(u => state.selected.add(u));
  }
  renderGrid();
  refreshStats();
}

// ——— Build main UI ———
function renderVendorUI() {
  mainContent.innerHTML = `
    <div class="vendor-badge detected">
      <span class="v-icon">${state.vendor.icon}</span>
      <span class="v-name">${state.vendor.name}</span>
      <span class="v-domain">${state.vendor.domain}</span>
    </div>

    <div class="scan-wrap">
      <button class="btn-scan" id="scanBtn">
        <span id="scanIcon">🔍</span>
        <span id="scanLabel">Scan for Images</span>
      </button>
    </div>

    <div class="progress-bar" id="progressBar">
      <div class="progress-fill indeterminate" id="progressFill"></div>
    </div>

    <div class="stats-row" id="statsRow" style="display:none">
      <div class="stat"><div class="stat-value" id="statTotal">0</div><div class="stat-label">Found</div></div>
      <div class="stat"><div class="stat-value" id="statSelected">0</div><div class="stat-label">Selected</div></div>
      <div class="stat"><div class="stat-value" id="statFormat">—</div><div class="stat-label">Format</div></div>
    </div>

    <div class="filter-bar" id="filterBar" style="display:none">
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="jpg">JPG</button>
      <button class="filter-btn" data-filter="png">PNG</button>
      <button class="filter-btn" data-filter="webp">WEBP</button>
    </div>

    <div class="images-section" id="imagesSection" style="display:none">
      <div class="images-header">
        <span class="images-title">Preview</span>
        <button class="select-all-btn" id="selectAllBtn">Select All</button>
      </div>
      <div class="image-grid" id="imageGrid"></div>
    </div>

    <div class="download-section" id="downloadSection" style="display:none">
      <button class="btn-download" id="downloadBtn" disabled>⬇ Download Selected</button>
      <button class="btn-clear" id="clearBtn" title="Clear results">✕</button>
    </div>

    <div class="log-panel" id="logPanel"></div>
  `;

  // Events
  $("scanBtn").addEventListener("click", startScan);
  $("selectAllBtn")?.addEventListener("click", toggleSelectAll);
  $("downloadBtn")?.addEventListener("click", startDownload);
  $("clearBtn")?.addEventListener("click", clearResults);

  // Filter buttons
  mainContent.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      mainContent.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.filter = btn.dataset.filter;
      applyFilter();
    });
  });

  // Update logo color to vendor color
  const logo = $("logo");
  if (logo && state.vendor.color) {
    logo.style.background = `linear-gradient(135deg, ${state.vendor.color}, ${lighten(state.vendor.color, 30)})`;
    logo.style.boxShadow = `0 0 18px ${state.vendor.color}44`;
    logo.textContent = state.vendor.icon;
  }

  statusDot.className = "status-dot active";
}

function lighten(hex, pct) {
  // Simple lighten: mix with white
  const num = parseInt(hex.replace("#",""), 16);
  const r = Math.min(255, (num >> 16) + Math.round(pct * 2.55));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(pct * 2.55));
  const b = Math.min(255, (num & 0xff) + Math.round(pct * 2.55));
  return `rgb(${r},${g},${b})`;
}

// ——— Unsupported site UI ———
function renderUnsupportedUI() {
  const domainList = Object.keys(VENDORS).map(d =>
    `<span class="vendor-chip">${VENDORS[d].icon} ${d}</span>`
  ).join("");

  mainContent.innerHTML = `
    <div class="state-box">
      <div class="s-icon">🔌</div>
      <h3>Site not supported</h3>
      <p>Navigate to a supported vendor product page to begin scanning for images.</p>
      <div class="vendor-chips">${domainList}</div>
    </div>
  `;
  statusDot.className = "status-dot warn";
}

// ——— SCAN ———
async function startScan() {
  if (state.scanning) return;
  state.scanning = true;
  state.images = [];
  state.filtered = [];
  state.selected.clear();
  state.filter = "all";

  const scanBtn = $("scanBtn");
  const progressBar = $("progressBar");

  scanBtn.disabled = true;
  scanBtn.classList.add("scanning");
  $("scanLabel").textContent = "Scanning...";
  $("scanIcon").textContent = "⏳";
  progressBar.classList.add("visible");

  log(`Scanning ${state.vendor.name}...`, "info");

  try {
    // Inject scraper.js as a real script file — no eval/new Function needed.
    // scraper.js reads window.location.href to pick the right vendor scraper.
    const results = await chrome.scripting.executeScript({
      target: { tabId: state.tabId },
      files: ["scraper.js"]
    });

    const urls = (results[0]?.result || []).filter(Boolean);
    state.images = urls;
    state.filtered = [...urls];

    // Auto-select
    if (state.settings.autoSelect) {
      urls.forEach(u => state.selected.add(u));
    }

    log(`Found ${urls.length} product image${urls.length !== 1 ? "s" : ""}`, urls.length > 0 ? "ok" : "err");

    $("statsRow").style.display = "grid";

    if (urls.length > 0) {
      $("filterBar").style.display = "flex";
      $("imagesSection").style.display = "block";
      $("downloadSection").style.display = "flex";
      renderGrid();
      refreshStats();
    } else {
      log("Try navigating to a product or catalog page first", "err");
    }

  } catch (err) {
    log("Scan failed: " + err.message, "err");
    statusDot.className = "status-dot error";
  }

  progressBar.classList.remove("visible");
  scanBtn.disabled = false;
  scanBtn.classList.remove("scanning");
  $("scanLabel").textContent = "Scan Again";
  $("scanIcon").textContent = "🔄";
  state.scanning = false;
}

// ——— DOWNLOAD ———
async function startDownload() {
  if (state.downloading || state.selected.size === 0) return;
  state.downloading = true;

  const urls = Array.from(state.selected);
  const dlBtn = $("downloadBtn");
  dlBtn.disabled = true;

  let done = 0, failed = 0;
  const folder = `vendor-images/${state.vendor.domain.replace(/\./g, "-")}`;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const rawName = url.split("/").pop().split("?")[0];
      const filename = rawName || `product_${i + 1}.jpg`;

      await chrome.downloads.download({
        url,
        filename: `${folder}/${filename}`,
        conflictAction: state.settings.dedup ? "uniquify" : "overwrite"
      });

      done++;
      dlBtn.textContent = `⬇ ${done}/${urls.length}`;
      log(`Saved: ${filename}`, "ok");

      if (state.settings.throttle) {
        await new Promise(r => setTimeout(r, 280));
      }
    } catch (err) {
      failed++;
      log(`Failed: ${url.split("/").pop().split("?")[0]}`, "err");
    }
  }

  dlBtn.disabled = false;
  dlBtn.textContent = failed > 0
    ? `✅ ${done} saved · ${failed} failed`
    : `✅ Done — ${done} file${done !== 1 ? "s" : ""} saved`;

  log(`Complete. ${done} saved to vendor-images/${state.vendor.domain}/`, "ok");
  state.downloading = false;
}

// ——— CLEAR ———
function clearResults() {
  state.images = [];
  state.filtered = [];
  state.selected.clear();

  ["statsRow","filterBar","imagesSection","downloadSection"].forEach(id => {
    const el = $(id);
    if (el) el.style.display = "none";
  });

  const log = $("logPanel");
  if (log) { log.innerHTML = ""; log.classList.remove("visible"); }

  $("scanLabel").textContent = "Scan for Images";
  $("scanIcon").textContent = "🔍";
  const sb = $("scanBtn");
  if (sb) { sb.disabled = false; sb.classList.remove("scanning"); }

  refreshStats();
}

// ——— SETTINGS PANEL ———
function initSettings() {
  const panel = $("settingsPanel");
  const settingsBtn = $("settingsBtn");
  const backBtn = $("backBtn");

  settingsBtn.addEventListener("click", () => {
    buildVendorList();
    panel.classList.add("open");
  });

  backBtn.addEventListener("click", () => {
    panel.classList.remove("open");
  });

  // Toggles
  const toggleIds = [
    ["toggleAutoSelect", "autoSelect"],
    ["toggleThrottle",   "throttle"],
    ["toggleDedup",      "dedup"],
  ];

  toggleIds.forEach(([id, key]) => {
    const el = $(id);
    if (!el) return;
    el.classList.toggle("on", state.settings[key]);
    el.addEventListener("click", () => {
      state.settings[key] = !state.settings[key];
      el.classList.toggle("on", state.settings[key]);
      saveSettings();
    });
  });
}

function buildVendorList() {
  const container = $("vendorListSettings");
  if (!container) return;
  container.innerHTML = Object.entries(VENDORS).map(([domain, v]) => `
    <div class="vendor-list-item">
      <span class="vli-icon">${v.icon}</span>
      <div>
        <div class="vli-name">${v.name}</div>
        <div class="vli-domain">${domain}</div>
      </div>
      <span class="vli-status">ACTIVE</span>
    </div>
  `).join("");
}

// ——— INIT ———
async function init() {
  await loadSettings();

  // Settings init before vendor detection
  initSettings();

  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (_) {}

  if (!tab) {
    mainContent.innerHTML = `<div class="state-box"><div class="s-icon">⚠️</div><h3>No active tab</h3></div>`;
    return;
  }

  state.tabId = tab.id;
  state.tabUrl = tab.url || "";
  state.vendor = detectVendor(state.tabUrl);

  if (state.vendor) {
    $("headerSub").textContent = `Active — ${state.vendor.name}`;
    renderVendorUI();
  } else {
    $("headerSub").textContent = "Waiting for vendor page";
    renderUnsupportedUI();
  }
}

init();
