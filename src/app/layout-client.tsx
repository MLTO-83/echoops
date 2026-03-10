"use client";

import { Inter, Lexend, JetBrains_Mono } from "next/font/google";
import AppProviders from "./components/AppProviders";

// Load fonts
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <body
      style={{ backgroundColor: `rgb(var(--background))` }}
      className={`${inter.variable} ${lexend.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen transition-colors duration-300`}
    >
      {/* Dark mode background wrapper with explicit styling */}
      <div
        className="relative z-0 min-h-screen"
        style={{ backgroundColor: `rgb(var(--background))` }}
      >
        {/* Theme-based background with minimal accents */}
        <div className="fixed inset-0 z-[-1] bg-background" />

        {/* Gradient decorations */}
        <div className="fixed inset-0 z-[-1]">
          <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-purple-900/10 dark:bg-purple-900/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-900/10 dark:bg-blue-900/20 rounded-full blur-[100px]" />
        </div>

        <AppProviders>{children}</AppProviders>
      </div>
    </body>
  );
}
