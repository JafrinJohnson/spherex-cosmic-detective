"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { Compass, Orbit } from "lucide-react";
import { getTargets } from "@/lib/api";
import { parseRA, parseDec } from "@/lib/coords";
import type { Target } from "@/types";
import {
  SearchPanel,
  type RecentSearchEntry,
} from "@/components/explore/SearchPanel";
import { PageTransition } from "@/components/PageTransition";
import { useSound } from "@/components/SoundProvider";
import { ThreeErrorBoundary } from "@/components/three/ThreeErrorBoundary";

const SkyGlobe = dynamic(() => import("@/components/three/SkyGlobe"), {
  ssr: false,
  loading: () => (
    <div className="glass p-4 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-pastel-lavender animate-spin" />
          <span className="font-heading text-sm font-semibold text-cosmic-text">
            3D Celestial Sphere (J2000)
          </span>
        </div>
        <span className="text-xs font-mono text-cosmic-muted">
          RA 2h Grid · Dec 30° Grid
        </span>
      </div>
      <div className="relative w-full h-[360px] sm:h-[440px] lg:h-[500px] rounded-2xl bg-[#0B0B1E]/65 border border-white/10 flex flex-col items-center justify-center gap-3">
        <div className="w-40 h-40 rounded-full border border-pastel-lavender/35 bg-pastel-lavender/5 flex items-center justify-center shadow-[0_0_50px_rgba(195,177,225,0.2)]">
          <Orbit className="w-8 h-8 text-pastel-lavender animate-pulse" />
        </div>
        <span className="text-xs text-cosmic-muted">
          Loading celestial sphere...
        </span>
      </div>
    </div>
  ),
});

const RECENT_STORAGE_KEY = "cosmic-detective-recent-searches";

const QUICK_PICK_LABELS: Record<string, string> = {
  "barnards-star": "Barnard's Star",
  "wise-0855": "WISE 0855",
  "eps-indi-b": "Epsilon Indi B",
  "rw-aurigae": "RW Aurigae",
  "r-draconis": "R Draconis",
};

