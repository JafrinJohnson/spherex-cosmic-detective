import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "public", "data");
const SOUNDS_DIR = path.join(ROOT, "public", "sounds");

const TARGETS = [
  {
    id: "barnards-star",
    name: "Barnard's Star",
    nickname: "The Runaway Star",
    type: "Red dwarf",
    ra: 269.4521,
    dec: 4.6934,
    distanceLy: 5.96,
    tags: ["fast"],
    colors: ["#FFB5A7", "#FF8A65"],
    story: "The fastest-moving star in our sky.",
  },
  {
    id: "wise-0855",
    name: "WISE 0855\u22120714",
    nickname: "The Coldest Neighbour",
    type: "Brown dwarf",
    ra: 133.7951,
    dec: -7.2451,
    distanceLy: 7.4,
    tags: ["fast", "brown-dwarf"],
    colors: ["#C3B1E1", "#A2D2FF"],
    story: "The coldest known brown dwarf, invisible to our eyes.",
  },
  {
    id: "eps-indi-b",
    name: "Epsilon Indi B",
    nickname: "The Twin Brown Dwarfs",
    type: "Brown dwarf pair",
    ra: 331.0438,
    dec: -56.7828,
    distanceLy: 11.9,
    tags: ["fast", "brown-dwarf"],
    colors: ["#B5EAD7", "#A2D2FF"],
    story: "Two failed stars orbiting each other near a Sun-like star.",
  },
  {
    id: "rw-aurigae",
    name: "RW Aurigae",
    nickname: "The Flickering Young Star",
    type: "Young variable star",
    ra: 76.9564,
    dec: 30.4014,
    distanceLy: null,
    tags: ["variable"],
    colors: ["#FFC8DD", "#C3B1E1"],
    story: "A young star wrapped in dust whose brightness rises and dips.",
  },
  {
    id: "r-draconis",
    name: "R Draconis",
    nickname: "The Breathing Giant",
    type: "Pulsating red giant",
    ra: 248.1674,
    dec: 66.7549,
    distanceLy: null,
    tags: ["variable"],
    colors: ["#FFD166", "#FF8A65"],
    story: "A dying giant star that swells and shrinks over months.",
  },
];

