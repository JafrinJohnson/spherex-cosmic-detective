import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { SoundProvider } from "@/components/SoundProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SPHEREx Cosmic Detective — NASA Infrared Time-Domain Sky Explorer",
  description:
    "Explore multi-epoch NASA SPHEREx infrared sky images (0.75–5.0 μm) over time, blink frames to spot high-proper-motion brown dwarfs and variable stars, and inspect 102-channel spectra.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} dark`}
    >
      <body className="min-h-screen flex flex-col relative selection:bg-pastel-lavender/30 selection:text-cosmic-text">
        {/* Lightweight CSS Twinkling Star Layer */}
        <div className="starfield-layer" aria-hidden="true" />

        <SoundProvider>
          <Navbar />
          <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-8">
            {children}
          </main>
          <Footer />
        </SoundProvider>
      </body>
    </html>
  );
}

