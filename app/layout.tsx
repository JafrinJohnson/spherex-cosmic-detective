import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { SoundProvider } from "@/components/SoundProvider";
import { AuthProvider } from "@/context/AuthProvider";
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

export const viewport: Viewport = {
  themeColor: "#0B0B1E",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    default: "Cosmic Detective — NASA SPHEREx Infrared Sky Explorer",
    template: "%s · Cosmic Detective",
  },
  description:
    "Explore multi-epoch NASA SPHEREx infrared sky images (0.75–5.0 μm) over time, blink frames to spot high-proper-motion brown dwarfs and variable stars, and inspect 102-channel spectra.",
  openGraph: {
    title: "Cosmic Detective — NASA SPHEREx Infrared Sky Explorer",
    description:
      "Compare real NASA SPHEREx infrared sky images over time and spot hidden worlds that move.",
    type: "website",
    siteName: "Cosmic Detective",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cosmic Detective — NASA SPHEREx Infrared Sky Explorer",
    description:
      "Compare real NASA SPHEREx infrared sky images over time and spot hidden worlds that move.",
  },
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
      <body className="min-h-screen flex flex-col relative overflow-x-hidden selection:bg-pastel-lavender/30 selection:text-cosmic-text">
        {/* Skip to Content Link for Keyboard Accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-5 focus:py-3 focus:rounded-full focus:bg-infrared-gradient focus:text-[#0B0B1E] focus:font-semibold focus:text-xs focus:uppercase focus:tracking-wider focus:shadow-infrared-glow focus:outline-none"
        >
          Skip to content
        </a>

        {/* Lightweight CSS Twinkling Star Layer */}
        <div className="starfield-layer" aria-hidden="true" />

        <SoundProvider>
          <AuthProvider>
            <Navbar />
            <main
              id="main-content"
              tabIndex={-1}
              className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-8 focus:outline-none"
            >
              {children}
            </main>
            <Footer />
          </AuthProvider>
        </SoundProvider>
      </body>
    </html>
  );
}