// Deterministic PRNG (Mulberry32)
function createRng(seed) {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// CRC32 Table for PNG encoding
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
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgbBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth 8
  ihdr[9] = 2; // color type 2 (RGB)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 3;
  const rawData = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    rawData[rowStart] = 0; // Filter type 0 (None)
    rgbBuffer.copy(rawData, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(rawData, { level: 6 });
  return Buffer.concat([
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

function drawStar(buf, width, height, cx, cy, radius, color, intensity = 1.0, spikes = false) {
  const rMax = Math.ceil(radius * 3.2);
  const x0 = Math.max(0, Math.floor(cx - rMax));
  const x1 = Math.min(width - 1, Math.ceil(cx + rMax));
  const y0 = Math.max(0, Math.floor(cy - rMax));
  const y1 = Math.min(height - 1, Math.ceil(cy + rMax));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist2 = dx * dx + dy * dy;
      const sigma2 = radius * radius * 0.55;
      let val = Math.exp(-dist2 / (2 * sigma2)) * intensity;

      if (spikes) {
        const spikeX = Math.exp(-(dy * dy) / 1.4) * Math.exp(-Math.abs(dx) / (radius * 2.1)) * 0.45 * intensity;
        const spikeY = Math.exp(-(dx * dx) / 1.4) * Math.exp(-Math.abs(dy) / (radius * 2.1)) * 0.45 * intensity;
        val = Math.min(1.6, val + spikeX + spikeY);
      }

      if (val > 0.004) {
        const idx = (y * width + x) * 3;
        buf[idx] = Math.min(255, Math.round(buf[idx] + color[0] * val));
        buf[idx + 1] = Math.min(255, Math.round(buf[idx + 1] + color[1] * val));
        buf[idx + 2] = Math.min(255, Math.round(buf[idx + 2] + color[2] * val));
      }
    }
  }
}

function generateTargetFrames(target) {
  const width = 512;
  const height = 512;
  const seed = hashString(target.id);
  const rng = createRng(seed);

  // Generate static background stars
  const stars = [];
  const palette = [
    [237, 235, 255],
    [195, 177, 225],
    [162, 210, 255],
    [255, 181, 167],
    [181, 234, 215],
  ];

  for (let i = 0; i < 165; i++) {
    const x = rng() * width;
    const y = rng() * height;
    const radius = 0.7 + Math.pow(rng(), 2.6) * 2.8;
    const color = palette[Math.floor(rng() * palette.length)];
    const intensity = 0.25 + Math.pow(rng(), 1.8) * 0.75;
    const spikes = radius > 2.4;
    stars.push({ x, y, radius, color, intensity, spikes });
  }

  // Base background buffer (deep-space gradient + subtle nebula dust)
  const baseBuf = Buffer.alloc(width * height * 3);
  const [c1, c2] = target.colors.map(hexToRgb);

  for (let y = 0; y < height; y++) {
    const ty = y / height;
    for (let x = 0; x < width; x++) {
      const tx = x / width;
      const idx = (y * width + x) * 3;
      const neb = Math.exp(-((tx - 0.52) ** 2 + (ty - 0.48) ** 2) / 0.18);
      baseBuf[idx] = Math.round(11 + ty * 12 + neb * (c1[0] * 0.08));
      baseBuf[idx + 1] = Math.round(11 + (1 - ty) * 9 + neb * (c1[1] * 0.06));
      baseBuf[idx + 2] = Math.round(30 + tx * 16 + neb * (c2[2] * 0.1));
    }
  }

  for (const s of stars) {
    drawStar(baseBuf, width, height, s.x, s.y, s.radius, s.color, s.intensity, s.spikes);
  }

  const framesDir = path.join(DATA_DIR, target.id, "frames");
  fs.mkdirSync(framesDir, { recursive: true });

  // Moving object trajectory across 4 frames
  // Fast movers shift ~2.6 px per epoch (~9.6 px total, inside 8px step radius and > 1px threshold)
  // Variable stars stay stationary (0 px shift) while brightness modulates > 20%
  const startX = 236 + (seed % 36);
  const startY = 268 - ((seed >> 4) % 36);
  const isFast = target.tags.includes("fast");
  const isVariable = target.tags.includes("variable");
  const dxStep = isFast ? 2.5 : 1.8;
  const dyStep = isFast ? -1.9 : -1.4;
  const moverCoords = [];

  for (let f = 0; f < 4; f++) {
    const frameBuf = Buffer.from(baseBuf);
    const objX = startX + f * dxStep;
    const objY = startY + f * dyStep;
    moverCoords.push({
      x: Number(objX.toFixed(1)),
      y: Number(objY.toFixed(1)),
    });

    const fluxPulse = isVariable ? [0.68, 1.32, 0.74, 1.48][f] : 1.28;
    const radius = isVariable ? 3.8 * Math.sqrt(fluxPulse) : 4.2;

    // Outer infrared halo
    drawStar(frameBuf, width, height, objX, objY, radius * 1.9, c2, 0.55 * fluxPulse, false);
    // Bright core with diffraction spikes
    drawStar(frameBuf, width, height, objX, objY, radius, [255, 225, 185], 1.15 * fluxPulse, true);

    const png = encodePng(width, height, frameBuf);
    const fileName = `frame-0${f + 1}.png`;
    fs.writeFileSync(path.join(framesDir, fileName), png);
  }

  return moverCoords;
}

function generateSpectrum(target) {
  const rng = createRng(hashString(target.id + "-spectrum"));
  const points = [];
  const total = 102;
  const minW = 0.75;
  const maxW = 5.0;

  for (let i = 0; i < total; i++) {
    const wavelength = Number((minW + (i / (total - 1)) * (maxW - minW)).toFixed(4));
    let continuum = 100;

    if (target.tags.includes("brown-dwarf")) {
      // Strong CH4 and H2O absorption troughs characteristic of cold brown dwarfs in SPHEREx bands
      const peak1 = Math.exp(-((wavelength - 1.25) ** 2) / 0.04) * 85;
      const peak2 = Math.exp(-((wavelength - 1.58) ** 2) / 0.05) * 95;
      const peak3 = Math.exp(-((wavelength - 2.1) ** 2) / 0.08) * 75;
      const irExcess = Math.exp(-((wavelength - 4.5) ** 2) / 0.35) * 160;
      continuum = 18 + peak1 + peak2 + peak3 + irExcess;
    } else if (target.tags.includes("variable")) {
      // Warm circumstellar dust excess + CO/Br-gamma features
      const stellar = 140 * Math.exp(-(wavelength - 0.75) * 0.42);
      const dustBump = 95 * Math.exp(-((wavelength - 3.4) ** 2) / 1.1);
      const h2oDip = -28 * Math.exp(-((wavelength - 2.7) ** 2) / 0.06);
      continuum = stellar + dustBump + h2oDip;
    } else {
      // M-dwarf spectral energy distribution peaking near 1.1 - 1.6 microns
      const mPeak = 180 * Math.exp(-((wavelength - 1.35) ** 2) / 0.9);
      const tail = 65 * Math.exp(-(wavelength - 1.35) * 0.35);
      const coBand = -24 * Math.exp(-((wavelength - 2.35) ** 2) / 0.04);
      continuum = Math.max(25, mPeak + tail + coBand);
    }

    const noise = (rng() - 0.5) * 4.2;
    const flux = Number(Math.max(5, continuum + noise).toFixed(2));
    points.push({ wavelength, flux });
  }

  return points;
}

function generateMeta(mover) {
  return {
    frames: [
      { file: "frame-01.png", date: "2025-06-01", band: "all" },
      { file: "frame-02.png", date: "2025-12-01", band: "all" },
      { file: "frame-03.png", date: "2026-06-01", band: "all" },
      { file: "frame-04.png", date: "2026-12-01", band: "all" },
    ],
    pixelScaleArcsec: 6.2,
    source: "placeholder",
    mover,
  };
}

// Create minimal valid MP3 frames so Howler never hits 404s
function createSilentMp3(framesCount = 12) {
  // Valid MPEG-1 Layer 3 32kbps 44.1kHz mono silent frame (104 bytes)
  const frame = Buffer.alloc(104, 0);
  frame[0] = 0xff;
  frame[1] = 0xfb;
  frame[2] = 0x10;
  frame[3] = 0xc4;
  const buffers = [];
  for (let i = 0; i < framesCount; i++) {
    buffers.push(frame);
  }
  return Buffer.concat(buffers);
}

function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, "targets.json"), JSON.stringify(TARGETS, null, 2) + "\n");

  for (const target of TARGETS) {
    const targetDir = path.join(DATA_DIR, target.id);
    fs.mkdirSync(targetDir, { recursive: true });

    const moverCoords = generateTargetFrames(target);
    const meta = generateMeta(moverCoords);
    fs.writeFileSync(path.join(targetDir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

    const spectrum = generateSpectrum(target);
    fs.writeFileSync(path.join(targetDir, "spectrum.json"), JSON.stringify(spectrum, null, 2) + "\n");
  }

  fs.mkdirSync(SOUNDS_DIR, { recursive: true });
  for (const sound of ["ambient.mp3", "click.mp3", "whoosh.mp3", "success.mp3"]) {
    const soundPath = path.join(SOUNDS_DIR, sound);
    if (!fs.existsSync(soundPath)) {
      fs.writeFileSync(soundPath, createSilentMp3(sound === "ambient.mp3" ? 40 : 8));
    }
  }
}

main();

