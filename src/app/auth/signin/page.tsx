"use client";

import { signInWithPopup } from "firebase/auth";
import { auth, githubProvider } from "@/lib/firebase/client";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, githubProvider);
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
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
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
                  </div>
                </div>

                <button
                  onClick={handleSignIn}
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
