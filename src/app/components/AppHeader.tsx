"use client";

import { useSession, signOut } from "@/app/components/FirebaseAuthProvider";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import { useEffect, useState } from "react";

export default function AppHeader() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration issues by not rendering auth-dependent elements until mounted
  if (!mounted) return null;

  // The header should no longer be hidden on public pages, so the theme toggle is global
  const isAuthPage = pathname.startsWith("/auth/");
  if (isAuthPage) {
    return null; // Keep it hidden only during login/signup flows themselves
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-screen-xl px-4 flex h-14 items-center">
        {/* Left side - Brand */}
        <div className="flex-none">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-lg">EchoOps</span>
          </Link>
        </div>

        {/* Center - Navigation (takes up remaining space and centers items) */}
        <div className="flex-1 flex justify-center">
          {session?.user && (
            <nav className="flex items-center space-x-8">
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === "/dashboard"
                    ? "text-primary"
                    : "text-foreground/60"
                  }`}
              >
                Dashboard
              </Link>
              <Link
                href="/projects/azure"
                className={`text-sm font-medium transition-colors hover:text-primary ${pathname.startsWith("/projects")
                    ? "text-primary"
                    : "text-foreground/60"
                  }`}
                target="_self"
              >
                Projects
              </Link>
              <Link
                href="/settings"
                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === "/settings"
                    ? "text-primary"
                    : "text-foreground/60"
                  }`}
              >
                Settings
              </Link>
            </nav>
          )}
        </div>

        {/* Right side - Theme toggle and auth state */}
        <div className="flex-none flex items-center gap-6">
          <ThemeToggle />

          {session?.user ? (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm font-medium text-foreground/60 hover:text-primary transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-foreground/60 hover:text-primary transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="text-sm font-medium button-primary px-3 py-1.5 h-auto rounded-md"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
