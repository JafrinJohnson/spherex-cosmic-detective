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
      const [r, g, b, a] = pixelFn(u, v, lat, nx, ny, x, y);
      const idx = (y * width + x) * 4;
      buf[idx] = Math.max(0, Math.min(255, Math.round(r)));
      buf[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      buf[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      buf[idx + 3] = Math.max(0, Math.min(255, Math.round(a ?? 255)));
    }
  }
  return encodePng(width, height, buf);
}

function earthContinentValue(v, nx, ny) {
  return fbm(nx * 1.35, v * 4.2 + ny * 0.45, 5);
}

function main() {
  fs.mkdirSync(TEXTURES_DIR, { recursive: true });
  const W = 1024;
  const H = 512;

  const files = {
    "sun.jpg": () =>
      generateTexture(W, H, (_u, v, _lat, nx, ny) => {
        const n = fbm(nx * 2.6, v * 9.0 + ny * 0.8, 5);
        const gran = fbm(nx * 6.5 + 2.1, v * 18.0 + ny * 1.7, 4);
        const flare = Math.pow(n * 0.7 + gran * 0.3, 1.35);
        return [
          248 + flare * 7,
          152 + flare * 95,
          38 + flare * 95,
          255,
        ];
      }),

    "mercury.jpg": () =>
      generateTexture(W, H, (_u, v, _lat, nx, ny) => {
        const base = fbm(nx * 2.5 + 1.2, v * 6.5 + ny * 0.9, 5);
        const craters = fbm(nx * 7.2 + 5.4, v * 16.0 + ny * 2.1, 4);
        const ridge = Math.abs(craters - 0.52) < 0.035 ? 22 : 0;
        const basin = base < 0.43 ? 0.84 : 1.0;
        const val = (105 + base * 78 + craters * 24 + ridge) * basin;
        return [val * 1.02, val * 0.98, val * 0.93, 255];
      }),

    "venus.jpg": () =>
      generateTexture(W, H, (u, v, _lat, nx, ny) => {
        const swirl = fbm(nx * 1.7 + 3.1, v * 5.5 + ny * 0.6, 5);
        const chevron =
          Math.sin((u + Math.abs(v - 0.5) * 0.85) * Math.PI * 4 + swirl * 4.2) *
            0.5 +
          0.5;
        const band = swirl * 0.65 + chevron * 0.35;
        return [
          198 + band * 46,
          152 + band * 52,
          82 + band * 48,
          255,
        ];
      }),

    "earth.jpg": () =>
      generateTexture(W, H, (_u, v, lat, nx, ny) => {
        const absLat = Math.abs(lat) / (Math.PI * 0.5);
        const cont = earthContinentValue(v, nx, ny);
        if (absLat > 0.82 - cont * 0.08) {
          return [235, 244, 252, 255];
        }
        if (cont > 0.51) {
          const elev = (cont - 0.51) / 0.49;
          const desert = Math.max(0, 1 - Math.abs(absLat - 0.28) * 4.5);
          const r = 42 + desert * 125 + elev * 55;
          const g = 108 + desert * 45 + elev * 32;
          const b = 46 + desert * 22 + elev * 24;
          return [r, g, b, 255];
        }
        const depth = cont / 0.51;
        return [
          10 + depth * 22,
          44 + depth * 60,
          112 + depth * 84,
          255,
        ];
      }),

    "earth-night.jpg": () =>
      generateTexture(W, H, (_u, v, lat, nx, ny) => {
        const absLat = Math.abs(lat) / (Math.PI * 0.5);
        const cont = earthContinentValue(v, nx, ny);
        const isLand = cont > 0.51 && absLat < 0.72;
        if (!isLand) {
          return [3, 6, 16, 255];
        }
        const coastProximity = Math.max(0, 1 - (cont - 0.51) * 5.2);
        const cityCluster = fbm(nx * 6.5 + 2.3, v * 18.0 + ny * 2.4, 4);
        const fineGrid = fbm(nx * 18.0 + 7.1, v * 44.0 + ny * 5.2, 3);
        const hub = Math.max(
          0,
          (cityCluster - 0.53) * 3.4 + coastProximity * 0.28
        );
        const spark = Math.pow(Math.max(0, fineGrid - 0.48) * 2.2, 2.0) * hub;
        const intensity = Math.min(1, spark * 2.8);
        return [
          8 + intensity * 247,
          10 + intensity * 195,
          20 + intensity * 95,
          255,
        ];
      }),

    "earth-clouds.jpg": () =>
      generateTexture(W, H, (_u, v, _lat, nx, ny) => {
        const swirl = fbm(nx * 2.1 + 1.7, v * 6.4 + ny * 0.85, 5);
        const alpha = Math.max(0, Math.min(1, (swirl - 0.45) * 2.5));
        const val = Math.round(alpha * 255);
        return [val, val, val, 255];
      }),

    "moon.jpg": () =>
      generateTexture(W, H, (_u, v, _lat, nx, ny) => {
        const n = fbm(nx * 2.4, v * 6.5 + ny * 0.7, 5);
        const fine = fbm(nx * 7.5 + 1.9, v * 16.0 + ny * 1.4, 4);
        const maria = n < 0.46 ? 0.74 : 1.0;
        const g = (112 + n * 88 + fine * 22) * maria;
        return [g, g * 0.99, g * 0.97, 255];
      }),

    "mars.jpg": () =>
      generateTexture(W, H, (_u, v, lat, nx, ny) => {
        const absLat = Math.abs(lat) / (Math.PI * 0.5);
        if (absLat > 0.89) return [236, 226, 218, 255];
        const n = fbm(nx * 1.8, v * 5.2 + ny * 0.5, 5);
        const darkBasalt = n < 0.42 ? 0.76 : 1.0;
        return [
          (168 + n * 68) * darkBasalt,
          (76 + n * 46) * darkBasalt,
          (44 + n * 28) * darkBasalt,
          255,
        ];
      }),

    "jupiter.jpg": () =>
      generateTexture(W, H, (u, v, _lat, nx, ny) => {
        const turb = fbm(nx * 1.6, v * 8.5 + ny * 0.4, 5);
        const bands = Math.sin(v * 30 + turb * 3.2) * 0.5 + 0.5;
        const fineZone = Math.cos(v * 68 + turb * 5.0) * 0.5 + 0.5;
        const spotDist = Math.hypot((u - 0.58) * 2.4, (v - 0.64) * 4.2);
        const spot = Math.max(0, 1 - spotDist * 3.2);
        const r = 168 + bands * 54 + fineZone * 14 + spot * 42;
        const g = 132 + bands * 50 + fineZone * 10 - spot * 36;
        const b = 98 + bands * 44 + fineZone * 8 - spot * 42;
        return [r, g, b, 255];
      }),

    "saturn.jpg": () =>
      generateTexture(W, H, (_u, v, _lat, nx, ny) => {
        const turb = fbm(nx * 1.2 + 4.2, v * 6.0 + ny * 0.25, 4);
        const bands = Math.sin(v * 26 + turb * 1.8) * 0.5 + 0.5;
        const subtle = Math.cos(v * 52 + turb * 2.2) * 0.5 + 0.5;
        const mix = bands * 0.75 + subtle * 0.25;
        return [
          196 + mix * 42,
          172 + mix * 38,
          126 + mix * 32,
          255,
        ];
      }),

    "saturn-ring.png": () =>
      generateTexture(1024, 64, (u) => {
        // u = 0 is inner ring radius, u = 1 is outer ring radius
        if (u < 0.04 || u > 0.97) {
          return [0, 0, 0, 0];
        }
        // Cassini division gap around 0.63..0.68
        const cassini =
          u > 0.625 && u < 0.68
            ? 0.08 + 0.92 * Math.pow(Math.abs(u - 0.6525) / 0.0275, 2.2)
            : 1.0;
        // Encke gap around 0.86..0.875
        const encke = u > 0.86 && u < 0.875 ? 0.2 : 1.0;

        // Inner C ring (0.04..0.24) is faint & translucent
        let density = 1.0;
        if (u < 0.24) {
          density = ((u - 0.04) / 0.2) * 0.42;
        } else if (u < 0.625) {
          // Bright B ring
          density = 0.72 + Math.sin(u * 190) * 0.14 + Math.cos(u * 430) * 0.08;
        } else {
          // Outer A ring
          density = 0.54 + Math.sin(u * 150) * 0.1;
        }

        const edgeFade =
          Math.min(1, (u - 0.04) / 0.05) * Math.min(1, (0.97 - u) / 0.04);
        const alpha = Math.max(
          0,
          Math.min(1, density * cassini * encke * edgeFade)
        );
        const ringlets = Math.sin(u * 320) * 14 + Math.cos(u * 780) * 8;
        return [
          216 + ringlets,
          194 + ringlets * 0.9,
          156 + ringlets * 0.7,
          alpha * 235,
        ];
      }),

    "uranus.jpg": () =>
      generateTexture(W, H, (_u, v, _lat, nx, ny) => {
        const turb = fbm(nx * 1.1 + 2.0, v * 4.5 + ny * 0.2, 4);
        const band = Math.sin(v * 14 + turb * 1.1) * 0.5 + 0.5;
        return [
          145 + band * 28,
          212 + band * 24,
          224 + band * 20,
          255,
        ];
      }),

    "neptune.jpg": () =>
      generateTexture(W, H, (u, v, _lat, nx, ny) => {
        const turb = fbm(nx * 1.8 + 5.1, v * 7.0 + ny * 0.4, 5);
        const band = Math.sin(v * 20 + turb * 2.2) * 0.5 + 0.5;
        const streak = Math.max(0, Math.sin(v * 48 + u * 12 + turb * 6) - 0.78);
        const darkSpotDist = Math.hypot((u - 0.42) * 2.8, (v - 0.58) * 4.5);
        const darkSpot = Math.max(0, 1 - darkSpotDist * 3.5);
        return [
          38 + band * 32 + streak * 180 - darkSpot * 18,
          82 + band * 54 + streak * 160 - darkSpot * 28,
          178 + band * 58 + streak * 65 - darkSpot * 24,
          255,
        ];
      }),

    "milky-way.jpg": () =>
      generateTexture(W, H, (u, v, _lat, nx, ny, x, y) => {
        // Galactic plane tilted gently across the sky
        const planeOffset =
          v - (0.5 + Math.sin(u * Math.PI * 2) * 0.18);
        const band = Math.exp(-(planeOffset * planeOffset) / 0.018);
        const dust = fbm(nx * 2.8 + 1.4, v * 7.5 + ny * 1.2, 5);
        const dustLane =
          Math.exp(-(planeOffset * planeOffset) / 0.0035) *
          Math.max(0, dust - 0.38) *
          1.45;
        const glow = Math.max(0, band * (0.45 + dust * 0.75) - dustLane * 0.55);

        // Pinpoint stars
        const starHash = hash2(x * 1.37, y * 2.91);
        const star =
          starHash > 0.9965
            ? (starHash - 0.9965) / 0.0035
            : starHash > 0.992 && band > 0.35
            ? ((starHash - 0.992) / 0.008) * 0.65
            : 0;

        const r = 6 + glow * 62 + star * 235;
        const g = 8 + glow * 58 + star * 230;
        const b = 18 + glow * 92 + star * 245;
        return [r, g, b, 255];
      }),
  };

  for (const [name, builder] of Object.entries(files)) {
    const filePath = path.join(TEXTURES_DIR, name);
    fs.writeFileSync(filePath, builder());
  }
}

main();
