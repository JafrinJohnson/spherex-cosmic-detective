import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEXTURES_DIR = path.resolve(__dirname, "..", "public", "textures");

// Deterministic CRC32 for PNG encoding
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

function hash2(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbm(x, y, octaves = 5) {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * smoothNoise(x * freq, y * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return val;
}

function generateTexture(width, height, pixelFn) {
  const buf = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const v = y / height;
    const lat = (v - 0.5) * Math.PI;
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const lon = u * Math.PI * 2;
      const nx = Math.cos(lon) * 2.5 + 4.0;
      const ny = Math.sin(lon) * 2.5 + 4.0;
      const [r, g, b, a] = pixelFn(u, v, lat, nx, ny);
      const idx = (y * width + x) * 4;
      buf[idx] = Math.max(0, Math.min(255, Math.round(r)));
      buf[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      buf[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      buf[idx + 3] = Math.max(0, Math.min(255, Math.round(a ?? 255)));
    }
  }
  return encodePng(width, height, buf);
}

function main() {
  fs.mkdirSync(TEXTURES_DIR, { recursive: true });
  const W = 512;
  const H = 256;

  const files = {
    "sun.jpg": () =>
      generateTexture(W, H, (u, v, _lat, nx, ny) => {
        const n = fbm(nx * 2.2, v * 8.0 + ny * 0.6, 5);
        const flare = Math.pow(n, 1.4);
        return [
          245 + flare * 10,
          140 + flare * 95,
          35 + flare * 85,
          255,
        ];
      }),
    "earth.jpg": () =>
      generateTexture(W, H, (_u, v, lat, nx, ny) => {
        const absLat = Math.abs(lat) / (Math.PI * 0.5);
        const cont = fbm(nx * 1.35, v * 4.2 + ny * 0.45, 5);
        // Polar ice caps
        if (absLat > 0.82 - cont * 0.08) {
          return [235, 244, 252, 255];
        }
        // Continents vs Oceans
        if (cont > 0.51) {
          const elev = (cont - 0.51) / 0.49;
          const desert = Math.max(0, 1 - Math.abs(absLat - 0.28) * 4.5);
          const r = 46 + desert * 125 + elev * 55;
          const g = 112 + desert * 45 + elev * 30;
          const b = 48 + desert * 20 + elev * 25;
          return [r, g, b, 255];
        }
        const depth = cont / 0.51;
        return [
          12 + depth * 24,
          48 + depth * 64,
          118 + depth * 82,
          255,
        ];
      }),
    "earth-clouds.jpg": () =>
      generateTexture(W, H, (_u, v, _lat, nx, ny) => {
        const swirl = fbm(nx * 2.0 + 1.7, v * 6.0 + ny * 0.8, 5);
        const alpha = Math.max(0, Math.min(1, (swirl - 0.44) * 2.6));
        const val = Math.round(alpha * 255);
        return [val, val, val, 255];
      }),
    "mars.jpg": () =>
      generateTexture(W, H, (_u, v, lat, nx, ny) => {
        const absLat = Math.abs(lat) / (Math.PI * 0.5);
        if (absLat > 0.88) return [236, 226, 218, 255];
        const n = fbm(nx * 1.8, v * 5.2 + ny * 0.5, 5);
        return [
          168 + n * 68,
          76 + n * 48,
          44 + n * 30,
          255,
        ];
      }),
    "jupiter.jpg": () =>
      generateTexture(W, H, (u, v, _lat, nx, ny) => {
        const turb = fbm(nx * 1.5, v * 8.0 + ny * 0.4, 5);
        const bands = Math.sin(v * 28 + turb * 3.2) * 0.5 + 0.5;
        // Great Red Spot near southern tropical zone
        const spotDist = Math.hypot((u - 0.58) * 2.4, (v - 0.64) * 4.2);
        const spot = Math.max(0, 1 - spotDist * 3.2);
        const r = 175 + bands * 58 + spot * 35;
        const g = 138 + bands * 54 - spot * 35;
        const b = 104 + bands * 46 - spot * 42;
        return [r, g, b, 255];
      }),
    "moon.jpg": () =>
      generateTexture(W, H, (_u, v, _lat, nx, ny) => {
        const n = fbm(nx * 2.4, v * 6.5 + ny * 0.7, 5);
        const maria = n < 0.46 ? 0.78 : 1.0;
        const g = (118 + n * 95) * maria;
        return [g, g * 0.99, g * 0.97, 255];
      }),
  };

  for (const [name, builder] of Object.entries(files)) {
    const filePath = path.join(TEXTURES_DIR, name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, builder());
    }
  }
}

main();

