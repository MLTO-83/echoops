"use client";

import { signInWithPopup } from "firebase/auth";
import { auth, githubProvider, googleProvider } from "@/lib/firebase/client";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");

  const handleGitHubSignIn = async () => {
    try {
      await signInWithPopup(auth, githubProvider);
      router.push(callbackUrl);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Authentication failed";
      router.push(`/auth/error?error=${encodeURIComponent(errorMessage)}`);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push(callbackUrl);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Authentication failed";
      router.push(`/auth/error?error=${encodeURIComponent(errorMessage)}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center p-6 md:p-12">
      {/* Floating decoration elements */}
      <div className="fixed top-20 left-10 w-24 h-24 bg-primary/20 rounded-full animate-float blur-xl"></div>
      <div className="fixed bottom-20 right-10 w-32 h-32 bg-secondary/20 rounded-full animate-pulse-slow blur-xl"></div>

      <div className="w-full max-w-md space-y-8">
        {/* Header with logo */}
        <div className="flex justify-center mb-6">
          <Link href="/">
            <Image
              src="/EchoOps logo.png"
              alt="EchoOps Logo"
              width={160}
              height={53}
              priority
              className="rounded-lg"
              style={{ width: "160px", height: "auto" }}
            />
          </Link>
        </div>

        {/* Sign In Card */}
        <div className="card-spatial relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-2xl transform translate-x-1/3 -translate-y-1/2"></div>

          <div className="relative z-10 p-8 space-y-6">
            <div className="text-center">
              <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">
                Sign In to EchoOps
              </h1>
              <p className="mt-2 text-gray-700 dark:text-gray-300">
                Access your projects and continue your work
              </p>
              {error && (
                <div className="p-4 mt-4 text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded-md">
                  {error === "CredentialsSignin"
                    ? "Invalid credentials"
                    : error}
                </div>
              )}
            </div>

            <div className="card-neo overflow-hidden p-6">
              <div className="space-y-4">
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign in with Google
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">or</span>
                  </div>
                </div>

                <button
                  onClick={handleGitHubSignIn}
                  className="button-primary w-full flex items-center justify-center px-4 py-3 transition-all duration-200"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Sign in with GitHub
                </button>
              </div>
            </div>

            {/* Don't have an account section */}
            <div className="text-center mt-6">
              <p className="text-gray-700 dark:text-gray-300">
                Don't have an account?{" "}
                <Link
                  href="/auth/signup"
                  className="text-primary font-medium hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-md mt-auto pt-8">
        <div className="border-t border-border/30 py-4">
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
            © {new Date().getFullYear()} EchoOps. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md p-8 space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Loading...</h1>
            </div>
          </div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
