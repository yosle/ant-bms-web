/* ANT BMS Monitor — UI glue: connection state, demo mode, rendering, i18n. */

import { findFrames, decodeRealtime, POLL_INTERVAL_MS } from "./protocol.js";
import { bluetoothSupport, AntBmsClient } from "./ble.js";
import { DemoBattery } from "./demo.js";
import {
  detectLang, saveLang, t, formatMinutes,
  SYSTEM_STATE_TEXT, BATTERY_TYPE_TEXT, DIS_MOS_TEXT, CH_MOS_TEXT, BALANCE_TEXT,
  PROTECT_TEXT, WARNING_TEXT, STATUS_WARNING_BITS, INFO_PROTECT_BITS,
} from "./i18n.js";

const $ = (id) => document.getElementById(id);

const ICONS = {
  bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="currentColor"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v13.17l-4.59-4.58L6 13l6 6 6-6-1.41-1.41L12 16.17V3z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z" fill="currentColor"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-1.2 14.5-4.3-4.3 1.4-1.4 2.9 2.9 5.9-5.9 1.4 1.4z" fill="currentColor"/></svg>',
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 1 21h22zm1 14h-2v2h2zm0-7h-2v5h2z" fill="currentColor"/></svg>',
  warnOutline: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.8 19.5 19h-15zM12 2 1 21h22zm1 12h-2v2h2zm0-5h-2v4h2z" fill="currentColor"/></svg>',
};

const state = {
  lang: detectLang(),
  mode: "idle", // idle | connecting | live | demo
  client: null,
  demo: null,
  demoTimer: null,
  demoTick: 0,
  snapshot: null,
  cellTiles: [],
  tempTiles: [],
  chipSig: "",
  alarmSig: "",
};

/* ---------- i18n ---------- */

const fmtCache = {};
function fmt(n, digits = 0) {
  const key = `${state.lang}:${digits}`;
  fmtCache[key] ??= new Intl.NumberFormat(state.lang === "es" ? "es-ES" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return fmtCache[key].format(n);
}

function applyStatic() {
  document.documentElement.lang = state.lang;
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(state.lang, el.dataset.i18n);
  }
  $("btnLang").textContent = state.lang === "es" ? "EN" : "ES";
}

/* ---------- SOC gauge: a 10-segment battery ---------- */

const SEGMENTS = 10;
let gaugeSegs = [];

function initGauge() {
  const body = $("battBody");
  body.textContent = "";
  gaugeSegs = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const seg = document.createElement("i");
    body.append(seg);
    gaugeSegs.push(seg);
  }
}

function setGauge(frac) {
  const f = Math.min(1, Math.max(0, frac));
  const lit = Math.round(f * SEGMENTS);
  gaugeSegs.forEach((seg, i) => seg.classList.toggle("on", i < lit));
}

/* ---------- helpers ---------- */

function activeBits(mask, mask1, count) {
  const out = [];
  for (let bit = 0; bit < count; bit++) {
    const value = bit < 32 ? mask : mask1;
    if ((value >>> bit % 32) & 1) out.push(bit);
  }
  return out;
}

function hasBit(s, bit) {
  const value = bit < 32 ? s.warningMask : s.warningMask1;
  return ((value >>> bit % 32) & 1) === 1;
}

function remainingInfo(s) {
  const charging = s.current < -0.05;
  const discharging = s.current > 0.05;
  const absI = Math.abs(s.current);
  if (charging) {
    if (s.chTimeRemain > 0) return { kind: "charge", min: s.chTimeRemain, est: false };
    if (absI > 0.1 && s.packPhysicsAh > s.packRemainAh) {
      return { kind: "charge", min: ((s.packPhysicsAh - s.packRemainAh) / absI) * 60, est: true };
    }
  } else if (discharging) {
    if (s.disTimeRemain > 0) return { kind: "discharge", min: s.disTimeRemain, est: false };
    if (absI > 0.1) return { kind: "discharge", min: (s.packRemainAh / absI) * 60, est: true };
  }
  return null;
}

/* ---------- rendering ---------- */

