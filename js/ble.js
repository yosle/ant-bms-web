/* Web Bluetooth transport for ANT BMS — strictly read-only.
 *
 * The ONLY frame this module ever writes to the battery is the fixed
 * cmd 0x01 real-time read request (7E A1 01 00 00 BE 18 55 AA 55),
 * sent every 500 ms. No settings, control or write command exists here.
 */

import {
  SERVICE_UUID,
  CHAR_UUID,
  DEVICE_NAME_PREFIX,
  REALTIME_REQUEST,
  POLL_INTERVAL_MS,
  findFrames,
  decodeRealtime,
} from "./protocol.js";

/* "ok" | "insecure" (needs HTTPS/localhost) | "unsupported" (no Web Bluetooth) */
export function bluetoothSupport() {
  if (!("bluetooth" in navigator)) return "unsupported";
  if (!window.isSecureContext) return "insecure";
  return "ok";
}

export class AntBmsClient {
  constructor({ onSnapshot, onDisconnect, onError } = {}) {
    this.onSnapshot = onSnapshot;
    this.onDisconnect = onDisconnect;
    this.onError = onError;
    this.device = null;
    this.char = null;
    this._timer = null;
    this._writing = false;
    this._buffer = new Uint8Array(0);
    this._lastFrameAt = 0;
    this._boundNotify = (e) => this._onNotify(e.target.value);
    this._boundLost = () => this._onLost();
  }

  get name() {
    return this.device?.name ?? "";
  }

  /* Must be called from a user gesture (button click). */
  async connect() {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: DEVICE_NAME_PREFIX }],
      optionalServices: [SERVICE_UUID],
    });
    this.device = device;
    device.addEventListener("gattserverdisconnected", this._boundLost);
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    this.char = await service.getCharacteristic(CHAR_UUID);
    this.char.addEventListener("characteristicvaluechanged", this._boundNotify);
    await this.char.startNotifications();
    this._buffer = new Uint8Array(0);
    this._lastFrameAt = Date.now();
    this._timer = setInterval(() => this._poll(), POLL_INTERVAL_MS);
    this._poll();
  }

  async _poll() {
    if (!this.char || this._writing) return;
    // The BLE link is fragile: if no valid frame arrived for a while, drop
    // the reassembly buffer so a corrupted header cannot wedge the parser.
    if (this._buffer.length && Date.now() - this._lastFrameAt > 4000) {
      this._buffer = new Uint8Array(0);
    }
    this._writing = true;
    try {
      await this.char.writeValueWithResponse(REALTIME_REQUEST);
    } catch {
      // Write failed (link dropping); gattserverdisconnected does the cleanup.
    } finally {
      this._writing = false;
    }
  }

  _onNotify(value) {
    const chunk = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    const merged = new Uint8Array(this._buffer.length + chunk.length);
    merged.set(this._buffer);
    merged.set(chunk, this._buffer.length);
    const { frames, rest } = findFrames(merged);
    this._buffer = rest.length > 1024 ? new Uint8Array(0) : rest;
    for (const frame of frames) {
      this._lastFrameAt = Date.now();
      if (frame[2] === 0x11) {
        try {
          this.onSnapshot?.(decodeRealtime(frame));
        } catch (err) {
          this.onError?.(err);
        }
      }
    }
  }

  _onLost() {
    this._cleanup();
    this.onDisconnect?.();
  }

  disconnect() {
    const device = this.device;
    this._cleanup();
    if (device?.gatt?.connected) device.gatt.disconnect();
  }

  _cleanup() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this.char?.removeEventListener("characteristicvaluechanged", this._boundNotify);
    this.device?.removeEventListener("gattserverdisconnected", this._boundLost);
    this.char = null;
    this.device = null;
    this._buffer = new Uint8Array(0);
  }
}
