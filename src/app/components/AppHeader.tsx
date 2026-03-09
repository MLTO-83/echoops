"use client";

import { useSession, signOut } from "@/app/components/FirebaseAuthProvider";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

export default function AppHeader() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Don't show on public pages (auth, root, about, how to, privacy, terms)
  const publicPages = ["/", "/about", "/how-to", "/privacy", "/terms"];

  if (publicPages.includes(pathname) || pathname.startsWith("/auth/")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-screen-xl px-4 flex h-14 items-center">
        {/* Left side - Brand */}
        <div className="flex-none">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-bold text-lg">Portavi</span>
          </Link>
        </div>

        {/* Center - Navigation (takes up remaining space and centers items) */}
        <div className="flex-1 flex justify-center">
          {session?.user && (
            <nav className="flex items-center space-x-8">
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === "/dashboard"
                    ? "text-primary"
                    : "text-foreground/60"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/projects/azure"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname.startsWith("/projects")
                    ? "text-primary"
                    : "text-foreground/60"
                }`}
                target="_self"
              >
                Projects
              </Link>
              <Link
                href="/settings"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === "/settings"
                    ? "text-primary"
                    : "text-foreground/60"
                }`}
              >
                Settings
              </Link>
            </nav>
          )}
        </div>

        {/* Right side - Theme toggle and sign out */}
        <div className="flex-none flex items-center gap-6">
          <ThemeToggle />

          {session?.user && (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm font-medium text-foreground/60 hover:text-primary transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
