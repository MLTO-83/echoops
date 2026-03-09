"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Component that uses useSearchParams inside suspense boundary
function VerificationHandler() {
  const [verificationStatus, setVerificationStatus] = useState<
    "loading" | "success" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setVerificationStatus("error");
      setErrorMessage("Verification token is missing");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/email/verify?token=${token}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setVerificationStatus("success");
          // Redirect to dashboard after 5 seconds
          setTimeout(() => {
            router.push("/dashboard");
          }, 5000);
        } else {
          setVerificationStatus("error");
          setErrorMessage(data.error || "Failed to verify email");
        }
      } catch (error) {
        setVerificationStatus("error");
        setErrorMessage("An error occurred during verification");
        console.error("Error verifying email:", error);
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <>
      {verificationStatus === "loading" && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Verifying your email address...</p>
        </div>
      )}

      {verificationStatus === "success" && (
        <div className="text-center">
          <div className="text-green-500 mx-auto mb-4">
            <svg
              className="h-16 w-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Email Verified!</h2>
          <p className="mb-6">
            Your email address has been successfully verified.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            You will be redirected to the dashboard in a few seconds.
          </p>
          <Link href="/dashboard" className="text-primary hover:underline">
            Go to dashboard now
          </Link>
        </div>
      )}

      {verificationStatus === "error" && (
        <div className="text-center">
          <div className="text-red-500 mx-auto mb-4">
            <svg
              className="h-16 w-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Verification Failed</h2>
          <p className="mb-6 text-red-500">{errorMessage}</p>
          <p className="mb-4">You can try the following:</p>
          <ul className="list-disc list-inside text-left mb-6">
            <li>
              Check if your verification link has expired (valid for 60 minutes)
            </li>
            <li>Make sure you're using the most recent verification email</li>
            <li>Request a new verification email</li>
          </ul>
          <div className="flex justify-center space-x-4">
            <Link
              href="/test-email"
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
            >
              Get New Verification
            </Link>
            <Link
              href="/"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

// Loading fallback component for Suspense
function LoadingFallback() {
  return (
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4">Loading verification page...</p>
    </div>
  );
}

// Main page component with Suspense boundary
export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-center mb-6">
            Email Verification
          </h1>

          <Suspense fallback={<LoadingFallback />}>
            <VerificationHandler />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
