"use client";

import { signInWithPopup } from "firebase/auth";
import { auth, githubProvider, googleProvider } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, Suspense } from "react";

function SignUpContent() {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const router = useRouter();

  const handleGitHubSignUp = async () => {
    try {
      await signInWithPopup(auth, githubProvider);
      router.push("/dashboard");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Authentication failed";
      router.push(`/auth/error?error=${encodeURIComponent(errorMessage)}`);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/dashboard");
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

        {/* Sign Up Card */}
        <div className="card-spatial relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-2xl transform translate-x-1/3 -translate-y-1/2"></div>

          <div className="relative z-10 p-8 space-y-6">
            <div className="text-center">
              <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">
                Sign Up for EchoOps
              </h1>
              <p className="mt-2 text-gray-700 dark:text-gray-300">
                Create an account to get started with EchoOps
              </p>
            </div>

            <div className="card-neo overflow-hidden p-6">
              <div className="space-y-6">
                {/* Terms Acceptance Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mr-2 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary appearance-none checked:bg-primary checked:border-transparent relative"
                    style={{
                      backgroundImage: termsAccepted
                        ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")"
                        : "",
                      backgroundSize:
                        "75%" /* Slightly smaller checkmark for better visibility */,
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                  <label
                    htmlFor="terms"
                    className="text-gray-700 dark:text-gray-300 text-sm"
                  >
                    I have read and accept the{" "}
                    <Link
                      href="/terms"
                      className="text-primary hover:underline"
                    >
                      Terms of Use
                    </Link>
                  </label>
                </div>

                <button
                  onClick={handleGoogleSignUp}
                  disabled={!termsAccepted}
                  className={`w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 ${
                    !termsAccepted ? "opacity-50 cursor-not-allowed" : ""
                  }`}
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
                  Sign up with Google
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
                  onClick={handleGitHubSignUp}
                  disabled={!termsAccepted}
                  className={`button-primary w-full flex items-center justify-center px-4 py-3 transition-all duration-200 ${
                    !termsAccepted ? "opacity-50 cursor-not-allowed" : ""
                  }`}
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
                  Sign up with GitHub
                </button>
              </div>
            </div>

            {/* Already have an account section */}
            <div className="text-center mt-6">
              <p className="text-gray-700 dark:text-gray-300">
                Already have an account?{" "}
                <Link
                  href="/auth/signin"
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>

            {/* Terms and Privacy Links */}
            <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
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

export default function SignUp() {
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
      <SignUpContent />
    </Suspense>
  );
}
