"use client";

import { signInWithPopup } from "firebase/auth";
import { auth, githubProvider } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, Suspense } from "react";

function SignUpContent() {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const router = useRouter();

  const handleSignUp = async () => {
    try {
      await signInWithPopup(auth, githubProvider);
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

                {/* GitHub signup */}
                <button
                  onClick={handleSignUp}
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

                {/* Email signup - currently disabled */}
                <button
                  disabled={true}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-gray-500 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-60"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Email signup (coming soon)
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
