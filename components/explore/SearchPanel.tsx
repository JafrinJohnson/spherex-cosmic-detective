"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  HelpCircle,
  X,
  ArrowRight,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import type { Target } from "@/types";
import { parseRA, parseDec, formatRA, formatDec } from "@/lib/coords";
import { useSound } from "@/components/SoundProvider";

export interface RecentSearchEntry {
  id: string;
  label: string;
  ra: number;
  dec: number;
  fov: number;
  band: string;
  targetId?: string;
}

export const INFRARED_BANDS = [
  {
    id: "all",
    label: "All bands (stacked)",
    range: "0.75–5.00 µm",
    accent: "#C3B1E1",
  },
  {
    id: "1",
    label: "Band 1 0.75–1.09 µm",
    range: "0.75–1.09 µm",
    accent: "#A2D2FF",
  },
  {
    id: "2",
    label: "Band 2 1.10–1.62 µm",
    range: "1.10–1.62 µm",
    accent: "#B5EAD7",
  },
  {
    id: "3",
    label: "Band 3 1.63–2.41 µm",
    range: "1.63–2.41 µm",
    accent: "#C3B1E1",
  },
  {
    id: "4",
    label: "Band 4 2.42–3.82 µm",
    range: "2.42–3.82 µm",
    accent: "#FFC8DD",
  },
  {
    id: "5",
    label: "Band 5 3.83–4.41 µm",
    range: "3.83–4.41 µm",
    accent: "#FFB5A7",
  },
  {
    id: "6",
    label: "Band 6 4.42–5.00 µm",
    range: "4.42–5.00 µm",
    accent: "#FFD166",
  },
];

interface SearchPanelProps {
  targets: Target[];
  objectQuery: string;
  onObjectQueryChange: (val: string) => void;
  raInput: string;
  onRaInputChange: (val: string) => void;
  decInput: string;
  onDecInputChange: (val: string) => void;
  fov: number;
  onFovChange: (val: number) => void;
  band: string;
  onBandChange: (val: string) => void;
  selectedTarget: Target | null;
  onSelectTarget: (target: Target) => void;
  onSubmitSearch: (params: {
    ra: number;
    dec: number;
    fov: number;
    band: string;
    targetId?: string;
    label: string;
  }) => void;
  recentSearches: RecentSearchEntry[];
  onSelectRecent: (entry: RecentSearchEntry) => void;
  onClearRecent: () => void;
}

