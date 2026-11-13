# SPHEREx Cosmic Detective

**Cosmic Detective** is a public citizen-science web application built with **Next.js 15 (App Router)**, **TypeScript**, and **Tailwind CSS** to explore real NASA SPHEREx infrared sky images (`0.75–5.0 μm`) over time, blink multi-epoch sky frames to spot moving brown dwarfs and variable stars, inspect 102-channel infrared spectra, and log candidate leads.

Built for the **NASA Space Apps Challenge 2026 · Challenge: Planet X and SPHEREx**.

---

## Features

- **Home & Interactive 3D Planetary System (`/`)**:
  - Full-viewport hero with a client-side Three.js (`@react-three/fiber` + `@react-three/drei`) procedural banded exoplanet, Fresnel atmosphere glow, 1,500-particle ring system, instanced asteroid belt, orbiting moon, and meteor streaks.
  - Step-by-step detective workflow and featured benchmark targets with rotating CSS 3D spheres.
- **3D Celestial Sphere & Coordinate Explorer (`/explore`)**:
  - Interactive J2000 celestial sphere wireframe (RA meridians every `2h`, Dec parallels every `30°`) with pulsing markers for the 5 benchmark targets and smooth camera slewing.
  - Coordinate parser (`lib/coords.ts`) supporting both decimal degrees (`133.7951`, `-7.2451`) and sexagesimal (`08h55m10.83s`, `-07d14m42.5s`), Field of View slider (`2–15′`), and SPHEREx Band 1–6 filter chips.
- **Detective Viewer & Multi-Epoch Blinker (`/viewer`)**:
  - HTML5 `<canvas>` blink comparator with **Blink**, **Difference** (`|frame − frame0|` amplified), and **Trail** (rainbow multi-epoch tint) modes, zoom (`1×–8×`), pan, brightness/contrast stretch, invert, and pixel smoothing.
  - **Click-to-Investigate (`lib/motion.ts`)**: Sub-pixel brightness-weighted centroid tracker across all 4 telescope visits, computing total displacement (`px` and `″`), proper motion speed (`″/day`), direction vector, brightness variation (`%`), and automatic classification (`Mover`, `Changing brightness`, or `Still star`).
  - **Gaia Cross-Check & Candidate Logging**: One-click catalog lookup (`checkKnown`) and local candidate saving with a `128×128` pixelated crop thumbnail.
  - **102-Channel Infrared Spectrum**: Interactive `recharts` area plot (`0.75–5.0 μm`) with SPHEREx Bands `B1–B6`, molecular absorption bands (`H₂O`, `CO`, `CH₄`, `CO₂`), and CSV export.
- **Spot the Mover Training Mode (`/training`)**:
  - 4-level progressive game with procedural seeded star fields and a **Real Sky** toggle using SPHEREx target frames, live score counters, post-round observation quizzes, and 6 unlockable SVG achievement badges.
- **Candidates Board (`/candidates`)**:
  - Filterable and sortable board of saved detective leads with `128px` pixelated thumbnails, direction mini-arrows, relative timestamps, viewer deep links, confirmation modals, and `candidates.json` export.
- **Long-Scroll Mission Story (`/about`)**:
  - Explains the SPHEREx telescope, Clyde Tombaugh's 1930 discovery of Pluto via blink comparator, the 4-step IRSA cutout pipeline, benchmark targets, and open science credits.
- **Resilient Offline-First Data Layer (`lib/api.ts`)**:
  - Connects to `NEXT_PUBLIC_API_URL` when configured and automatically falls back to deterministic `512×512` multi-epoch frames and 102-point spectra in `/public/data`.

---

## Screenshots (Placeholders)

| Screen | Preview Placeholder |
| :--- | :--- |
| **Home — 3D Exoplanet & Featured Movers** | `docs/screenshots/home-preview.png` *(placeholder)* |
| **Explore — 3D Celestial Sphere & Coordinate Search** | `docs/screenshots/explore-preview.png` *(placeholder)* |
| **Detective Viewer — Blink Comparator & 102-Point Spectrum** | `docs/screenshots/viewer-preview.png` *(placeholder)* |
| **Training Mode — Spot the Mover Game & Badges** | `docs/screenshots/training-preview.png` *(placeholder)* |
| **Candidates Board — Vetted Citizen Science Leads** | `docs/screenshots/candidates-preview.png` *(placeholder)* |

---

## How to Run Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables (optional)**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

3. **Regenerate sample data & 512×512 star-field PNGs (optional)**:
   ```bash
   npm run generate-data
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

5. **Run linter and production build**:
   ```bash
   npm run lint
   npm run build
   ```

---

## Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Optional backend API base URL for live IRSA cutouts and catalog cross-matching. Leave empty to use built-in `/public/data` sample archives. | `""` (empty) |
| `NEXT_PUBLIC_SITE_URL` | Optional canonical site URL used for Open Graph metadata generation. | `"http://localhost:3000"` |

---

## Data & Credits

- **SPHEREx Data**: NASA / JPL-Caltech / IPAC, via the **NASA/IPAC Infrared Science Archive (IRSA)** (`https://irsa.ipac.caltech.edu/`).
- **Astrometric & Infrared Reference Catalogs**: **Gaia (ESA)** and **WISE / NEOWISE (NASA)**.
- **Scientific Disclaimer**: We do not claim discoveries; candidates marked in this tool are leads for experts to check.
