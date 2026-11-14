"use client";

import React, { useEffect, useRef, useState } from "react";
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
  User,
  LogOut,
  ChevronDown,
  UserPlus,
  LogIn,
} from "lucide-react";
import { useSound } from "@/components/SoundProvider";
import { useAuth } from "@/context/AuthProvider";
import { getFirstName, getInitials } from "@/lib/auth";
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

const ROLE_CHIP_STYLES: Record<string, string> = {
  student: "border-[#B5EAD7]/45 bg-[#B5EAD7]/15 text-[#B5EAD7]",
  educator: "border-[#FFB5A7]/45 bg-[#FFB5A7]/15 text-[#FFB5A7]",
  explorer: "border-[#A2D2FF]/45 bg-[#A2D2FF]/15 text-[#A2D2FF]",
};

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [candidateCount, setCandidateCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { playSound } = useSound();
  const { user, isGuest, signOut } = useAuth();

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

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

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

        {/* Right Actions: Open Blinker + Sign-in / User Avatar Dropdown */}
        <div className="hidden md:flex items-center gap-2.5">
          <Link
            href="/viewer?target=barnards-star"
            onClick={() => playSound("whoosh")}
            className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-peach"
          >
            Open Blinker
          </Link>

          {!user ? (
            <Link
              href={`/signin?next=${encodeURIComponent(pathname || "/")}`}
              onClick={() => playSound("click")}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-4 py-2 text-xs font-semibold text-[#EDEBFF] transition-colors hover:border-[#C3B1E1]/60 hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender"
            >
              <LogIn className="h-3.5 w-3.5 text-[#C3B1E1]" aria-hidden="true" />
              <span>Sign in</span>
            </Link>
          ) : (
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setDropdownOpen((prev) => !prev);
                }}
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
                className="min-h-[44px] inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.08] pl-1.5 pr-3.5 py-1.5 text-xs font-semibold text-[#EDEBFF] transition-colors hover:border-[#C3B1E1]/60 hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full font-display text-xs font-bold text-[#0B0B1E]"
                  style={{
                    backgroundColor: isGuest
                      ? "#A2D2FF"
                      : user.avatarColor || "#C3B1E1",
                  }}
                >
                  {isGuest ? "G" : getInitials(user.name)}
                </span>
                <span>{isGuest ? "Guest" : getFirstName(user.name)}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[#CFCBEA] transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    role="menu"
                    className="glass absolute right-0 mt-2.5 w-64 rounded-3xl border border-white/20 bg-[#120E2E]/95 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.65)] backdrop-blur-xl"
                  >
                    <div className="border-b border-white/10 pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display text-sm font-bold text-[#EDEBFF] truncate">
                          {isGuest ? "Guest" : user.name}
                        </p>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize ${
                            ROLE_CHIP_STYLES[user.role] ||
                            ROLE_CHIP_STYLES.explorer
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                      {!isGuest && user.username && (
                        <p className="mt-0.5 font-mono text-xs text-[#CFCBEA] truncate">
                          @{user.username}
                        </p>
                      )}
                    </div>

                    <div className="mt-2.5 flex flex-col gap-1">
                      <Link
                        href="/training"
                        role="menuitem"
                        onClick={() => {
                          playSound("click");
                          setDropdownOpen(false);
                        }}
                        className="flex min-h-[40px] items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-medium text-[#EDEBFF] transition-colors hover:bg-white/[0.08]"
                      >
                        <GraduationCap
                          className="h-4 w-4 text-[#B5EAD7]"
                          aria-hidden="true"
                        />
                        My progress
                      </Link>

                      <Link
                        href="/candidates"
                        role="menuitem"
                        onClick={() => {
                          playSound("click");
                          setDropdownOpen(false);
                        }}
                        className="flex min-h-[40px] items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-medium text-[#EDEBFF] transition-colors hover:bg-white/[0.08]"
                      >
                        <Crosshair
                          className="h-4 w-4 text-[#FFB5A7]"
                          aria-hidden="true"
                        />
                        Candidates
                      </Link>

                      {isGuest ? (
                        <Link
                          href="/signin?tab=signup"
                          role="menuitem"
                          onClick={() => {
                            playSound("click");
                            setDropdownOpen(false);
                          }}
                          className="flex min-h-[40px] items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-semibold text-[#A2D2FF] transition-colors hover:bg-white/[0.08]"
                        >
                          <UserPlus
                            className="h-4 w-4 text-[#A2D2FF]"
                            aria-hidden="true"
                          />
                          Create account
                        </Link>
                      ) : (
                        <Link
                          href="/profile"
                          role="menuitem"
                          onClick={() => {
                            playSound("click");
                            setDropdownOpen(false);
                          }}
                          className="flex min-h-[40px] items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-medium text-[#EDEBFF] transition-colors hover:bg-white/[0.08]"
                        >
                          <User
                            className="h-4 w-4 text-[#C3B1E1]"
                            aria-hidden="true"
                          />
                          Profile
                        </Link>
                      )}

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          playSound("click");
                          setDropdownOpen(false);
                          signOut();
                        }}
                        className="mt-1 flex min-h-[40px] w-full items-center gap-2.5 rounded-2xl border-t border-white/10 px-3 pt-2.5 pb-2 text-left text-xs font-medium text-[#FFB5A7] transition-colors hover:bg-white/[0.08]"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
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

              {/* Mobile Auth Row */}
              <div className="mt-2 border-t border-white/10 pt-3 flex flex-col gap-2">
                {!user ? (
                  <Link
                    href={`/signin?next=${encodeURIComponent(pathname || "/")}`}
                    onClick={() => {
                      playSound("click");
                      setMobileOpen(false);
                    }}
                    className="min-h-[44px] px-4 py-3 rounded-2xl border border-white/20 bg-white/[0.08] text-sm font-semibold text-[#EDEBFF] flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4 text-[#C3B1E1]" />
                    Sign in
                  </Link>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full font-display text-xs font-bold text-[#0B0B1E]"
                          style={{
                            backgroundColor: isGuest
                              ? "#A2D2FF"
                              : user.avatarColor || "#C3B1E1",
                          }}
                        >
                          {isGuest ? "G" : getInitials(user.name)}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#EDEBFF]">
                            {isGuest ? "Guest" : user.name}
                          </p>
                          {!isGuest && user.username && (
                            <p className="text-[11px] font-mono text-[#CFCBEA]">
                              @{user.username}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize ${
                          ROLE_CHIP_STYLES[user.role] ||
                          ROLE_CHIP_STYLES.explorer
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>

                    {isGuest ? (
                      <Link
                        href="/signin?tab=signup"
                        onClick={() => {
                          playSound("click");
                          setMobileOpen(false);
                        }}
                        className="min-h-[44px] px-4 py-2.5 rounded-2xl border border-[#A2D2FF]/40 bg-[#A2D2FF]/15 text-xs font-semibold text-[#A2D2FF] flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Create account
                      </Link>
                    ) : (
                      <Link
                        href="/profile"
                        onClick={() => {
                          playSound("click");
                          setMobileOpen(false);
                        }}
                        className="min-h-[44px] px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.06] text-xs font-semibold text-[#EDEBFF] flex items-center justify-center gap-2"
                      >
                        <User className="w-4 h-4 text-[#C3B1E1]" />
                        Profile
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setMobileOpen(false);
                        signOut();
                      }}
                      className="min-h-[44px] px-4 py-2.5 rounded-2xl border border-[#FFB5A7]/35 bg-[#FFB5A7]/10 text-xs font-semibold text-[#FFB5A7] flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </>
                )}
              </div>

              <Link
                href="/viewer?target=barnards-star"
                onClick={() => {
                  playSound("whoosh");
                  setMobileOpen(false);
                }}
                className="min-h-[44px] mt-1 w-full py-3 rounded-2xl flex items-center justify-center text-xs font-semibold uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-peach"
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
