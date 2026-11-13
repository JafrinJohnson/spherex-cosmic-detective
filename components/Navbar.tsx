"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Menu,
  X,
  Telescope,
  Compass,
  GraduationCap,
  Crosshair,
  Info,
  Sparkles,
} from "lucide-react";
import { useSound } from "@/components/SoundProvider";
import { getCandidates, CANDIDATES_UPDATED_EVENT } from "@/lib/candidates";

const NAV_LINKS = [
  {
    href: "/",
    label: "Home",
    icon: Sparkles,
    pillColor: "bg-[#C3B1E1]/25 border-[#C3B1E1]/50 text-[#EDEBFF]",
  },
  {
    href: "/explore",
    label: "Explore",
    icon: Compass,
    pillColor: "bg-[#A2D2FF]/25 border-[#A2D2FF]/50 text-[#EDEBFF]",
  },
  {
    href: "/training",
    label: "Training",
    icon: GraduationCap,
    pillColor: "bg-[#B5EAD7]/25 border-[#B5EAD7]/50 text-[#EDEBFF]",
  },
  {
    href: "/candidates",
    label: "Candidates",
    icon: Crosshair,
    pillColor: "bg-[#FFB5A7]/25 border-[#FFB5A7]/50 text-[#EDEBFF]",
  },
  {
    href: "/about",
    label: "About",
    icon: Info,
    pillColor: "bg-[#FFC8DD]/25 border-[#FFC8DD]/50 text-[#EDEBFF]",
  },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [candidateCount, setCandidateCount] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const { playSound } = useSound();

  useEffect(() => {
    const syncCount = () => {
      setCandidateCount(getCandidates().length);
    };
    syncCount();
    window.addEventListener(CANDIDATES_UPDATED_EVENT, syncCount);
    window.addEventListener("storage", syncCount);
    return () => {
      window.removeEventListener(CANDIDATES_UPDATED_EVENT, syncCount);
      window.removeEventListener("storage", syncCount);
    };
  }, [pathname]);

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-4 z-40 px-4 sm:px-8 max-w-7xl mx-auto w-full">
      <nav
        aria-label="Primary Navigation"
        className="glass rounded-full px-4 sm:px-5 py-2.5 flex items-center justify-between shadow-glass-glow"
      >
        {/* Brand Logo */}
        <Link
          href="/"
          onClick={() => {
            playSound("click");
            setMobileOpen(false);
          }}
          className="min-h-[44px] flex items-center gap-3 group rounded-full px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender"
        >
          <span className="w-9 h-9 rounded-full bg-white/[0.09] border border-white/20 flex items-center justify-center group-hover:border-pastel-lavender/60 transition-colors shrink-0">
            <Telescope className="w-4 h-4 text-pastel-peach" />
          </span>
          <div className="flex flex-col">
            <span className="font-heading font-bold tracking-wider text-sm sm:text-base text-gradient-headline">
              COSMIC DETECTIVE
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-cosmic-muted hidden sm:block">
              NASA SPHEREx Sky Survey
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1.5">
          {NAV_LINKS.map((item) => {
            const active = isLinkActive(item.href);
            const Icon = item.icon;
            const isCandidates = item.href === "/candidates";
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => playSound("click")}
                aria-current={active ? "page" : undefined}
                className={`min-h-[44px] relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender ${
                  active
                    ? `${item.pillColor} border shadow-sm`
                    : "text-cosmic-muted hover:text-cosmic-text hover:bg-white/[0.05]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {isCandidates && candidateCount > 0 && (
                  <span
                    aria-label={`${candidateCount} saved candidates`}
                    className="ml-0.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold bg-[#FFB5A7] text-[#0B0B1E] shadow-sm"
                  >
                    {candidateCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Direct Launch into Multi-Epoch Blinker */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/viewer?target=barnards-star"
            onClick={() => playSound("whoosh")}
            className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-peach"
          >
            Open Blinker
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => {
            playSound("click");
            setMobileOpen((prev) => !prev);
          }}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation menu"
          className="md:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2.5 rounded-full bg-white/[0.07] border border-white/15 text-cosmic-text hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile Animated Glass Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 0, y: -12, scale: 0.98 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -12, scale: 0.98 }
            }
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="md:hidden mt-3 glass p-5 shadow-glass-glow"
          >
            <div className="flex flex-col gap-2">
              {NAV_LINKS.map((item) => {
                const active = isLinkActive(item.href);
                const Icon = item.icon;
                const isCandidates = item.href === "/candidates";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      playSound("click");
                      setMobileOpen(false);
                    }}
                    aria-current={active ? "page" : undefined}
                    className={`min-h-[44px] px-4 py-3 rounded-2xl text-sm font-medium flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender ${
                      active
                        ? `${item.pillColor} border`
                        : "text-cosmic-muted hover:text-cosmic-text hover:bg-white/[0.05]"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                      {isCandidates && candidateCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold bg-[#FFB5A7] text-[#0B0B1E]">
                          {candidateCount}
                        </span>
                      )}
                    </span>
                    {active && (
                      <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10">
                        Active
                      </span>
                    )}
                  </Link>
                );
              })}

              <Link
                href="/viewer?target=barnards-star"
                onClick={() => {
                  playSound("whoosh");
                  setMobileOpen(false);
                }}
                className="min-h-[44px] mt-2 w-full py-3 rounded-2xl flex items-center justify-center text-xs font-semibold uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-peach"
              >
                Launch Sky Blinker
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