function render(s) {
  state.snapshot = s;
  const lang = state.lang;

  // SOC gauge + level color
  const protBits = activeBits(s.protectMask, s.protectMask1, PROTECT_TEXT.en.length);
  const faultBits = protBits.filter((b) => !INFO_PROTECT_BITS.has(b));
  const level = faultBits.length || s.soc <= 10 ? "critical" : s.soc <= 25 ? "warning" : "good";
  $("socCard").dataset.level = level;
  $("socValue").textContent = s.soc;
  setGauge(s.soc / 100);
  $("battGauge").setAttribute("aria-label", `${t(lang, "gaugeAria")}: ${s.soc} %`);

  // state chip
  const chip = $("stateChip");
  let kind;
  let icon;
  let text;
  if (faultBits.length || s.systemState === 5) {
    kind = "fault"; icon = ICONS.warn; text = SYSTEM_STATE_TEXT[lang][5];
  } else if (hasBit(s, 17)) {
    kind = "charge"; icon = ICONS.check; text = t(lang, "stateFull");
  } else if (s.systemState === 2) {
    kind = "charge"; icon = ICONS.bolt; text = SYSTEM_STATE_TEXT[lang][2];
  } else if (s.systemState === 4) {
    kind = "discharge"; icon = ICONS.arrow; text = SYSTEM_STATE_TEXT[lang][4];
  } else {
    kind = "idle"; icon = ICONS.pause;
    text = SYSTEM_STATE_TEXT[lang][s.systemState] ?? SYSTEM_STATE_TEXT[lang][1];
  }
  chip.dataset.kind = kind;
  $("stateIcon").innerHTML = icon;
  $("stateText").textContent = text;

  // meta
  $("sohValue").textContent = `${s.soh} %`;
  $("capValue").textContent = `${fmt(s.packRemainAh, 1)} / ${fmt(s.packPhysicsAh, 0)} Ah`;
  $("chemValue").textContent = BATTERY_TYPE_TEXT[lang][s.batteryType] ?? "—";

  // KPIs (signed current/power, straight from the BMS)
  $("voltValue").textContent = fmt(s.packVoltage, 2);
  $("currValue").textContent = fmt(s.current, 1);
  $("currFlow").textContent =
    s.current < -0.05 ? t(lang, "flowIn") : s.current > 0.05 ? t(lang, "flowOut") : t(lang, "flowNone");
  if (Math.abs(s.packPower) >= 1000) {
    $("powerValue").textContent = fmt(s.packPower / 1000, 2);
    $("powerUnit").textContent = "kW";
  } else {
    $("powerValue").textContent = fmt(s.packPower, 0);
    $("powerUnit").textContent = "W";
  }

  // remaining time
  const remain = remainingInfo(s);
  const block = $("remainBlock");
  block.hidden = false;
  if (remain) {
    $("remainLabel").textContent =
      remain.kind === "charge" ? t(lang, "remainCharge") : t(lang, "remainDischarge");
    $("remainValue").textContent =
      formatMinutes(remain.min) + (remain.est ? ` (${t(lang, "estimatedTag")})` : "");
  } else {
    $("remainLabel").textContent = t(lang, "remainNoFlow");
    $("remainValue").textContent = "—";
  }

  renderCells(s);
  renderTemps(s);
  renderChips(s);
  renderAlarms(s, protBits);
}

function renderCells(s) {
  const lang = state.lang;
  const grid = $("cellsGrid");
  if (state.cellTiles.length !== s.cellCount) {
    grid.textContent = "";
    state.cellTiles = [];
    for (let i = 0; i < s.cellCount; i++) {
      const tile = document.createElement("div");
      tile.className = "cell";
      tile.innerHTML =
        `<div class="cell-top"><span class="cell-idx">${i + 1}</span><span class="cell-tag"></span></div>` +
        `<div class="cell-v"><span></span><small>V</small></div>` +
        `<span class="cell-bar"><i></i></span>`;
      grid.append(tile);
      state.cellTiles.push(tile);
    }
  }
  const minIdx = s.cellVoltageMinPos - 1;
  const maxIdx = s.cellVoltageMaxPos - 1;
  const vmin = s.cellVoltageMin;
  const span = Math.max(s.cellVoltageMax - vmin, 0.004);
  state.cellTiles.forEach((tile, i) => {
    tile.querySelector(".cell-v span").textContent = fmt(s.cellVoltages[i], 3);
    // the mini bar encodes where this cell sits within the pack's spread
    const rel = Math.min(1, Math.max(0, (s.cellVoltages[i] - vmin) / span));
    tile.querySelector(".cell-bar i").style.width = `${(12 + 88 * rel).toFixed(1)}%`;
    tile.classList.toggle("is-min", i === minIdx);
    tile.classList.toggle("is-max", i === maxIdx && i !== minIdx);
    tile.querySelector(".cell-tag").textContent =
      i === minIdx ? t(lang, "minTag") : i === maxIdx ? t(lang, "maxTag") : "";
    const balancing = i < 32 && ((s.balanceStateBit >>> i) & 1) === 1;
    let dot = tile.querySelector(".bal-dot");
    if (balancing && !dot) {
      dot = document.createElement("span");
      dot.className = "bal-dot";
      dot.title = t(lang, "balTooltip");
      tile.querySelector(".cell-top").insertBefore(dot, tile.querySelector(".cell-tag"));
    } else if (!balancing && dot) {
      dot.remove();
    }
  });
  $("cellCount").textContent = `(${s.cellCount})`;
  const diffMv = Math.round((s.cellVoltageMax - s.cellVoltageMin) * 1000);
  $("cellStats").innerHTML =
    `<strong>Δ ${diffMv} mV</strong>` +
    `<span>${t(lang, "avgLabel")} ${fmt(s.cellVoltageAvg, 3)} V</span>`;
}

