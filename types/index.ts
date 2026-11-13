export type TargetTag = "fast" | "brown-dwarf" | "variable" | string;

export interface Target {
  id: string;
  name: string;
  nickname: string;
  type: string;
  ra: number;
  dec: number;
  distanceLy: number | null;
  tags: TargetTag[];
  colors: [string, string] | string[];
  story: string;
}

export interface FrameEntry {
  file: string;
  date: string;
  band: string;
  url?: string;
}

export interface TargetMeta {
  frames: FrameEntry[];
  pixelScaleArcsec: number;
  source: "placeholder" | "irsa" | "live" | string;
}

export interface SpectrumPoint {
  wavelength: number;
  flux: number;
}

export interface SkySearchResult {
  ra: number;
  dec: number;
  fovArcmin: number;
  matchedTarget: Target | null;
  nearbyTargets: Array<{
    target: Target;
    separationDeg: number;
  }>;
  meta: TargetMeta;
  source: "placeholder" | "irsa" | "live" | string;
}

export interface CandidateSubmission {
  id: string;
  targetId: string;
  targetName: string;
  ra: number;
  dec: number;
  pixelX: number;
  pixelY: number;
  epochDate: string;
  classification: "High Proper Motion" | "Brown Dwarf Candidate" | "Variable Source" | "Transient Anomaly";
  confidence: number;
  notes: string;
  createdAt: string;
}

