"use client";

import React, { useState } from "react";
import { Check, Copy, Download, GraduationCap } from "lucide-react";
import { getCandidates } from "@/lib/candidates";
import { useSound } from "@/components/SoundProvider";

const CLASS_ACTIVITIES = [
  "Blink race: who finds the mover first",
  "Compare the Skies in pairs",
  "Discuss: why do near stars move more?",
];

export function ClassroomCard() {
  const { playSound } = useSound();
  const [copied, setCopied] = useState(false);

  const handleCopyClassLink = async () => {
    playSound("click");
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/training`
        : "/training";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleExportClassCandidates = () => {
    playSound("click");
    const json = JSON.stringify(getCandidates(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "candidates.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      aria-label="Educator classroom toolkit"
      className="glass rounded-3xl border border-[#FFB5A7]/35 bg-gradient-to-br from-[#FFB5A7]/[0.1] via-white/[0.05] to-[#C3B1E1]/[0.08] p-5 sm:p-6 shadow-[0_0_28px_rgba(255,181,167,0.12)]"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FFB5A7]/40 bg-[#FFB5A7]/15 px-3 py-1 text-xs font-semibold text-[#FFB5A7]">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
            Classroom
          </div>
          <h2 className="font-display text-lg font-bold text-[#EDEBFF]">
            Run sky activities with your class
          </h2>
          <ul className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
            {CLASS_ACTIVITIES.map((idea, index) => (
              <li
                key={idea}
                className="flex items-start gap-2 rounded-2xl border border-white/12 bg-[#0B0B1E]/55 px-3.5 py-2.5 text-xs text-[#EDEBFF]"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFB5A7]/20 font-display text-[11px] font-bold text-[#FFB5A7]">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{idea}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyClassLink}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#B5EAD7]/40 bg-[#B5EAD7]/15 px-4 py-2.5 text-xs font-semibold text-[#B5EAD7] transition-colors hover:bg-[#B5EAD7]/25"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                Class link copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy class link
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportClassCandidates}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-4 py-2.5 text-xs font-semibold text-[#EDEBFF] transition-colors hover:border-[#FFB5A7]/50 hover:bg-white/[0.14]"
          >
            <Download className="h-4 w-4 text-[#FFB5A7]" aria-hidden="true" />
            Export class candidates
          </button>
        </div>
      </div>
    </section>
  );
}
