# SPHEREx Cosmic Detective

A public web tool built with **Next.js 15 (App Router)**, **TypeScript**, and **Tailwind CSS** to explore NASA SPHEREx infrared sky images (`0.75–5.0 μm`) over time, blink multi-epoch frames to spot high-proper-motion brown dwarfs and variable stars, and inspect 102-channel infrared spectra.

---

## Features

- **Multi-Epoch Frame Blinker (`/viewer`)**: Flip through 4 chronological 512×512 infrared sky frames (`frame-01.png` through `frame-04.png`) with adjustable blink cadence, interactive astrometric reticle flagging, and URL parameter support (`?ra=&dec=&target=`).
- **102-Channel Infrared Spectrophotometry**: Interactive 0.75–5.0 μm Spectral Energy Distribution (SED) visualizer powered by `recharts`, highlighting methane (`CH4`), water (`H2O`), and circumstellar dust features.
- **Interactive 3D Celestial Sphere (`/`)**: Client-side Three.js (`@react-three/fiber` + `@react-three/drei`) J2000 sky globe dynamically loaded with `ssr: false`.
- **Cone Search & Target Catalog (`/explore`)**: Filter priority targets (`fast`, `brown-dwarf`, `variable`) or query any Right Ascension / Declination (`searchSky(ra, dec, fovArcmin)`).
- **Cadet Calibration Academy (`/training`)**: Interactive training modules with celebratory `canvas-confetti` feedback.
- **Citizen Science Candidate Log (`/candidates`)**: Local vetting console for flagged moving and variable detections.
- **Resilient Data Layer (`lib/api.ts`)**: Reads `process.env.NEXT_PUBLIC_API_URL`. When empty or unreachable, automatically falls back to `/public/data` sample archives and displays a `"Sample data"` badge whenever `meta.source === "placeholder"`.
- **Telemetry Audio (`SoundProvider`)**: Ambient loop (activated only after the first user click) and UI sound effects (`click`, `whoosh`, `success`) via `howler`, persisted in `localStorage`.

---

## Setup & Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables (optional)**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Leave `NEXT_PUBLIC_API_URL=` empty to use the built-in local sample data in `/public/data`, or set it to your backend base URL.

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

## Data Credits & Attribution

**Data: NASA / JPL-Caltech / IPAC — SPHEREx via IRSA**

- **Mission**: NASA SPHEREx (Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer), managed by the Jet Propulsion Laboratory (JPL) / California Institute of Technology.
- **Archive**: NASA/IPAC Infrared Science Archive (IRSA) at Caltech (`https://irsa.ipac.caltech.edu/`).