function renderTemps(s) {
  const lang = state.lang;
  const grid = $("tempsGrid");
  const labels = [
    ...s.temperatures.map((_, i) => `${t(lang, "tempPrefix")}${i + 1}`),
    t(lang, "tMos"),
    t(lang, "tBalance"),
  ];
  const values = [...s.temperatures, s.temperatureMos, s.temperatureBalance];
  if (state.tempTiles.length !== values.length) {
    grid.textContent = "";
    state.tempTiles = [];
    for (let i = 0; i < values.length; i++) {
      const tile = document.createElement("div");
      tile.className = "temp";
      tile.innerHTML = `<div class="temp-label"></div><div class="temp-v"><span></span><small> °C</small></div>`;
      grid.append(tile);
      state.tempTiles.push(tile);
    }
  }
  state.tempTiles.forEach((tile, i) => {
    tile.querySelector(".temp-label").textContent = labels[i];
    tile.querySelector(".temp-v span").textContent = fmt(values[i], 0);
  });
}

function renderChips(s) {
  const lang = state.lang;
  const chips = [];
  chips.push({
    on: s.disMosState === 1,
    label: `${t(lang, "dischargeSwitch")}: ${s.disMosState === 1 ? t(lang, "on") : t(lang, "off")}`,
  });
  chips.push({
    on: s.chMosState === 1,
    label: `${t(lang, "chargeSwitch")}: ${s.chMosState === 1 ? t(lang, "on") : t(lang, "off")}`,
  });
  if (s.balanceState > 0) {
    chips.push({ on: true, label: BALANCE_TEXT[lang][s.balanceState] ?? WARNING_TEXT[lang][25] });
  } else if (hasBit(s, 25) || hasBit(s, 28) || hasBit(s, 29)) {
    chips.push({ on: true, label: WARNING_TEXT[lang][25] });
  }
  if (hasBit(s, 20) || hasBit(s, 21) || hasBit(s, 22) || ((s.protectMask1 >>> 2) & 1)) {
    chips.push({ on: true, label: t(lang, "chipCharger") });
  }
  if (hasBit(s, 17)) chips.push({ on: true, label: t(lang, "stateFull") });
  // Remaining informational bits, shown with their own phrase.
  for (const bit of [26, 27, 35, 36, 37, 38, 39, 40, 41, 42, 44]) {
    if (hasBit(s, bit)) chips.push({ on: true, label: WARNING_TEXT[lang][bit] });
  }

  const sig = JSON.stringify(chips);
  if (sig === state.chipSig) return;
  state.chipSig = sig;
  const box = $("statusChips");
  box.textContent = "";
  for (const c of chips) {
    const el = document.createElement("span");
    el.className = `chip ${c.on ? "chip-on" : "chip-off"}`;
    el.innerHTML = `<span class="dot"></span>`;
    el.append(c.label);
    box.append(el);
  }
}

function renderAlarms(s, protBits) {
  const lang = state.lang;
  const rows = [];
  for (const bit of protBits) {
    const info = INFO_PROTECT_BITS.has(bit);
    rows.push({
      sev: info ? "warn" : "crit",
      text: PROTECT_TEXT[lang][bit],
      tag: info ? t(lang, "warningTag") : t(lang, "protectionTag"),
    });
  }
  for (const bit of activeBits(s.warningMask, s.warningMask1, WARNING_TEXT.en.length)) {
    if (STATUS_WARNING_BITS.has(bit)) continue;
    rows.push({ sev: "warn", text: WARNING_TEXT[lang][bit], tag: t(lang, "warningTag") });
  }
  if (s.chMosState > 1) {
    rows.push({
      sev: "warn",
      text: `${t(lang, "chargeBlocked")}: ${CH_MOS_TEXT[lang][s.chMosState] ?? s.chMosState}`,
      tag: t(lang, "warningTag"),
    });
  }
  if (s.disMosState > 1) {
    rows.push({
      sev: "warn",
      text: `${t(lang, "dischargeBlocked")}: ${DIS_MOS_TEXT[lang][s.disMosState] ?? s.disMosState}`,
      tag: t(lang, "warningTag"),
    });
  }

  const sig = JSON.stringify(rows);
  if (sig === state.alarmSig) return;
  state.alarmSig = sig;
  const list = $("alarmList");
  list.textContent = "";
  if (!rows.length) {
    const li = document.createElement("li");
    li.className = "ok";
    li.innerHTML = ICONS.check;
    li.append(t(lang, "allOk"));
    list.append(li);
    return;
  }
  rows.sort((a, b) => (a.sev === b.sev ? 0 : a.sev === "crit" ? -1 : 1));
  for (const row of rows) {
    const li = document.createElement("li");
    li.className = row.sev;
    li.innerHTML = row.sev === "crit" ? ICONS.warn : ICONS.warnOutline;
    li.append(row.text);
    const tag = document.createElement("span");
    tag.className = "sev-tag";
    tag.textContent = row.tag;
    li.append(tag);
    list.append(li);
  }
}

