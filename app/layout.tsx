import type { Metadata, Viewport } from "next";
import "@fontsource/cinzel/500.css";
import "@fontsource/cinzel/700.css";
import "@fontsource-variable/sora";
import "./globals.css";
import { SoundProvider } from "@/components/SoundProvider";
import { AuthProvider } from "@/context/AuthProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const viewport: Viewport = {
  themeColor: "#07090F",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    default: "Cosmic Detective",
    template: "%s · Cosmic Detective",
  },
  description:
    "Explore multi-epoch infrared sky images (0.75 to 5.0 μm) over time, blink frames to spot moving brown dwarfs and variable stars, and inspect 102-channel spectra.",
  openGraph: {
    title: "Cosmic Detective",
    description:
      "Compare infrared sky images over time and spot hidden worlds that move.",
    type: "website",
    siteName: "Cosmic Detective",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cosmic Detective",
    description:
      "Compare infrared sky images over time and spot hidden worlds that move.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col relative overflow-x-hidden selection:bg-pastel-lavender/30 selection:text-cosmic-text">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-5 focus:py-3 focus:rounded-full focus:bg-infrared-gradient focus:text-[#07090F] focus:font-medium focus:text-sm focus:shadow-infrared-glow focus:outline-none"
        >
          Skip to content
        </a>

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
