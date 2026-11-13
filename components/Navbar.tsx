"use client";

import React, { useState } from "react";
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

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Sparkles, pillColor: "bg-[#C3B1E1]/25 border-[#C3B1E1]/50 text-[#EDEBFF]" },
  { href: "/explore", label: "Explore", icon: Compass, pillColor: "bg-[#A2D2FF]/25 border-[#A2D2FF]/50 text-[#EDEBFF]" },
  { href: "/training", label: "Training", icon: GraduationCap, pillColor: "bg-[#B5EAD7]/25 border-[#B5EAD7]/50 text-[#EDEBFF]" },
  { href: "/candidates", label: "Candidates", icon: Crosshair, pillColor: "bg-[#FFB5A7]/25 border-[#FFB5A7]/50 text-[#EDEBFF]" },
  { href: "/about", label: "About", icon: Info, pillColor: "bg-[#FFC8DD]/25 border-[#FFC8DD]/50 text-[#EDEBFF]" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { playSound } = useSound();

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-4 z-40 px-4 sm:px-8 max-w-7xl mx-auto w-full">
      <nav
        aria-label="Primary Navigation"
        className="glass rounded-full px-5 py-3 flex items-center justify-between shadow-glass-glow"
      >
        {/* Brand Logo */}
        <Link
          href="/"
          onClick={() => {
            playSound("click");
            setMobileOpen(false);
          }}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <span className="w-9 h-9 rounded-full bg-white/[0.09] border border-white/20 flex items-center justify-center group-hover:border-pastel-lavender/60 transition-colors">
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
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => playSound("click")}
                className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  active
                    ? `${item.pillColor} border shadow-sm`
                    : "text-cosmic-muted hover:text-cosmic-text hover:bg-white/[0.05]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Direct Launch into Multi-Epoch Blinker */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/viewer?target=barnards-star"
            onClick={() => playSound("whoosh")}
            className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 transition-opacity"
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
          className="md:hidden p-2.5 rounded-full bg-white/[0.07] border border-white/15 text-cosmic-text hover:bg-white/[0.14] focus:outline-none"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile Animated Glass Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="md:hidden mt-3 glass p-5 shadow-glass-glow"
          >
            <div className="flex flex-col gap-2">
              {NAV_LINKS.map((item) => {
                const active = isLinkActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      playSound("click");
                      setMobileOpen(false);
                    }}
                    className={`px-4 py-3 rounded-2xl text-sm font-medium flex items-center justify-between transition-colors ${
                      active
                        ? `${item.pillColor} border`
                        : "text-cosmic-muted hover:text-cosmic-text hover:bg-white/[0.05]"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      {item.label}
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
                className="mt-2 w-full py-3 rounded-2xl text-center text-xs font-semibold uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow"
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

