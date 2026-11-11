/* Regenerates the docs/ screenshots with headless Chrome over CDP.
 * No dependencies (uses Node's global fetch + WebSocket, Node 22+).
 *
 *   node tools/shoot.mjs [chrome.exe path]
 *
 * Expects the app served at http://localhost:8000 (python -m http.server).
 */

import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "http://localhost:8000";
const PORT = 9333;

const SHOTS = [
  {
    out: "docs/screenshot-desktop.png",
    url: `${BASE}/?demo=90&lang=en&theme=dark`,
    width: 1280, height: 900, dsf: 2, mobile: false,
  },
  {
    out: "docs/screenshot-mobile.png",
    url: `${BASE}/?demo=20&lang=es&theme=light`,
    width: 390, height: 844, dsf: 2, mobile: true,
  },
  {
    // Runs last: it embeds the two captures above into device frames.
    out: "docs/screens-framed.png",
    url: `${BASE}/tools/compose.html`,
    width: 1520, height: 960, dsf: 1.5, mobile: false, transparent: true,
  },
  {
    // GitHub social preview (Settings -> Social preview takes 1280x640).
    out: "docs/social-preview.png",
    url: `${BASE}/tools/social-preview.html`,
    width: 1280, height: 640, dsf: 2, mobile: false,
  },
];

const CHROME =
  process.argv[2] ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForCdp() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error("Chrome DevTools endpoint never came up");
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const events = new Map();
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method && events.has(msg.method)) {
      events.get(msg.method)();
      events.delete(msg.method);
    }
  });
  return {
    ready: new Promise((r) => ws.addEventListener("open", r)),
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      }),
    once: (method) => new Promise((r) => events.set(method, r)),
    close: () => ws.close(),
  };
}

const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${join(tmpdir(), "antbms-shots-profile")}`,
  "about:blank",
], { stdio: "ignore" });

try {
  const cdp = connect(await waitForCdp());
  await cdp.ready;
  await cdp.send("Page.enable");

  for (const shot of SHOTS) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: shot.width,
      height: shot.height,
      deviceScaleFactor: shot.dsf,
      mobile: shot.mobile,
    });
    if (shot.transparent) {
      await cdp.send("Emulation.setDefaultBackgroundColorOverride", {
        color: { r: 0, g: 0, b: 0, a: 0 },
      });
    }
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url: shot.url });
    await loaded;
    await sleep(2000); // webfonts, demo render, segment transitions
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
    if (shot.transparent) {
      await cdp.send("Emulation.setDefaultBackgroundColorOverride", {});
    }
    const file = join(root, shot.out);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(data, "base64"));
    console.log("wrote", shot.out, `${shot.width}x${shot.height}@${shot.dsf}x`);
  }
  cdp.close();
} finally {
  chrome.kill();
}
