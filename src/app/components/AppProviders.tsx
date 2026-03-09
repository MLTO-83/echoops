"use client";

import { ReactNode } from "react";
import { SessionProvider } from "@/app/components/SessionProvider";
import ThemeProvider from "@/app/components/ThemeProvider";
import AppHeader from "@/app/components/AppHeader";

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <AppHeader />
        <main className="min-h-screen">{children}</main>
      </ThemeProvider>
    </SessionProvider>
  );
}
