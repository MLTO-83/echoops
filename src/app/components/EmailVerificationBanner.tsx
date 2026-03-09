"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EmailVerificationBannerProps {
  session: { user: { id: string; name?: string | null; email?: string | null; image?: string | null; organizationId?: string | null; theme?: string | null; emailVerified?: Date | null } } | null;
}

export default function EmailVerificationBanner({
  session,
}: EmailVerificationBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  // If user is not authenticated or email is already verified, don't show the banner
  if (!session?.user?.email || session.user.emailVerified) {
    return null;
  }

  const handleSendVerification = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/email/send-verification", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Verification email sent! Please check your inbox.");
      } else {
        setMessage(
          `Error: ${data.error || "Failed to send verification email"}`
        );
      }
    } catch (error) {
      setMessage("An unexpected error occurred. Please try again.");
      console.error("Error sending verification email:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="mb-6 w-full bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 rounded">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-grow">
          <p className="text-sm text-yellow-700 dark:text-yellow-200">
            Your email address is not verified. Please verify your email to
            access all features.
          </p>
          {message && (
            <p
              className={`mt-2 text-sm ${
                message.startsWith("Error")
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {message}
            </p>
          )}
          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleSendVerification}
              disabled={isLoading}
              className={`text-sm font-medium ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              } text-yellow-700 dark:text-yellow-200 hover:text-yellow-600 dark:hover:text-yellow-100 focus:outline-none`}
            >
              {isLoading ? "Sending..." : "Send verification email"}
            </button>
            <button
              onClick={handleDismiss}
              className="text-sm font-medium text-yellow-700 dark:text-yellow-200 hover:text-yellow-600 dark:hover:text-yellow-100 focus:outline-none"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