export default function ExplorePage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const { playSound, playSignature } = useSound();

  const [targets, setTargets] = useState<Target[]>([]);

  // Search form states
  const [objectQuery, setObjectQuery] = useState<string>("Barnard's Star");
  const [raInput, setRaInput] = useState<string>("269.4521");
  const [decInput, setDecInput] = useState<string>("4.6934");
  const [fov, setFov] = useState<number>(5);
  const [band, setBand] = useState<string>("all");
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);

  // 3D Globe rotation request state
  const [focusRequest, setFocusRequest] = useState<{
    ra: number;
    dec: number;
    seq: number;
  } | null>({ ra: 269.4521, dec: 4.6934, seq: 1 });

  // Recent searches (max 5 in localStorage)
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);

  // Load targets and recent searches
  useEffect(() => {
    let active = true;
    getTargets().then((list) => {
      if (!active) return;
      setTargets(list);
      const first = list[0] ?? null;
      if (first) {
        setSelectedTarget(first);
        setObjectQuery(first.name);
        setRaInput(String(first.ra));
        setDecInput(String(first.dec));
      }
    });

    try {
      const saved = window.localStorage.getItem(RECENT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as RecentSearchEntry[];
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, 5));
        }
      }
    } catch {
      // Ignore storage access errors
    }

    return () => {
      active = false;
    };
  }, []);

  const parsedRa = parseRA(raInput);
  const parsedDec = parseDec(decInput);
  const validCoords =
    parsedRa !== null && parsedDec !== null
      ? { ra: parsedRa, dec: parsedDec }
      : null;

  // Rotate globe whenever user types valid RA/Dec
  useEffect(() => {
    if (parsedRa !== null && parsedDec !== null) {
      setFocusRequest((prev) => ({
        ra: parsedRa,
        dec: parsedDec,
        seq: (prev?.seq ?? 0) + 1,
      }));
    }
  }, [parsedRa, parsedDec]);

  const handleSelectTarget = useCallback(
    (target: Target) => {
      playSound("click");
      playSignature(target.type || target.id);
      setSelectedTarget(target);
      setObjectQuery(target.name);
      setRaInput(String(target.ra));
      setDecInput(String(target.dec));
      setFocusRequest((prev) => ({
        ra: target.ra,
        dec: target.dec,
        seq: (prev?.seq ?? 0) + 1,
      }));
    },
    [playSound, playSignature]
  );

  const handleRaChange = (val: string) => {
    setRaInput(val);
    const pRa = parseRA(val);
    const pDec = parseDec(decInput);
    if (
      selectedTarget &&
      (pRa === null ||
        Math.abs(pRa - selectedTarget.ra) > 0.005 ||
        pDec === null ||
        Math.abs(pDec - selectedTarget.dec) > 0.005)
    ) {
      setSelectedTarget(null);
    }
  };

  const handleDecChange = (val: string) => {
    setDecInput(val);
    const pRa = parseRA(raInput);
    const pDec = parseDec(val);
    if (
      selectedTarget &&
      (pDec === null ||
        Math.abs(pDec - selectedTarget.dec) > 0.005 ||
        pRa === null ||
        Math.abs(pRa - selectedTarget.ra) > 0.005)
    ) {
      setSelectedTarget(null);
    }
  };

  const handleObjectQueryChange = (val: string) => {
    setObjectQuery(val);
    const match = targets.find(
      (t) =>
        t.name.toLowerCase() === val.trim().toLowerCase() ||
        t.nickname.toLowerCase() === val.trim().toLowerCase()
    );
    if (match) {
      setSelectedTarget(match);
      setRaInput(String(match.ra));
      setDecInput(String(match.dec));
    } else {
      setSelectedTarget(null);
    }
  };

  const saveRecentSearch = (entry: RecentSearchEntry) => {
    setRecentSearches((prev) => {
      const deduped = prev.filter(
        (item) =>
          !(
            Math.abs(item.ra - entry.ra) < 0.001 &&
            Math.abs(item.dec - entry.dec) < 0.001 &&
            item.band === entry.band &&
            item.fov === entry.fov
          )
      );
      const updated = [entry, ...deduped].slice(0, 5);
      try {
        window.localStorage.setItem(
          RECENT_STORAGE_KEY,
          JSON.stringify(updated)
        );
      } catch {
        // Ignore localStorage quota or privacy errors
      }
      return updated;
    });
  };

  const navigateToViewer = (params: {
    ra: number;
    dec: number;
    fov: number;
    band: string;
    targetId?: string;
    label: string;
  }) => {
    const entry: RecentSearchEntry = {
      id: `search-${Date.now()}`,
      label: params.label,
      ra: params.ra,
      dec: params.dec,
      fov: params.fov,
      band: params.band,
      targetId: params.targetId,
    };
    saveRecentSearch(entry);

    const searchParams = new URLSearchParams({
      ra: String(params.ra),
      dec: String(params.dec),
      fov: String(params.fov),
      band: params.band,
    });
    if (params.targetId) {
      searchParams.set("target", params.targetId);
    }
    setIsNavigating(true);
    router.push(`/viewer?${searchParams.toString()}`);
  };

  const handleSelectRecent = (entry: RecentSearchEntry) => {
    setRaInput(String(entry.ra));
    setDecInput(String(entry.dec));
    setFov(entry.fov);
    setBand(entry.band);
    const matched = entry.targetId
      ? targets.find((t) => t.id === entry.targetId) ?? null
      : null;
    setSelectedTarget(matched);
    setObjectQuery(matched ? matched.name : entry.label);

    const searchParams = new URLSearchParams({
      ra: String(entry.ra),
      dec: String(entry.dec),
      fov: String(entry.fov),
      band: entry.band,
    });
    if (entry.targetId) {
      searchParams.set("target", entry.targetId);
    }
    setIsNavigating(true);
    router.push(`/viewer?${searchParams.toString()}`);
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    try {
      window.localStorage.removeItem(RECENT_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <PageTransition className="max-w-[1200px] mx-auto space-y-10 pb-16">
      {/* Page Header */}
      <motion.section
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        <div className="space-y-2 max-w-2xl">
          <h1 className="font-heading text-3xl sm:text-5xl font-medium text-cosmic-text">
            Where should we look?
          </h1>
          <p className="text-base sm:text-lg text-cosmic-muted">
            Enter a position in the sky, or pick a famous mover.
          </p>
        </div>

        {/* QUICK PICKS: Row of 5 glass chips "Famous movers" */}
        <div className="pt-2 space-y-2">
          <h2 className="text-sm font-medium text-cosmic-muted">
            Famous movers
          </h2>

          <div className="flex flex-wrap items-center gap-2.5">
            {targets.map((target) => {
              const isSelected = selectedTarget?.id === target.id;
              const shortLabel =
                QUICK_PICK_LABELS[target.id] ?? target.name;
              const primaryColor = target.colors?.[0] || "#FFB5A7";

              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => handleSelectTarget(target)}
                  style={{
                    borderColor: isSelected ? primaryColor : undefined,
                    backgroundColor: isSelected
                      ? `${primaryColor}26`
                      : undefined,
                  }}
                  className={`glass px-4 py-2 rounded-full text-xs sm:text-sm font-medium flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-pastel-lavender ${isSelected
                    ? "text-cosmic-text shadow-sm"
                    : "text-cosmic-muted hover:text-cosmic-text"
                    }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span>{shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Main Two-Column Layout (Mobile: stacked with Globe on top; Desktop: two columns) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Column 1 (Top on Mobile, Left on Desktop): 3D Sky Globe */}
        <motion.div
          initial={
            prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 18 }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="lg:col-span-6 w-full"
        >
          <ThreeErrorBoundary>
            <SkyGlobe
              targets={targets}
              selectedTargetId={selectedTarget?.id ?? null}
              crosshairCoords={validCoords}
              focusRequest={focusRequest}
              onSelectTarget={handleSelectTarget}
              isNavigating={isNavigating}
            />
          </ThreeErrorBoundary>
        </motion.div>

        {/* Column 2 (Bottom on Mobile, Right on Desktop): Search Panel & Recent Searches */}
        <motion.div
          initial={
            prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 18 }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="lg:col-span-6 w-full"
        >
          <SearchPanel
            targets={targets}
            objectQuery={objectQuery}
            onObjectQueryChange={handleObjectQueryChange}
            raInput={raInput}
            onRaInputChange={handleRaChange}
            decInput={decInput}
            onDecInputChange={handleDecChange}
            fov={fov}
            onFovChange={setFov}
            band={band}
            onBandChange={setBand}
            selectedTarget={selectedTarget}
            onSelectTarget={handleSelectTarget}
            onSubmitSearch={navigateToViewer}
            recentSearches={recentSearches}
            onSelectRecent={handleSelectRecent}
            onClearRecent={handleClearRecent}
          />
        </motion.div>
      </section>
    </PageTransition>
  );
}
