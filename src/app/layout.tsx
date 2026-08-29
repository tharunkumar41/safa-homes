import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono,  } from "next/font/google";
import "./globals.css";
import { ThemeProvider, ThemeInitScript } from "./ThemeProvider";
import Providers from "./providers";

const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SafaHomes — Parametric Floor Plan Studio",
  description:
    "Generate dimension-perfect 2D blueprints and interactive 3D walkthroughs of your dream home in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <head>
        <ThemeInitScript />
      </head>
      <body
        className="min-h-full flex flex-col"
        style={{ fontFamily: "var(--font-body)" }}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <Providers>   {/* <-- wrap children with Providers */}
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
