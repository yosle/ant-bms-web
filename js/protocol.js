/* ANT BMS protocol (read-only) — pure decoder, no BLE and no DOM.
 *
 * Direct port of the Python reference implementation in
 * https://github.com/yosle/ant-bms-ble (src/antbms/protocol.py).
 * See PROTOCOL.md there for the full specification.
 */

export const SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
export const CHAR_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";
export const DEVICE_NAME_PREFIX = "ANT-BLE";

// Read-only client: only these command codes may ever be sent.
// 0x01 real-time, 0x02 read parameter block, 0x04 read chip id, 0x05 read info.
export const READ_COMMANDS = new Set([0x01, 0x02, 0x04, 0x05]);

// CRC16 tables copied from the vendor APK (standard CRC-16/MODBUS pair).
const R = [
  0, 193, 129, 64, 1, 192, 128, 65, 1, 192, 128, 65, 0, 193, 129, 64,
  1, 192, 128, 65, 0, 193, 129, 64, 0, 193, 129, 64, 1, 192, 128, 65,
  1, 192, 128, 65, 0, 193, 129, 64, 0, 193, 129, 64, 1, 192, 128, 65,
  0, 193, 129, 64, 1, 192, 128, 65, 1, 192, 128, 65, 0, 193, 129, 64,
  1, 192, 128, 65, 0, 193, 129, 64, 0, 193, 129, 64, 1, 192, 128, 65,
  0, 193, 129, 64, 1, 192, 128, 65, 1, 192, 128, 65, 0, 193, 129, 64,
  0, 193, 129, 64, 1, 192, 128, 65, 1, 192, 128, 65, 0, 193, 129, 64,
  1, 192, 128, 65, 0, 193, 129, 64, 0, 193, 129, 64, 1, 192, 128, 65,
  1, 192, 128, 65, 0, 193, 129, 64, 0, 193, 129, 64, 1, 192, 128, 65,
  0, 193, 129, 64, 1, 192, 128, 65, 1, 192, 128, 65, 0, 193, 129, 64,
  0, 193, 129, 64, 1, 192, 128, 65, 1, 192, 128, 65, 0, 193, 129, 64,
  1, 192, 128, 65, 0, 193, 129, 64, 0, 193, 129, 64, 1, 192, 128, 65,
  0, 193, 129, 64, 1, 192, 128, 65, 1, 192, 128, 65, 0, 193, 129, 64,
  1, 192, 128, 65, 0, 193, 129, 64, 0, 193, 129, 64, 1, 192, 128, 65,
  1, 192, 128, 65, 0, 193, 129, 64, 0, 193, 129, 64, 1, 192, 128, 65,
  0, 193, 129, 64, 1, 192, 128, 65, 1, 192, 128, 65, 0, 193, 129, 64,
];

const O = [
  0, 192, 193, 1, 195, 3, 2, 194, 198, 6, 7, 199, 5, 197, 196, 4,
  204, 12, 13, 205, 15, 207, 206, 14, 10, 202, 203, 11, 201, 9, 8, 200,
  216, 24, 25, 217, 27, 219, 218, 26, 30, 222, 223, 31, 221, 29, 28, 220,
  20, 212, 213, 21, 215, 23, 22, 214, 210, 18, 19, 211, 17, 209, 208, 16,
  240, 48, 49, 241, 51, 243, 242, 50, 54, 246, 247, 55, 245, 53, 52, 244,
  60, 252, 253, 61, 255, 63, 62, 254, 250, 58, 59, 251, 57, 249, 248, 56,
  40, 232, 233, 41, 235, 43, 42, 234, 238, 46, 47, 239, 45, 237, 236, 44,
  228, 36, 37, 229, 39, 231, 230, 38, 34, 226, 227, 35, 225, 33, 32, 224,
  160, 96, 97, 161, 99, 163, 162, 98, 102, 166, 167, 103, 165, 101, 100, 164,
  108, 172, 173, 109, 175, 111, 110, 174, 170, 106, 107, 171, 105, 169, 168, 104,
  120, 184, 185, 121, 187, 123, 122, 186, 190, 126, 127, 191, 125, 189, 188, 124,
  180, 116, 117, 181, 119, 183, 182, 118, 114, 178, 179, 115, 177, 113, 112, 176,
  80, 144, 145, 81, 147, 83, 82, 146, 150, 86, 87, 151, 85, 149, 148, 84,
  156, 92, 93, 157, 95, 159, 158, 94, 90, 154, 155, 91, 153, 89, 88, 152,
  136, 72, 73, 137, 75, 139, 138, 74, 78, 142, 143, 79, 141, 77, 76, 140,
  68, 132, 133, 69, 135, 71, 70, 134, 130, 66, 67, 131, 65, 129, 128, 64,
];

