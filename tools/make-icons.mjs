/* Generates icons/icon-192.png and icons/icon-512.png with no dependencies
 * (hand-rolled PNG encoder + per-pixel drawing). Run once:
 *   node tools/make-icons.mjs
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------- minimal PNG encoder ---------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- drawing ---------- */

function insideRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : null;
  const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : null;
  if (cx === null || cy === null) return true;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4); // starts fully transparent
  const BG = [0x1c, 0x5c, 0xab];
  const WHITE = [0xff, 0xff, 0xff];
  const GREEN = [0x6f, 0xdc, 0x6f];

  // normalized geometry (fractions of size)
  const shapes = [
    { c: BG, box: [0, 0, 1, 1], r: 0.17 },                       // background
    { c: WHITE, box: [0.17, 0.35, 0.73, 0.65], r: 0.055 },       // battery outline
    { c: BG, box: [0.205, 0.385, 0.695, 0.615], r: 0.035 },      // outline hole
    { c: WHITE, box: [0.755, 0.44, 0.835, 0.56], r: 0.025 },     // terminal nub
    { c: GREEN, box: [0.235, 0.415, 0.545, 0.585], r: 0.028 },   // charge fill
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size;
      const ny = (y + 0.5) / size;
      let color = null;
      for (const s of shapes) {
        if (insideRoundRect(nx, ny, s.box[0], s.box[1], s.box[2], s.box[3], s.r)) color = s.c;
      }
      if (color) {
        const o = (y * size + x) * 4;
        rgba[o] = color[0];
        rgba[o + 1] = color[1];
        rgba[o + 2] = color[2];
        rgba[o + 3] = 255;
      }
    }
  }
  return png(size, rgba);
}

mkdirSync(join(root, "icons"), { recursive: true });
for (const size of [192, 512]) {
  const file = join(root, "icons", `icon-${size}.png`);
  writeFileSync(file, drawIcon(size));
  console.log("wrote", file);
}
