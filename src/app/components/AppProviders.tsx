"use client";

import { ReactNode } from "react";
import { FirebaseAuthProvider } from "@/app/components/FirebaseAuthProvider";
import ThemeProvider from "@/app/components/ThemeProvider";
import AppHeader from "@/app/components/AppHeader";

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <FirebaseAuthProvider>
      <ThemeProvider>
        <AppHeader />
        <main className="min-h-screen">{children}</main>
      </ThemeProvider>
    </FirebaseAuthProvider>
  );
}