export const SYSTEM_STATE = {
  0: "none", 1: "idle", 2: "charge", 3: "standby", 4: "discharge", 5: "exception",
};

export const BATTERY_TYPE = {
  64241: "ternary", 64242: "LiFePO4", 64243: "LTO",
  64244: "custom", 64245: "none", 64246: "sodium",
};

export const DIS_MOS_STATE = [
  "close", "open", "cell_low_vol", "current_protect", "two_current_exceed",
  "all_undervoltage", "battery_exceed_temp", "power_exceed_temp",
  "current_exception", "balance_loose", "board_over_temp", "charge_open",
  "short_circuit_protect", "discharge_tube_exception", "open_failed",
  "manual_close", "discharge_2_low_vol", "low_temp_protect",
  "vol_diff_exceed", "self_detect_error",
];

export const CH_MOS_STATE = [
  "close", "open", "cell_over_vol", "current_protect", "battery_full",
  "total_vol_exceed", "battery_exceed_temp", "power_exceed_temp",
  "current_exception", "balance_loose", "board_over_temp", "open_failed",
  "discharge_tube_exception", "waiting", "manual_close", "two_level_exceed_vol",
  "low_temp_protect", "vol_diff_exceed", "self_detect_error",
];

export const BALANCE_STATE = [
  "close", "extreme_bal", "charge_vol_diff", "balance_exceed_temp",
  "auto_balance", "manual_balance",
];

export const PROTECT_BITS = [
  "set_cell_type", "cell_high_protect", "level2_cell_high_protect",
  "pack_volt_high_protect", "cell_low_protect", "level2_cell_low_protect",
  "pack_volt_low_protect", "cell_diff_protect", "charge_high_temp_protect",
  "discharge_high_temp_protect", "mos_high_temp_protect",
  "charge_low_temp_protect", "discharge_low_temp_protect",
  "charge_overcurrent_protect", "discharge_overcurrent_protect",
  "discharge_overcurrent2_protect", "short_circuit_protect",
  "manual_off_discharge_mos1", "manual_off_discharge_mos2",
  "manual_off_discharge_mos3", "manual_off_discharge_mos4",
  "manual_off_charge_mos1", "manual_off_charge_mos2",
  "manual_off_charge_mos3", "manual_off_charge_mos4", "open_line",
  "current_error", "dis_mos_error", "chg_mos_error", "internal_comm_error",
  "precharge_failure", "starting", "check1", "check2", "charger_connected",
  "dtu_lost_protect", "prevent_ignition", "check3", "please_upgrade_firmware",
  "relay_precharge_failed", "relay_adhesion", "abnormal_dischg_fuse",
  "abnormal_chg_fuse", "module_loss", "device_expiration",
];

export const WARNING_BITS = [
  "cell_high_warning", "pack_volt_high_warning", "cell_low_warning",
  "pack_volt_low_warning", "cell_diff_warning", "charge_high_temp_warning",
  "discharge_high_temp_warning", "charge_low_temp_warning",
  "discharge_low_temp_warning", "mos_high_temp_warning",
  "charge_overcurrent_warning", "discharge_overcurrent_warning",
  "soc_low_level1_warning", "soc_low_level2_warning", "cell_volt_check_wrong",
  "cell_number_wrong", "precharge_failure", "battery_full", "battery_charging",
  "discharging", "can_charger_in", "rs485_charger_in", "charger_in",
  "charge_mos_on", "discharge_mos_on", "balance_on", "sleep",
  "balance_limit", "balance_diff", "auto_balance", "balance_high_temp",
  "cell_pack_volt_related_protect", "temp_protect", "system_error", "dtu_lost",
  "balance_test", "electric_heating", "forcing_output", "bluetooth_off",
  "relay_precharging", "mos_precharging", "charging_relay_on",
  "discharge_relay_on", "xtal_error", "force_charging",
];

export function crc16(buf, start, length) {
  let s = 0xff;
  let n = 0xff;
  let c = 0;
  while (length-- > 0) {
    const i = (s ^ buf[start + c]) & 0xff;
    s = (n ^ R[i]) & 0xff;
    n = O[i];
    c++;
  }
  return ((s << 8) | n) & 0xffff;
}

