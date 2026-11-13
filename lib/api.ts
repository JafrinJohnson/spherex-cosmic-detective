import type {
  Target,
  TargetMeta,
  SpectrumPoint,
  SkySearchResult,
} from "@/types";

const FALLBACK_TARGETS: Target[] = [
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

const DEFAULT_META: TargetMeta = {
  frames: [
    { file: "frame-01.png", date: "2025-06-01", band: "all" },
    { file: "frame-02.png", date: "2025-12-01", band: "all" },
    { file: "frame-03.png", date: "2026-06-01", band: "all" },
    { file: "frame-04.png", date: "2026-12-01", band: "all" },
  ],
  pixelScaleArcsec: 6.2,
  source: "placeholder",
};

function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  return raw.replace(/\/+$/, "");
}

async function fetchJsonSafe<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function attachFrameUrls(id: string, meta: TargetMeta): TargetMeta {
  return {
    ...meta,
    frames: (meta.frames || []).map((frame) => ({
      ...frame,
      url: frame.url || `/data/${id}/frames/${frame.file}`,
    })),
  };
}

export async function getTargets(): Promise<Target[]> {
  const apiUrl = getApiBase();
  if (apiUrl) {
    const remote = await fetchJsonSafe<Target[]>(`${apiUrl}/api/targets`);
    if (Array.isArray(remote) && remote.length > 0) {
      return remote;
    }
  }

  const local = await fetchJsonSafe<Target[]>("/data/targets.json");
  if (Array.isArray(local) && local.length > 0) {
    return local;
  }

  return FALLBACK_TARGETS;
}

export async function getTarget(id: string): Promise<Target | null> {
  const safeId = encodeURIComponent(id);
  const apiUrl = getApiBase();
  if (apiUrl) {
    const remote = await fetchJsonSafe<Target>(`${apiUrl}/api/targets/${safeId}`);
    if (remote && remote.id) {
      return remote;
    }
  }

  const targets = await getTargets();
  return targets.find((t) => t.id === id) ?? targets[0] ?? null;
}

export async function getFrames(id: string): Promise<TargetMeta> {
  const safeId = encodeURIComponent(id);
  const apiUrl = getApiBase();
  if (apiUrl) {
    const remote = await fetchJsonSafe<TargetMeta>(
      `${apiUrl}/api/targets/${safeId}/frames`
    );
    if (remote && Array.isArray(remote.frames)) {
      return attachFrameUrls(id, remote);
    }
  }

  const local = await fetchJsonSafe<TargetMeta>(`/data/${safeId}/meta.json`);
  if (local && Array.isArray(local.frames)) {
    return attachFrameUrls(id, local);
  }

  return attachFrameUrls(id || "barnards-star", DEFAULT_META);
}

export async function getSpectrum(id: string): Promise<SpectrumPoint[]> {
  const safeId = encodeURIComponent(id);
  const apiUrl = getApiBase();
  if (apiUrl) {
    const remote = await fetchJsonSafe<SpectrumPoint[]>(
      `${apiUrl}/api/targets/${safeId}/spectrum`
    );
    if (Array.isArray(remote) && remote.length > 0) {
      return remote;
    }
  }

  const local = await fetchJsonSafe<SpectrumPoint[]>(
    `/data/${safeId}/spectrum.json`
  );
  if (Array.isArray(local) && local.length > 0) {
    return local;
  }

  // Fallback 102-point synthetic spectrum if fetch fails
  return Array.from({ length: 102 }, (_, i) => {
    const wavelength = Number((0.75 + (i / 101) * (5.0 - 0.75)).toFixed(4));
    const flux = Number((85 + Math.sin(wavelength * 2.4) * 35).toFixed(2));
    return { wavelength, flux };
  });
}

function angularSeparationDeg(
  ra1: number,
  dec1: number,
  ra2: number,
  dec2: number
): number {
  const toRad = Math.PI / 180;
  const d1 = dec1 * toRad;
  const d2 = dec2 * toRad;
  const dRa = (ra2 - ra1) * toRad;
  const cosAngle =
    Math.sin(d1) * Math.sin(d2) +
    Math.cos(d1) * Math.cos(d2) * Math.cos(dRa);
  const clamped = Math.max(-1, Math.min(1, cosAngle));
  return Math.acos(clamped) / toRad;
}

export async function searchSky(
  ra: number,
  dec: number,
  fovArcmin = 15
): Promise<SkySearchResult> {
  const cleanRa = Number.isFinite(ra) ? ((ra % 360) + 360) % 360 : 269.4521;
  const cleanDec = Number.isFinite(dec)
    ? Math.max(-90, Math.min(90, dec))
    : 4.6934;
  const cleanFov = Number.isFinite(fovArcmin) && fovArcmin > 0 ? fovArcmin : 15;

  const apiUrl = getApiBase();
  if (apiUrl) {
    const params = new URLSearchParams({
      ra: String(cleanRa),
      dec: String(cleanDec),
      fov: String(cleanFov),
    });
    const remote = await fetchJsonSafe<SkySearchResult>(
      `${apiUrl}/api/sky/search?${params.toString()}`
    );
    if (remote && remote.meta) {
      return remote;
    }
  }

  const targets = await getTargets();
  const ranked = targets
    .map((target) => ({
      target,
      separationDeg: Number(
        angularSeparationDeg(cleanRa, cleanDec, target.ra, target.dec).toFixed(4)
      ),
    }))
    .sort((a, b) => a.separationDeg - b.separationDeg);

  const closest = ranked[0]?.target ?? FALLBACK_TARGETS[0];
  const meta = await getFrames(closest.id);

  return {
    ra: cleanRa,
    dec: cleanDec,
    fovArcmin: cleanFov,
    matchedTarget: ranked[0] && ranked[0].separationDeg <= 5 ? ranked[0].target : closest,
    nearbyTargets: ranked,
    meta,
    source: meta.source || "placeholder",
  };
}

