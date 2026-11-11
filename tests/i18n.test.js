/* Every protocol enum/bit must have a phrase in BOTH languages. */

import { test } from "node:test";
import assert from "node:assert/strict";
import * as p from "../js/protocol.js";
import {
  STRINGS, LANGS, formatMinutes,
  SYSTEM_STATE_TEXT, DIS_MOS_TEXT, CH_MOS_TEXT, BALANCE_TEXT,
  PROTECT_TEXT, WARNING_TEXT, STATUS_WARNING_BITS, INFO_PROTECT_BITS,
} from "../js/i18n.js";

function assertAligned(nameMap, textMap, expectedLen) {
  for (const lang of LANGS) {
    assert.equal(textMap[lang].length, expectedLen, `${lang} length`);
    textMap[lang].forEach((phrase, i) => {
      assert.ok(typeof phrase === "string" && phrase.length > 0, `${lang}[${i}] empty`);
    });
  }
}

test("every protection bit has a phrase in ES and EN", () => {
  assertAligned("protect", PROTECT_TEXT, p.PROTECT_BITS.length);
  assert.equal(p.PROTECT_BITS.length, 45);
});

test("every warning bit has a phrase in ES and EN", () => {
  assertAligned("warning", WARNING_TEXT, p.WARNING_BITS.length);
  assert.equal(p.WARNING_BITS.length, 45);
});

test("MOS/balance/system enums are fully translated", () => {
  assertAligned("dis", DIS_MOS_TEXT, p.DIS_MOS_STATE.length);
  assertAligned("ch", CH_MOS_TEXT, p.CH_MOS_STATE.length);
  assertAligned("bal", BALANCE_TEXT, p.BALANCE_STATE.length);
  assertAligned("sys", SYSTEM_STATE_TEXT, 6);
});

test("UI strings: same keys in both languages, none empty", () => {
  const es = Object.keys(STRINGS.es).sort();
  const en = Object.keys(STRINGS.en).sort();
  assert.deepEqual(es, en);
  for (const lang of LANGS) {
    for (const [key, value] of Object.entries(STRINGS[lang])) {
      assert.ok(typeof value === "string" && value.length > 0, `${lang}.${key} empty`);
    }
  }
});

test("status/info bit sets reference existing bits", () => {
  for (const bit of STATUS_WARNING_BITS) {
    assert.ok(bit >= 0 && bit < p.WARNING_BITS.length, `warning bit ${bit}`);
  }
  for (const bit of INFO_PROTECT_BITS) {
    assert.ok(bit >= 0 && bit < p.PROTECT_BITS.length, `protect bit ${bit}`);
  }
  // charging/discharging/MOS-on are states, never alarms
  for (const name of ["battery_charging", "discharging", "charge_mos_on", "discharge_mos_on"]) {
    assert.ok(STATUS_WARNING_BITS.has(p.WARNING_BITS.indexOf(name)), name);
  }
  // real problems must NOT be classified as status
  for (const name of ["cell_diff_warning", "soc_low_level1_warning", "system_error"]) {
    assert.ok(!STATUS_WARNING_BITS.has(p.WARNING_BITS.indexOf(name)), name);
  }
});

test("formatMinutes matches the vendor app (quirk included)", () => {
  assert.equal(formatMinutes(251), "4h 11m");
  assert.equal(formatMinutes(90), "1h 30m");
  assert.equal(formatMinutes(0), "0h 0m");
  assert.equal(formatMinutes(60), "0h 60m"); // app quirk: > 60, not >= 60
  assert.equal(formatMinutes(1500), "1d 1h 0m");
});