export function buildReadRequest(addr, length, cmd) {
  if (!READ_COMMANDS.has(cmd)) {
    throw new Error(
      `refusing non-read command 0x${cmd.toString(16)} (this client is read-only)`
    );
  }
  const frame = new Uint8Array(10);
  frame.set([0x7e, 0xa1, cmd & 0xff, addr & 0xff, (addr >> 8) & 0xff, length & 0xff]);
  const crc = crc16(frame, 1, 5);
  frame[6] = (crc >> 8) & 0xff;
  frame[7] = crc & 0xff;
  frame[8] = 0xaa;
  frame[9] = 0x55;
  return frame;
}

// The ONLY frame this client ever writes to the BMS: the cmd 0x01 real-time
// read request (7E A1 01 00 00 BE 18 55 AA 55), sent every 500 ms.
export const REALTIME_REQUEST = buildReadRequest(0, 190, 0x01);
export const POLL_INTERVAL_MS = 500;

/* Reassemble new-protocol frames from a byte stream.
 *
 * Mirrors the vendor app parser (AntProtocol_RxBufFindBmsPort):
 *   Case A: cmd < 16  -> short frame, fixed 10 bytes, no payload.
 *   Case B: header(6) + payload(r) + crc(2) + AA 55            -> 10+r bytes
 *   Case C: header(6) + payload(r) + crc(2) + extra(4+h)
 *           + crc(2) + AA 55                                   -> 16+r+h bytes
 * where r = buf[5] and h = buf[11+r].
 *
 * Returns { frames, rest } where rest is the unconsumed tail.
 */
export function findFrames(buffer) {
  const buf = buffer instanceof Uint8Array ? buffer : Uint8Array.from(buffer);
  const frames = [];
  let i = 0;
  let n = buf.length;

  while (n >= 10) {
    if (buf[i] !== 0x7e || buf[i + 1] !== 0xa1) { i++; n--; continue; }
    const cmd = buf[i + 2];
    let total;
    if (cmd < 16) {
      // Case A: short frame, 10 bytes, payload length 0.
      if (buf[i + 8] !== 0xaa || buf[i + 9] !== 0x55) { i++; n--; continue; }
      if (crc16(buf, i + 1, 5) !== ((buf[i + 6] << 8) | buf[i + 7])) { i++; n--; continue; }
      total = 10;
    } else {
      const r = buf[i + 5];
      if (r > 192 || n < 10 + r) break;
      if (buf[i + 8 + r] === 0xaa && buf[i + 9 + r] === 0x55) {
        // Case B: payload + crc + AA 55
        if (crc16(buf, i + 1, 5 + r) !== ((buf[i + 6 + r] << 8) | buf[i + 7 + r])) {
          i++; n--; continue;
        }
        total = 10 + r;
      } else {
        // Case C: payload + crc + extra section + crc + AA 55
        if (n < 12 + r) break;
        const h = buf[i + 11 + r];
        total = 16 + r + h;
        if (n < total) break;
        if (buf[i + 14 + r + h] !== 0xaa || buf[i + 15 + r + h] !== 0x55) {
          i++; n--; continue;
        }
        if (crc16(buf, i + 1, 5 + r) !== ((buf[i + 6 + r] << 8) | buf[i + 7 + r])) {
          i++; n--; continue;
        }
        if (crc16(buf, i + 8 + r, 4 + h) !== ((buf[i + total - 4] << 8) | buf[i + total - 3])) {
          i++; n--; continue;
        }
      }
    }
    frames.push(buf.slice(i, i + total));
    i += total;
    n -= total;
  }
  return { frames, rest: buf.slice(i) };
}

export function unsignToSign(v) {
  return v > 32767.5 ? v - 65536 : v;
}

function u16le(b, o) {
  return b[o] | (b[o + 1] << 8);
}

function u32le(b, o) {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
}

function u32leSigned(b, o) {
  const v = u32le(b, o);
  return v > 0x7fffffff ? v - 0x100000000 : v;
}

function bits(mask, mask1, names) {
  const out = [];
  for (let bit = 0; bit < 64; bit++) {
    const value = bit < 32 ? mask : mask1;
    if ((value >>> (bit % 32)) & 1) {
      out.push(bit < names.length ? names[bit] : `bit${bit}`);
    }
  }
  return out;
}

