/* Decoder tests — no browser, no hardware. Run with: npm test
 *
 * The captured hex frames come from the protocol spec repo
 * (https://github.com/yosle/ant-bms-ble): a real cmd 0x11 frame and
 * Case C cmd 0x12 frames captured from an ANT-BLE22AAUB-YCE7 unit.
 * Expected values were produced by the Python reference decoder.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import * as p from "../js/protocol.js";
import { buildRealtimeFrame, DemoBattery } from "../js/demo.js";

const hex = (s) => Uint8Array.from(s.match(/../g), (b) => parseInt(b, 16));

// Real-time frame (cmd 0x11, 16 cells, 4 temps, remaining-time fields present).
const REALTIME_HEX =
  "7ea11100009e01040410000000000000000010008801000000000000000000000000" +
  "ca0cc40cc70ccc0cc50cc90cc30cc80ccb0cc40c9b0cc70cca0cc20cc80cc50c1b00" +
  "1d0019001e002e001c006d14b4004800620001010000402c42068090810450622500" +
  "ad0300005a7e170100000000cc0c04009b0c0b003100c40c3400340000000000f2fa" +
  "18100000541000001055220060361e0000000000000000000000fb00d3e6aa55";

// Case C frames (payload + CRC + extra section + CRC + AA 55).
const CASE_C_VOLTAGE = "7ea112000034" + "ff".repeat(52) + "49a7ff01000432010300b187aa55";
const CASE_C_VERSION =
  "7ea1126c02203232504841315442303830410000000032324141554230302d3234303531" +
  "3041ede0ff0b000041f2aa55";
const CASE_C_SYSID = "7ea112400210" + "ff".repeat(16) + "f1d3ff0100044e1209005f72aa55";

test("CRC-16/MODBUS matches the verified example from the spec", () => {
  assert.equal(p.crc16([0xa1, 0x01, 0x00, 0x00, 0xbe], 0, 5), 0x1855);
});

test("the real-time request is the fixed frame from the APK", () => {
  const expected = [0x7e, 0xa1, 0x01, 0x00, 0x00, 0xbe, 0x18, 0x55, 0xaa, 0x55];
  assert.deepEqual([...p.buildReadRequest(0, 190, 0x01)], expected);
  assert.deepEqual([...p.REALTIME_REQUEST], expected);
});

test("read-only guard refuses every write/control command", () => {
  for (const cmd of [0x22, 0x23, 0x26, 0x51, 0x53, 0x57, 0x61]) {
    assert.throws(() => p.buildReadRequest(0, 8, cmd), /read-only/);
  }
  for (const cmd of [0x01, 0x02, 0x04, 0x05]) p.buildReadRequest(0, 8, cmd);
});

test("decodes a captured real-time frame like the Python reference", () => {
  const { frames, rest } = p.findFrames(hex(REALTIME_HEX));
  assert.equal(frames.length, 1);
  assert.equal(rest.length, 0);
  assert.equal(frames[0].length, 168);

  const s = p.decodeRealtime(frames[0]);
  assert.equal(s.cellCount, 16);
  assert.equal(s.temperatureNum, 4);
  assert.deepEqual(s.cellVoltages, [
    3.274, 3.268, 3.271, 3.276, 3.269, 3.273, 3.267, 3.272,
    3.275, 3.268, 3.227, 3.271, 3.274, 3.266, 3.272, 3.269,
  ]);
  assert.deepEqual(s.temperatures, [27, 29, 25, 30]);
  assert.equal(s.temperatureMos, 46);
  assert.equal(s.temperatureBalance, 28);
  assert.equal(s.packVoltage, 52.29);
  assert.equal(s.current, 18.0);
  assert.equal(s.soc, 72);
  assert.equal(s.soh, 98);
  assert.equal(s.packPhysicsAh, 105.0);
  assert.equal(s.packRemainAh, 75.6);
  assert.equal(s.packAllAh, 2450.0);
  assert.equal(s.packPower, 941);
  assert.equal(s.cellVoltageMax, 3.276);
  assert.equal(s.cellVoltageMaxPos, 4);
  assert.equal(s.cellVoltageMin, 3.227);
  assert.equal(s.cellVoltageMinPos, 11);
  assert.equal(s.cellVoltageDiff, 0.049);
  assert.equal(s.cellVoltageAvg, 3.268);
  assert.equal(s.batteryTypeName, "LiFePO4");
  assert.equal(s.systemStateName, "discharge");
  assert.equal(s.disMosStateName, "open");
  assert.equal(s.chMosStateName, "open");
  assert.equal(s.chTimeRemain, 0);
  assert.equal(s.disTimeRemain, 251);
  assert.deepEqual(s.protections, []);
  assert.deepEqual(s.warnings, [
    "cell_diff_warning", "discharging", "charge_mos_on", "discharge_mos_on",
  ]);
});

test("generator/decoder round trip (signed current, power and masks)", () => {
  const frame = buildRealtimeFrame([3.301, 3.302, 3.3, 3.303], [25, -5], {
    current: -12.3,
    soc: 87,
    power: -353,
    protectMask: (1 << 1) | (1 << 16),
    warningMask: 1 << 18,
    chTimeRemainMin: 90,
    disTimeRemainMin: 120,
  });
  const s = p.decodeRealtime(frame);
  assert.deepEqual(s.cellVoltages, [3.301, 3.302, 3.3, 3.303]);
  assert.deepEqual(s.temperatures, [25, -5]);
  assert.equal(s.packVoltage, 13.21);
  assert.equal(s.current, -12.3);
  assert.equal(s.packPower, -353);
  assert.equal(s.soc, 87);
  assert.equal(s.cellVoltageMax, 3.303);
  assert.equal(s.cellVoltageMaxPos, 4);
  assert.equal(s.cellVoltageMin, 3.3);
  assert.equal(s.cellVoltageMinPos, 3);
  assert.ok(s.protections.includes("cell_high_protect"));
  assert.ok(s.protections.includes("short_circuit_protect"));
  assert.ok(s.warnings.includes("battery_charging"));
  assert.equal(s.chTimeRemain, 90);
  assert.equal(s.disTimeRemain, 120);
});

test("reassembles a frame delivered in 7-byte BLE notifications", () => {
  const frame = hex(REALTIME_HEX);
  let buffer = new Uint8Array(0);
  const got = [];
  for (let i = 0; i < frame.length; i += 7) {
    const chunk = frame.slice(i, i + 7);
    const merged = new Uint8Array(buffer.length + chunk.length);
    merged.set(buffer);
    merged.set(chunk, buffer.length);
    const { frames, rest } = p.findFrames(merged);
    buffer = rest;
    got.push(...frames);
  }
  assert.equal(got.length, 1);
  assert.deepEqual([...got[0]], [...frame]);
  assert.equal(buffer.length, 0);
});

test("skips garbage before the header and rejects a corrupted CRC", () => {
  const frame = hex(REALTIME_HEX);
  const noisy = new Uint8Array([0x00, 0x11, 0x22, ...frame]);
  const { frames, rest } = p.findFrames(noisy);
  assert.equal(frames.length, 1);
  assert.equal(rest.length, 0);

  const bad = hex(REALTIME_HEX);
  bad[10] ^= 0xff;
  assert.equal(p.findFrames(bad).frames.length, 0);
});

test("accepts real Case C frames (payload CRC + extra section + extra CRC)", () => {
  for (const [raw, totalLen] of [
    [CASE_C_VOLTAGE, 72],
    [CASE_C_VERSION, 48],
    [CASE_C_SYSID, 36],
  ]) {
    const { frames, rest } = p.findFrames(hex(raw));
    assert.equal(frames.length, 1, `frame of ${totalLen} bytes`);
    assert.equal(rest.length, 0);
    assert.equal(frames[0].length, totalLen);
  }
});

test("waits for more bytes on an incomplete Case C frame", () => {
  const { frames, rest } = p.findFrames(hex(CASE_C_VOLTAGE).slice(0, 40));
  assert.equal(frames.length, 0);
  assert.equal(rest.length, 40);
});

test("rejects a Case C frame with a corrupted extra-section CRC", () => {
  const raw = hex(CASE_C_VOLTAGE);
  raw[68] ^= 0xff;
  assert.equal(p.findFrames(raw).frames.length, 0);
});

test("two concatenated frames decode as two frames", () => {
  const a = hex(REALTIME_HEX);
  const b = hex(CASE_C_VOLTAGE);
  const merged = new Uint8Array([...a, ...b]);
  const { frames, rest } = p.findFrames(merged);
  assert.equal(frames.length, 2);
  assert.equal(rest.length, 0);
});

test("demo battery: deterministic, 16S, weak cell trips the diff warning", () => {
  const demo = new DemoBattery();
  assert.deepEqual([...demo.frame(90)], [...demo.frame(90)]);

  // tick 90 -> discharging hard; the weak cell (11) sags and trips the alarm
  const dis = p.decodeRealtime(demo.frame(90));
  assert.equal(dis.cellCount, 16);
  assert.equal(dis.systemState, 4);
  assert.ok(dis.current > 0);
  assert.ok(dis.packPower > 0);
  assert.equal(dis.cellVoltageMinPos, 11);
  assert.ok(dis.warnings.includes("discharging"));
  assert.ok(dis.warnings.includes("cell_diff_warning"));
  assert.ok(dis.disTimeRemain > 0);

  // tick 30 -> charging; current and power are negative
  const ch = p.decodeRealtime(demo.frame(30));
  assert.equal(ch.systemState, 2);
  assert.ok(ch.current < 0);
  assert.ok(ch.packPower < 0);
  assert.ok(ch.warnings.includes("battery_charging"));
  assert.ok(ch.chTimeRemain > 0);
});
