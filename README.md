# ant-bms-web

> Zero-install, **read-only** web dashboard for ANT BMS batteries. Open a page,
> tap *Connect*, see your battery — in plain English or Spanish.
>
> 🇪🇸 Visor web para baterías con BMS ANT: sin instalar nada, de solo lectura,
> con toda la interfaz y las alarmas en español (o inglés).

![Read-only by design](https://img.shields.io/badge/BMS%20access-read--only-brightgreen.svg)
![No build step](https://img.shields.io/badge/stack-vanilla%20JS%2C%20no%20build-blue.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)

*(screenshot / GIF pending)*

## What is this?

ANT BMS batteries come with an official app that ships in Chinese by default and
buries the data under raw bitmasks. This is the opposite: a single web page for
humans —

- **Big state-of-charge gauge**, voltage / current / power with the correct sign
  (the BMS reports charging as negative current; the official app gets the power
  sign wrong).
- **Per-cell voltage grid** with min/max highlighted and the spread in mV, plus
  balancing indicators.
- **Remaining charge/discharge time**: the BMS's own fields when the firmware
  sends them, a capacity/current estimate otherwise.
- **Every protection and alarm bit (~90 of them) translated into plain
  language**, in Spanish and English — normal states (charging, switches on,
  balancing…) shown as status chips, never as alarms.
- **Demo mode**: a simulated 16S LiFePO₄ pack with a weak cell, so you can try
  everything with no battery and no Bluetooth.
- i18n: auto-detects Spanish (`navigator.language`), manual ES/EN toggle
  persisted in `localStorage`.

Plain HTML + CSS + vanilla JavaScript (ES modules). No framework, no build
step. Installable as a PWA (manifest + basic service worker).

## Browser support

Works on **Android and Windows in Chrome or Edge** (any Chromium browser with
Web Bluetooth). **iOS is not supported** — Safari has no Web Bluetooth.
Demo mode works anywhere, Firefox and Safari included.

## Run it locally

Any static file server works:

```bash
python -m http.server 8000
```

then open <http://localhost:8000>. Web Bluetooth requires a secure context:
`localhost` is fine for development; anything else must be HTTPS.

## Read-only, by design

The only frame this app ever writes to the battery is the standard real-time
read request (`7E A1 01 00 00 BE 18 55 AA 55`, cmd `0x01`, every 500 ms) — the
same one the official app sends. There is no code path that builds a settings,
control or write command, and `buildReadRequest()` refuses non-read command
codes outright.

## Tests

```bash
node --test
```

Node 18+ — no dependencies. The suite checks the CRC-16/MODBUS vector from the
spec, decodes a real captured `cmd 0x11` frame against values produced by the
reference Python decoder, exercises the frame reassembler with real "Case C"
frames (extra section + double CRC) and fragmented delivery, and keeps the
ES/EN phrase tables aligned with the protocol's bit lists.

## Status

- [x] Decoder ported from the reference implementation and verified against
  captured frames from real hardware.
- [x] Demo mode, ES/EN i18n, PWA shell.
- [ ] **End-to-end Web Bluetooth connection not yet verified against a real
  battery** — the protocol itself is hardware-verified in the spec repo, but
  this client's BLE path still needs a field test. Reports welcome.

## Protocol

The full protocol specification (framing, CRC, the three frame layouts, every
field, bit and register) lives in
**[yosle/ant-bms-ble](https://github.com/yosle/ant-bms-ble)**, together with
the reference Python decoder this one is ported from.

## Legal

Independent interoperability project, **not affiliated with or endorsed by the
ANT BMS vendor**. The protocol was documented through static analysis of the
publicly distributed official app, for the purpose of interoperating with
hardware owned by its users. This client is read-only by design and never
sends settings, control or write commands. Use at your own risk.

MIT — see [LICENSE](LICENSE).
