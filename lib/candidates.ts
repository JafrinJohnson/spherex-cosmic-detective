import type { CandidateRecord } from "@/types";

const STORAGE_KEY = "cosmic-detective-candidates-v1";
const MAX_CANDIDATES = 50;
export const CANDIDATES_UPDATED_EVENT = "candidates-updated";

export function getCandidates(): CandidateRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CandidateRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function addCandidate(
  entry: Omit<CandidateRecord, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }
): CandidateRecord {
  const record: CandidateRecord = {
    ...entry,
    id: entry.id || `cand-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: entry.createdAt || new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const existing = getCandidates();
      const updated = [record, ...existing].slice(0, MAX_CANDIDATES);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event(CANDIDATES_UPDATED_EVENT));
    } catch {
      // Ignore storage quota or access errors
    }
  }

  return record;
}

export function removeCandidate(id: string): CandidateRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = getCandidates();
    const updated = existing.filter((item) => item.id !== id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(CANDIDATES_UPDATED_EVENT));
    return updated;
  } catch {
    return [];
  }
}