export function SearchPanel({
  targets,
  objectQuery,
  onObjectQueryChange,
  raInput,
  onRaInputChange,
  decInput,
  onDecInputChange,
  fov,
  onFovChange,
  band,
  onBandChange,
  selectedTarget,
  onSelectTarget,
  onSubmitSearch,
  recentSearches,
  onSelectRecent,
  onClearRecent,
}: SearchPanelProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const { playSound } = useSound();

  const parsedRa = parseRA(raInput);
  const parsedDec = parseDec(decInput);
  const isRaValid = parsedRa !== null;
  const isDecValid = parsedDec !== null;
  const isFormValid = isRaValid && isDecValid;

  const filteredSuggestions = targets.filter((t) => {
    const q = objectQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.nickname.toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q)
    );
  });

  // Close autocomplete dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedRa === null || parsedDec === null) return;
    playSound("whoosh");

    const label = selectedTarget
      ? selectedTarget.name
      : `${parsedRa.toFixed(2)}°, ${parsedDec >= 0 ? "+" : ""}${parsedDec.toFixed(2)}°`;

    onSubmitSearch({
      ra: Number(parsedRa.toFixed(4)),
      dec: Number(parsedDec.toFixed(4)),
      fov,
      band,
      targetId: selectedTarget?.id,
      label,
    });
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleFormSubmit}
        className="glass p-6 sm:p-8 space-y-6 relative"
        noValidate
      >
        {/* Top Row: Form Title + "What are RA and Dec?" Help Button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-pastel-peach" />
            <h2 className="font-heading text-lg sm:text-xl font-bold text-cosmic-text">
              Sky Coordinate Search
            </h2>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setHelpOpen((prev) => !prev);
              }}
              aria-expanded={helpOpen}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 text-pastel-sky focus:outline-none focus:ring-2 focus:ring-pastel-sky/60 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>What are RA and Dec?</span>
            </button>

            <AnimatePresence>
              {helpOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 mt-2 w-72 sm:w-80 z-30 glass p-4 rounded-2xl bg-[#0B0B1E]/95 border border-white/25 shadow-glass-glow text-xs text-cosmic-text leading-relaxed"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-heading font-semibold text-pastel-sky">
                      Sky Coordinates Explained
                    </span>
                    <button
                      type="button"
                      onClick={() => setHelpOpen(false)}
                      aria-label="Close help popover"
                      className="text-cosmic-muted hover:text-cosmic-text"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-cosmic-muted">
                    They are like longitude and latitude, but for the sky. RA
                    goes around the sky (0–360°), Dec goes from the south pole
                    (−90°) to the north pole (+90°).
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Field 1: Object Name Autocomplete */}
        <div ref={autocompleteRef} className="relative space-y-1.5">
          <label
            htmlFor="object-name-input"
            className="block text-xs font-medium text-cosmic-text"
          >
            Object name
          </label>
          <div className="relative">
            <input
              id="object-name-input"
              type="text"
              value={objectQuery}
              onFocus={() => setDropdownOpen(true)}
              onChange={(e) => {
                onObjectQueryChange(e.target.value);
                setDropdownOpen(true);
              }}
              placeholder="Search Barnard's Star, The Coldest Neighbour, RW Aurigae..."
              autoComplete="off"
              className="w-full px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/15 text-sm text-cosmic-text placeholder:text-cosmic-muted/60 focus:outline-none focus:ring-2 focus:ring-pastel-lavender focus:border-pastel-lavender transition-all"
            />
            {objectQuery && (
              <button
                type="button"
                onClick={() => {
                  onObjectQueryChange("");
                  setDropdownOpen(true);
                }}
                aria-label="Clear object name"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-cosmic-muted hover:text-cosmic-text focus:outline-none focus:ring-2 focus:ring-pastel-lavender rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          <AnimatePresence>
            {dropdownOpen && filteredSuggestions.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                role="listbox"
                aria-label="Matching cosmic targets"
                className="absolute left-0 right-0 top-full mt-1.5 z-30 glass bg-[#0B0B1E]/95 border border-white/20 rounded-2xl p-2 shadow-glass-glow max-h-60 overflow-y-auto divide-y divide-white/5"
              >
                {filteredSuggestions.map((t) => (
                  <li key={t.id} role="option" aria-selected={selectedTarget?.id === t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        onSelectTarget(t);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/[0.09] transition-colors flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-heading text-sm font-semibold text-cosmic-text flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: t.colors[0] }}
                          />
                          <span>{t.name}</span>
                          <span className="text-xs font-normal text-pastel-peach">
                            · {t.nickname}
                          </span>
                        </div>
                        <div className="text-[11px] text-cosmic-muted mt-0.5">
                          {t.type}
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-pastel-sky shrink-0">
                        {t.ra.toFixed(2)}°, {t.dec >= 0 ? "+" : ""}
                        {t.dec.toFixed(2)}°
                      </div>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* Fields 2 & 3: Right Ascension & Declination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Right Ascension */}
          <div className="space-y-1.5">
            <label
              htmlFor="ra-coord-input"
              className="block text-xs font-medium text-cosmic-text"
            >
              Right Ascension
            </label>
            <input
              id="ra-coord-input"
              type="text"
              value={raInput}
              onChange={(e) => onRaInputChange(e.target.value)}
              placeholder="133.7951 or 08h55m10.83s"
              aria-invalid={!isRaValid && raInput.trim().length > 0}
              aria-describedby="ra-helper-text"
              className={`w-full px-4 py-3 rounded-2xl bg-white/[0.06] border text-sm font-mono text-cosmic-text placeholder:text-cosmic-muted/50 focus:outline-none focus:ring-2 transition-all ${
                !isRaValid && raInput.trim().length > 0
                  ? "border-pastel-peach focus:ring-pastel-peach"
                  : "border-white/15 focus:ring-pastel-lavender focus:border-pastel-lavender"
              }`}
            />
            <div id="ra-helper-text" className="min-h-[24px] text-xs">
              {isRaValid ? (
                <div className="font-mono text-pastel-mint flex items-center justify-between">
                  <span>= {parsedRa.toFixed(4)}°</span>
                  <span className="text-cosmic-muted">
                    ({formatRA(parsedRa)})
                  </span>
                </div>
              ) : raInput.trim().length > 0 ? (
                <div className="text-pastel-peach flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Enter 0 to 360° or HHhMMmSSs.</span>
                </div>
              ) : (
                <span className="text-cosmic-muted">
                  Degrees (0 to 360) or HHhMMmSSs
                </span>
              )}
            </div>
          </div>

          {/* Declination */}
          <div className="space-y-1.5">
            <label
              htmlFor="dec-coord-input"
              className="block text-xs font-medium text-cosmic-text"
            >
              Declination
            </label>
            <input
              id="dec-coord-input"
              type="text"
              value={decInput}
              onChange={(e) => onDecInputChange(e.target.value)}
              placeholder="-7.2451 or -07d14m42.5s"
              aria-invalid={!isDecValid && decInput.trim().length > 0}
              aria-describedby="dec-helper-text"
              className={`w-full px-4 py-3 rounded-2xl bg-white/[0.06] border text-sm font-mono text-cosmic-text placeholder:text-cosmic-muted/50 focus:outline-none focus:ring-2 transition-all ${
                !isDecValid && decInput.trim().length > 0
                  ? "border-pastel-peach focus:ring-pastel-peach"
                  : "border-white/15 focus:ring-pastel-lavender focus:border-pastel-lavender"
              }`}
            />
            <div id="dec-helper-text" className="min-h-[24px] text-xs">
              {isDecValid ? (
                <div className="font-mono text-pastel-mint flex items-center justify-between">
                  <span>
                    = {parsedDec >= 0 ? "+" : ""}
                    {parsedDec.toFixed(4)}°
                  </span>
                  <span className="text-cosmic-muted">
                    ({formatDec(parsedDec)})
                  </span>
                </div>
              ) : decInput.trim().length > 0 ? (
                <div className="text-pastel-peach flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Enter −90 to +90° or ±DDdMMmSSs.</span>
                </div>
              ) : (
                <span className="text-cosmic-muted">
                  Degrees (−90 to +90) or ±DDdMMmSSs
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Field 4: Field of View Slider (2 to 15 arcmin, default 5) */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="fov-slider"
              className="text-xs font-medium text-cosmic-text"
            >
              Field of view
            </label>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-pastel-sky/15 text-pastel-sky border border-pastel-sky/35">
              {fov} arcmin
            </span>
          </div>

          <input
            id="fov-slider"
            type="range"
            min={2}
            max={15}
            step={1}
            value={fov}
            onChange={(e) => onFovChange(Number(e.target.value))}
            className="w-full accent-[#A2D2FF] cursor-pointer h-2 bg-white/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-pastel-sky"
          />

          <div className="flex items-center justify-between text-[11px] text-cosmic-muted">
            <span>2&prime;</span>
            <span>Wider fields catch faster movers.</span>
            <span>15&prime;</span>
          </div>
        </div>

        {/* Field 5: Infrared Band Segmented Control */}
        <div className="space-y-2.5">
          <span
            id="ir-band-label"
            className="block text-xs font-medium text-cosmic-text"
          >
            Infrared band
          </span>

          <div
            role="radiogroup"
            aria-labelledby="ir-band-label"
            className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar"
          >
            {INFRARED_BANDS.map((item) => {
              const active = band === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    playSound("click");
                    onBandChange(item.id);
                  }}
                  style={{
                    backgroundColor: active ? `${item.accent}2E` : undefined,
                    borderColor: active ? item.accent : undefined,
                  }}
                  className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-pastel-lavender ${
                    active
                      ? "text-cosmic-text shadow-sm"
                      : "bg-white/[0.05] border-white/15 text-cosmic-muted hover:text-cosmic-text hover:bg-white/[0.1]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <div className="space-y-2 pt-2">
          <button
            type="submit"
            disabled={!isFormValid}
            className={`w-full py-4 px-6 rounded-full font-heading font-semibold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-pastel-peach ${
              isFormValid
                ? "bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 cursor-pointer"
                : "bg-white/10 text-cosmic-muted border border-white/15 cursor-not-allowed opacity-60"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Investigate this sky</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {!isFormValid && (
            <p className="text-center text-xs text-pastel-peach">
              Enter valid Right Ascension and Declination coordinates.
            </p>
          )}
        </div>
      </form>

      {/* RECENT SEARCHES */}
      {recentSearches.length > 0 && (
        <div className="glass p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-cosmic-muted">
              <Clock className="w-3.5 h-3.5 text-pastel-lavender" />
              <span>Recent searches</span>
            </div>

            <button
              type="button"
              onClick={() => {
                playSound("click");
                onClearRecent();
              }}
              className="text-xs font-medium text-pastel-peach hover:underline focus:outline-none focus:ring-2 focus:ring-pastel-peach rounded px-1"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {recentSearches.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  playSound("whoosh");
                  onSelectRecent(entry);
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 text-cosmic-text flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-lavender"
              >
                <span>{entry.label}</span>
                <span className="text-[10px] font-mono text-cosmic-muted">
                  ({entry.fov}&prime; · {entry.band === "all" ? "All" : `B${entry.band}`})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

