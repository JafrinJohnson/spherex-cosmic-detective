import React from "react";
import Link from "next/link";
import { Telescope, ExternalLink, Radio } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t border-white/10 bg-[#0B0B1E]/60 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <Telescope className="w-4 h-4 text-pastel-lavender" />
            <span className="font-heading font-semibold text-sm tracking-wider text-cosmic-text">
              SPHEREx COSMIC DETECTIVE
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-pastel-mint/15 text-pastel-mint border border-pastel-mint/30">
              <Radio className="w-3 h-3" />
              0.75 – 5.0 μm All-Sky Spectral Survey
            </span>
          </div>
          <p className="text-sm text-cosmic-muted font-medium">
            Data: NASA / JPL-Caltech / IPAC — SPHEREx via IRSA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs text-cosmic-muted">
          <Link href="/explore" className="hover:text-cosmic-text transition-colors">
            Target Catalog
          </Link>
          <Link href="/viewer" className="hover:text-cosmic-text transition-colors">
            Multi-Epoch Blinker
          </Link>
          <Link href="/training" className="hover:text-cosmic-text transition-colors">
            Cadet Training
          </Link>
          <Link href="/candidates" className="hover:text-cosmic-text transition-colors">
            Candidate Log
          </Link>
          <a
            href="https://irsa.ipac.caltech.edu/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-pastel-sky hover:underline"
          >
            <span>IPAC / IRSA Archive</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </footer>
  );
}