/* ---------- modes ---------- */

function status(msgKey) {
  const el = $("statusLine");
  if (!msgKey) {
    el.hidden = true;
    el.textContent = "";
    delete el.dataset.key;
  } else {
    el.hidden = false;
    el.textContent = t(state.lang, msgKey);
    el.dataset.key = msgKey;
  }
}

function setMode(mode) {
  state.mode = mode;
  const dash = mode === "live" || mode === "demo";
  $("welcome").hidden = dash;
  $("dashboard").hidden = !dash;
  $("btnDisconnect").hidden = !dash;
  $("btnDisconnect").textContent = t(state.lang, mode === "demo" ? "btnDemoStop" : "btnDisconnect");
  $("demoBadge").hidden = mode !== "demo";
  $("demoNote").hidden = mode !== "demo";
  const name = mode === "live" ? state.client?.name : "";
  $("deviceName").hidden = !name;
  $("deviceName").textContent = name ?? "";
  $("btnConnect").disabled = mode === "connecting";
  $("btnConnect").textContent = t(state.lang, mode === "connecting" ? "connecting" : "btnConnect");
  if (dash) {
    // force list rebuild on next render (language/mode may have changed)
    state.chipSig = "";
    state.alarmSig = "";
  }
}

function stopDemo() {
  if (state.demoTimer) {
    clearInterval(state.demoTimer);
    state.demoTimer = null;
  }
}

function startDemo() {
  state.client?.disconnect();
  stopDemo();
  state.demo ??= new DemoBattery();
  state.demoTick = 0;
  status(null);
  setMode("demo");
  const tick = () => {
    const { frames } = findFrames(state.demo.frame(state.demoTick++));
    for (const frame of frames) render(decodeRealtime(frame));
  };
  tick();
  state.demoTimer = setInterval(tick, POLL_INTERVAL_MS);
}

async function connect() {
  const support = bluetoothSupport();
  if (support !== "ok") {
    const warn = $("btWarning");
    warn.hidden = false;
    warn.dataset.key = support === "insecure" ? "btInsecure" : "btUnsupported";
    warn.textContent = t(state.lang, warn.dataset.key);
    return;
  }
  stopDemo();
  status(null);
  setMode("connecting");
  state.client = new AntBmsClient({
    onSnapshot: render,
    onDisconnect: () => {
      if (state.mode === "live") {
        setMode("idle");
        status("connectionLost");
      }
    },
    onError: (err) => console.error("decode error", err),
  });
  try {
    await state.client.connect();
    setMode("live");
  } catch (err) {
    state.client.disconnect();
    setMode("idle");
    if (err?.name !== "NotFoundError") {
      console.error(err);
      status("connectFailed");
    }
  }
}

function disconnect() {
  stopDemo();
  state.client?.disconnect();
  state.client = null;
  status(null);
  setMode("idle");
}

/* ---------- boot ---------- */

function setLang(lang) {
  state.lang = lang;
  saveLang(lang);
  Object.keys(fmtCache).forEach((k) => delete fmtCache[k]);
  applyStatic();
  setMode(state.mode);
  const warn = $("btWarning");
  if (!warn.hidden && warn.dataset.key) warn.textContent = t(lang, warn.dataset.key);
  const line = $("statusLine");
  if (!line.hidden && line.dataset.key) line.textContent = t(lang, line.dataset.key);
  if (state.snapshot) render(state.snapshot);
}

function boot() {
  applyStatic();
  initGauge();
  setMode("idle");
  $("btnLang").addEventListener("click", () => setLang(state.lang === "es" ? "en" : "es"));
  $("btnConnect").addEventListener("click", connect);
  $("btnDemo").addEventListener("click", startDemo);
  $("btnDisconnect").addEventListener("click", disconnect);

  if (bluetoothSupport() !== "ok") {
    const warn = $("btWarning");
    warn.hidden = false;
    warn.dataset.key = bluetoothSupport() === "insecure" ? "btInsecure" : "btUnsupported";
    warn.textContent = t(state.lang, warn.dataset.key);
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((err) => {
        console.warn("service worker registration failed", err);
      });
    });
  }
}

boot();
