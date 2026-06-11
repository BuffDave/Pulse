import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "public", "opengraph-image.png");

const WIDTH = 1200;
const HEIGHT = 630;

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createOgPng() {
  const bg = [9, 9, 15];
  const accent = [52, 211, 153];
  const muted = [68, 68, 90];
  const raw = Buffer.alloc((WIDTH * 4 + 1) * HEIGHT);

  const dots = [
    { x: 0.72, y: 0.28, r: 0.018 },
    { x: 0.78, y: 0.42, r: 0.014 },
    { x: 0.68, y: 0.52, r: 0.016 },
    { x: 0.82, y: 0.58, r: 0.012 },
    { x: 0.74, y: 0.68, r: 0.015 },
    { x: 0.86, y: 0.35, r: 0.013 },
    { x: 0.64, y: 0.38, r: 0.011 },
    { x: 0.58, y: 0.55, r: 0.017 },
  ];

  for (let y = 0; y < HEIGHT; y++) {
    const row = y * (WIDTH * 4 + 1) + 1;
    raw[row - 1] = 0;
    for (let x = 0; x < WIDTH; x++) {
      const nx = x / WIDTH;
      const ny = y / HEIGHT;
      let c = bg;

      // Accent ring + core (left third)
      const cx = 0.22;
      const cy = 0.5;
      const dx = nx - cx;
      const dy = ny - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 0.12) c = accent;
      else if (dist <= 0.155) c = muted;

      // Scattered peer dots (right side — globe feel)
      for (const dot of dots) {
        const ddx = nx - dot.x;
        const ddy = ny - dot.y;
        if (ddx * ddx + ddy * ddy <= dot.r * dot.r) {
          c = accent;
          break;
        }
      }

      const i = row + x * 4;
      raw[i] = c[0];
      raw[i + 1] = c[1];
      raw[i + 2] = c[2];
      raw[i + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = deflateSync(raw);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync(outPath, createOgPng());
console.log("Generated public/opengraph-image.png");
