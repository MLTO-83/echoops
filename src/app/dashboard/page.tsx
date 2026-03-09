"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import EmailVerificationBanner from "../components/EmailVerificationBanner";
import WelcomeModal from "../components/WelcomeModal";

// Dynamically import the UserAllocationContainer to prevent server/client mismatch
const UserAllocationContainer = dynamic(
  () => import("../components/UserAllocationContainer"),
  {
    ssr: true,
    loading: () => (
      <div className="w-full bg-white text-black rounded-2xl shadow-lg p-6 min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isHovering, setIsHovering] = useState(-1);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Check if this is the user's first login and they need email verification
  useEffect(() => {
    if (session?.user?.email && !session.user.emailVerified) {
      // Check localStorage to see if we've shown the welcome modal before
      const hasShownWelcomeModal = localStorage.getItem(
        `portavi-welcomed-${session.user.id}`
      );
      if (!hasShownWelcomeModal) {
        setIsFirstLogin(true);
        // Mark that we've shown the welcome modal to this user
        localStorage.setItem(`portavi-welcomed-${session.user.id}`, "true");
      }
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center card-spatial animate-pulse">
          <h1 className="font-display font-bold text-4xl mb-4 relative">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Loading...
            </span>
          </h1>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-6 md:p-12">
      {/* Welcome modal for first-time users */}
      <WelcomeModal session={session} isFirstLogin={isFirstLogin} />

      {/* Floating decoration elements */}
      <div className="fixed top-20 left-10 w-20 h-20 bg-primary/20 rounded-full animate-float blur-xl"></div>
      <div className="fixed bottom-20 right-10 w-32 h-32 bg-secondary/20 rounded-full animate-pulse-slow blur-xl"></div>

      <div className="w-full max-w-5xl space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
          <div className="space-y-2">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white tracking-tight relative z-10">
              Dashboard
            </h1>
            <p className="text-gray-800 dark:text-white max-w-lg">
              Welcome back to your Azure DevOps projects workspace
            </p>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="button-neo bg-red-500 hover:bg-red-600 text-white"
          >
            Sign Out
          </button>
        </div>

        {/* Email verification banner */}
        <EmailVerificationBanner session={session} />

        <div className="card-spatial relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-primary/10 rounded-full blur-2xl"></div>

          <h2 className="font-display text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Welcome, {session?.user?.name || "User"}!
          </h2>
          <p className="text-gray-800 dark:text-white">
            You are now signed in to Portavi. Manage your Azure DevOps projects
            and track development progress.
          </p>
        </div>

        {/* User Allocation Chart */}
        <div className="card-spatial relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-primary/10 rounded-full blur-2xl"></div>
          <Suspense
            fallback={
              <div className="w-full min-h-[400px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            }
          >
            <UserAllocationContainer />
          </Suspense>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <div
            className={`card-neo group transition-all duration-300 ease-out p-8 relative overflow-hidden
                       ${
                         isHovering === 0
                           ? "transform -translate-y-2 shadow-neo-hover dark:shadow-neo-white-hover"
                           : "shadow-neo dark:shadow-neo-white"
                       }`}
            onMouseEnter={() => setIsHovering(0)}
            onMouseLeave={() => setIsHovering(-1)}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl transform translate-x-12 -translate-y-1/2 group-hover:translate-x-8 transition-all duration-700"></div>

            <div className="relative z-10">
              <h3 className="text-2xl font-bold font-display text-gray-900 dark:text-white mb-4">
                Azure DevOps Projects
              </h3>
              <p className="text-gray-800 dark:text-white mb-6">
                Connect to your Azure DevOps account to view and manage your
                projects.
              </p>
              <Link
                href="/projects/azure"
                className="button-primary inline-flex items-center group"
              >
                <span>View Azure Projects</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-2 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </Link>
            </div>
          </div>

          <div
            className={`card-neo group transition-all duration-300 ease-out p-8 relative overflow-hidden
                      ${
                        isHovering === 1
                          ? "transform -translate-y-2 shadow-neo-hover dark:shadow-neo-white-hover"
                          : "shadow-neo dark:shadow-neo-white"
                      }`}
            onMouseEnter={() => setIsHovering(1)}
            onMouseLeave={() => setIsHovering(-1)}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-xl transform translate-x-12 -translate-y-1/2 group-hover:translate-x-8 transition-all duration-700"></div>

            <div className="relative z-10">
              <h3 className="text-2xl font-bold font-display text-gray-900 dark:text-white mb-4">
                Settings
              </h3>
              <p className="text-gray-800 dark:text-white mb-6">
                Configure Azure DevOps integration with Personal Access Token
                (PAT)
              </p>
              <Link
                href="/settings"
                className="button-accent inline-flex items-center group"
              >
                <span>Manage Settings</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-2 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
