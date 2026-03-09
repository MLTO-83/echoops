"use client";

import { useState } from "react";
import { Session } from "next-auth";
import Image from "next/image";

interface WelcomeModalProps {
  session: Session | null;
  isFirstLogin?: boolean;
}

export default function WelcomeModal({
  session,
  isFirstLogin = false,
}: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen || !session?.user?.email || !isFirstLogin) {
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

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Modal backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"></div>

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
          {/* Modal header */}
          <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Welcome to Portavi!</h2>
              <button
                onClick={handleClose}
                className="text-white hover:text-gray-200 transition"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Modal content */}
          <div className="p-6">
            <div className="flex justify-center mb-6">
              <Image
                src="/Portavi logo.png"
                alt="Portavi Logo"
                width={120}
                height={40}
                className="rounded-sm"
                style={{ width: "120px", height: "auto" }}
              />
            </div>

            <p className="mb-4">
              Thank you for signing up! To get started with Portavi, please
              verify your email address.
            </p>

            <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 rounded mb-6">
              <div className="flex items-start">
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
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 dark:text-yellow-200">
                    Your email address needs to be verified to access all
                    features.
                  </p>
                </div>
              </div>
            </div>

            {message && (
              <div
                className={`p-4 mb-4 rounded text-sm ${
                  message.startsWith("Error")
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                }`}
              >
                {message}
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={handleSendVerification}
                disabled={isLoading}
                className="button-primary text-center w-full py-3"
              >
                {isLoading ? (
                  <div className="inline-flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending...
                  </div>
                ) : (
                  "Send Verification Email"
                )}
              </button>
            </div>

            <div className="text-center mt-4">
              <button
                onClick={handleClose}
                className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary text-sm font-medium"
              >
                I'll do this later
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
