import React from "react";
import Link from "next/link";
import { Telescope, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t border-white/10 bg-[#07090F]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Telescope className="w-4 h-4 text-pastel-lavender" />
            <span className="font-heading font-medium text-base text-cosmic-text">
              Cosmic Detective
            </span>
          </div>
          <p className="text-sm text-cosmic-muted">
            Data: NASA / JPL-Caltech / IPAC, SPHEREx via IRSA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-cosmic-muted">
          <Link
            href="/explore"
            className="min-h-[44px] inline-flex items-center px-1 hover:text-cosmic-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender rounded-lg"
          >
            Explore
          </Link>
          <Link
            href="/viewer"
            className="min-h-[44px] inline-flex items-center px-1 hover:text-cosmic-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender rounded-lg"
          >
            Viewer
          </Link>
          <Link
            href="/training"
            className="min-h-[44px] inline-flex items-center px-1 hover:text-cosmic-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender rounded-lg"
          >
            Training
          </Link>
          <Link
            href="/candidates"
            className="min-h-[44px] inline-flex items-center px-1 hover:text-cosmic-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender rounded-lg"
          >
            Candidates
          </Link>
          <Link
            href="/about"
            className="min-h-[44px] inline-flex items-center px-1 hover:text-cosmic-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender rounded-lg"
          >
            About
          </Link>
          <a
            href="https://irsa.ipac.caltech.edu/"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center gap-1 px-1 text-pastel-sky hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender rounded-lg"
          >
            <span>IRSA Archive</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </footer>
  );
}