function name(table, index) {
  return index >= 0 && index < table.length ? table[index] : String(index);
}

/* Decode a new-protocol real-time response (cmd 0x11). */
export function decodeRealtime(frame) {
  const b = frame;
  if (b.length < 10 || b[0] !== 0x7e || b[1] !== 0xa1) {
    throw new Error("not a new-protocol frame");
  }
  if (b[2] !== 0x11) {
    throw new Error(`unexpected cmd 0x${b[2].toString(16)}, expected 0x11`);
  }

  let e = 6;
  const out = {};
  out.sysOperatingAut = b[e]; e += 1;
  out.systemState = b[e]; e += 1;
  const tempNum = b[e]; e += 1;
  const cellCount = b[e]; e += 1;
  out.temperatureNum = tempNum;
  out.cellCount = cellCount;
  out.protectMask = u32le(b, e); e += 4;
  out.protectMask1 = u32le(b, e); e += 4;
  out.warningMask = u32le(b, e); e += 4;
  out.warningMask1 = u32le(b, e); e += 4;
  e += 8; // reserved

  const cells = [];
  for (let k = 0; k < cellCount; k++) { cells.push(u16le(b, e) / 1000); e += 2; }
  out.cellVoltages = cells;

  const temps = [];
  for (let k = 0; k < tempNum; k++) { temps.push(unsignToSign(u16le(b, e))); e += 2; }
  out.temperatures = temps;

  out.temperatureMos = unsignToSign(u16le(b, e)); e += 2;
  out.temperatureBalance = unsignToSign(u16le(b, e)); e += 2;
  out.packVoltage = u16le(b, e) / 100; e += 2;
  out.current = unsignToSign(u16le(b, e)) / 10; e += 2;
  out.soc = u16le(b, e); e += 2;
  out.soh = u16le(b, e); e += 2;
  out.disMosState = b[e]; e += 1;
  out.chMosState = b[e]; e += 1;
  out.balanceState = u16le(b, e); e += 2;
  out.packPhysicsAh = u32le(b, e) / 1e6; e += 4;
  out.packRemainAh = u32le(b, e) / 1e6; e += 4;
  out.packAllAh = u32le(b, e) / 1e3; e += 4;
  out.packPower = u32leSigned(b, e); e += 4;
  out.allTimerS = u32le(b, e); e += 4;
  out.balanceStateBit = u32le(b, e); e += 4;
  out.cellVoltageMax = u16le(b, e) / 1000; e += 2;
  out.cellVoltageMaxPos = u16le(b, e); e += 2;
  out.cellVoltageMin = u16le(b, e) / 1000; e += 2;
  out.cellVoltageMinPos = u16le(b, e); e += 2;
  out.cellVoltageDiff = u16le(b, e) / 1000; e += 2;
  out.cellVoltageAvg = u16le(b, e) / 1000; e += 2;
  out.voltageDS = u16le(b, e); e += 2;
  out.voltageDisMos = u16le(b, e); e += 2;
  out.voltageChMos = u16le(b, e); e += 2;
  out.voltageNhMos = u16le(b, e); e += 2;
  out.batteryType = u16le(b, e); e += 2;
  out.packAllDisAh = u32le(b, e); e += 4;
  out.packAllChAh = u32le(b, e); e += 4;
  out.allDisTimerS = u32le(b, e); e += 4;
  out.allChTimerS = u32le(b, e); e += 4;

  // Conditional remaining-time fields (see PROTOCOL.md).
  if (b[5] > 2 * tempNum + 2 * cellCount + 106 && e + 12 <= b.length) {
    out.newChTime = u32le(b, e); e += 4;
    out.chTimeInterval = u32le(b, e); e += 4;
    out.chTimeRemain = u16le(b, e); e += 2;   // minutes
    out.disTimeRemain = u16le(b, e); e += 2;  // minutes
  }

  out.systemStateName = SYSTEM_STATE[out.systemState] ?? String(out.systemState);
  out.batteryTypeName = BATTERY_TYPE[out.batteryType] ?? String(out.batteryType);
  out.disMosStateName = name(DIS_MOS_STATE, out.disMosState);
  out.chMosStateName = name(CH_MOS_STATE, out.chMosState);
  out.balanceStateName = name(BALANCE_STATE, out.balanceState);
  out.protections = bits(out.protectMask, out.protectMask1, PROTECT_BITS);
  out.warnings = bits(out.warningMask, out.warningMask1, WARNING_BITS);
  return out;
}
