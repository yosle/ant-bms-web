/* Synthetic ANT BMS data for the demo mode.
 *
 * Builds protocol-correct cmd 0x11 frames (CRC included) so the whole
 * pipeline — reassembly, decoding, UI — runs without any hardware.
 * The simulation is deterministic: the same tick always produces the
 * same frame. Port of src/antbms/demo.py from the reference repo.
 */

import { crc16 } from "./protocol.js";

function u16le(v) {
  v = Math.round(v) & 0xffff;
  return [v & 0xff, (v >> 8) & 0xff];
}

function u32le(v) {
  v = Math.round(v) >>> 0;
  return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
}

/* Build a valid new-protocol real-time frame (cmd 0x11). */
export function buildRealtimeFrame(cells, temps, opts = {}) {
  const o = {
    systemState: 4,
    protectMask: 0,
    protectMask1: 0,
    warningMask: 0,
    warningMask1: 0,
    tempMos: 32,
    tempBalance: 29,
    current: -12.3,
    soc: 87,
    soh: 99,
    disMos: 1,
    chMos: 1,
    balanceState: 0,
    physicsAh: 105.0,
    remainAh: 87.5,
    allAh: 2450.0,
    power: 0,
    timerS: 3600,
    balanceBit: 0,
    batteryType: 64242,
    allDisAh: 4120,
    allChAh: 4180,
    disTimerS: 2250000,
    chTimerS: 1980000,
    chTimeRemainMin: 0,
    disTimeRemainMin: 0,
    ...opts,
  };

  const vmax = Math.max(...cells);
  const vmin = Math.min(...cells);
  const sum = cells.reduce((a, v) => a + v, 0);

  const payload = [];
  payload.push(1, o.systemState, temps.length, cells.length);
  payload.push(...u32le(o.protectMask), ...u32le(o.protectMask1));
  payload.push(...u32le(o.warningMask), ...u32le(o.warningMask1));
  payload.push(0, 0, 0, 0, 0, 0, 0, 0);
  for (const v of cells) payload.push(...u16le(v * 1000));
  for (const t of temps) payload.push(...u16le(t >= 0 ? t : t + 65536));
  payload.push(...u16le(o.tempMos));
  payload.push(...u16le(o.tempBalance));
  payload.push(...u16le(sum * 100));
  payload.push(...u16le(o.current >= 0 ? o.current * 10 : o.current * 10 + 65536));
  payload.push(...u16le(o.soc));
  payload.push(...u16le(o.soh));
  payload.push(o.disMos, o.chMos);
  payload.push(...u16le(o.balanceState));
  payload.push(...u32le(o.physicsAh * 1e6));
  payload.push(...u32le(o.remainAh * 1e6));
  payload.push(...u32le(o.allAh * 1e3));
  payload.push(...u32le(o.power));
  payload.push(...u32le(o.timerS));
  payload.push(...u32le(o.balanceBit));
  payload.push(...u16le(vmax * 1000));
  payload.push(...u16le(cells.indexOf(vmax) + 1));
  payload.push(...u16le(vmin * 1000));
  payload.push(...u16le(cells.indexOf(vmin) + 1));
  payload.push(...u16le((vmax - vmin) * 1000));
  payload.push(...u16le((sum / cells.length) * 1000));
  payload.push(...u16le(Math.trunc(sum)));
  payload.push(...u16le(Math.trunc(sum)));
  payload.push(...u16le(0));
  payload.push(...u16le(0));
  payload.push(...u16le(o.batteryType));
  payload.push(...u32le(o.allDisAh));
  payload.push(...u32le(o.allChAh));
  payload.push(...u32le(o.disTimerS));
  payload.push(...u32le(o.chTimerS));
  payload.push(...u32le(0));
  payload.push(...u32le(0));
  payload.push(...u16le(o.chTimeRemainMin));
  payload.push(...u16le(o.disTimeRemainMin));

  const frame = new Uint8Array(6 + payload.length + 4);
  frame.set([0x7e, 0xa1, 0x11, 0x00, 0x00, payload.length]);
  frame.set(payload, 6);
  const crc = crc16(frame, 1, 5 + payload.length);
  frame[6 + payload.length] = (crc >> 8) & 0xff;
  frame[7 + payload.length] = crc & 0xff;
  frame[8 + payload.length] = 0xaa;
  frame[9 + payload.length] = 0x55;
  return frame;
}

/* A simulated 16S LiFePO4 pack cycling through charge and discharge. */
export class DemoBattery {
  static CELLS = 16;
  static PERIOD = 120; // ticks per full charge/discharge cycle

  // Per-cell voltage offsets in mV: cell 11 is the "weak" one.
  static OFFSETS = [4, -2, 1, 6, -1, 3, -3, 2, 5, -2, -14, 1, 4, -4, 2, -1];

  frame(tick) {
    const PERIOD = DemoBattery.PERIOD;
    const phase = (2 * Math.PI * (tick % PERIOD)) / PERIOD;
    const current = -18.0 * Math.sin(phase); // <0 charging, >0 discharging
    const charging = current < -0.5;
    const discharging = current > 0.5;

    const soc = 72 + 14 * Math.cos(phase);
    const base = 3.285 + 0.00055 * (soc - 70);
    const sag = -current * 0.0009; // IR drop/rise with load
    const cells = [];
    for (let i = 0; i < DemoBattery.CELLS; i++) {
      let v = base + DemoBattery.OFFSETS[i] / 1000 + sag;
      if (discharging && i === 10) v -= current * 0.0016; // the weak cell sags harder
      cells.push(Math.round(v * 1000) / 1000);
    }

    const vdiff = Math.max(...cells) - Math.min(...cells);
    const balancing = charging && vdiff > 0.01;
    const load = Math.abs(current);
    let warnings = 0;
    if (charging) warnings |= 1 << 18; // battery_charging
    if (discharging) warnings |= 1 << 19; // discharging
    warnings |= (1 << 23) | (1 << 24); // both MOS on
    if (balancing) warnings |= (1 << 25) | (1 << 29); // balance_on, auto_balance
    if (vdiff > 0.028) warnings |= 1 << 4; // cell_diff_warning
    if (soc < 61) warnings |= 1 << 12; // soc_low_level1_warning

    const state = charging ? 2 : discharging ? 4 : 3;

    const packV = cells.reduce((a, v) => a + v, 0);
    const remain = (105.0 * soc) / 100.0;
    const chRemain = charging ? Math.trunc(((105.0 - remain) / 17.0) * 60) : 0;
    const disRemain = discharging ? Math.trunc((remain / Math.max(load, 0.1)) * 60) : 0;

    return buildRealtimeFrame(
      cells,
      [24 + load * 0.15, 25 + load * 0.2, 23 + load * 0.1, 26 + load * 0.25],
      {
        systemState: state,
        warningMask: warnings >>> 0,
        tempMos: 30 + load * 0.9,
        tempBalance: 28 + (balancing ? 3 : 0),
        current: Math.round(current * 10) / 10,
        soc: Math.trunc(soc),
        soh: 98,
        balanceState: balancing ? 4 : 0,
        balanceBit: balancing ? 0b0000010000100100 : 0,
        remainAh: remain,
        power: Math.trunc(packV * current),
        timerS: 86400 * 212 + tick,
        chTimeRemainMin: Math.min(chRemain, 65535),
        disTimeRemainMin: Math.min(disRemain, 65535),
      }
    );
  }
}
