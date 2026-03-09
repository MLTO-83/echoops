"use client";

import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SignOut() {
  const [isSigningOut, setIsSigningOut] = useState(true);

  useEffect(() => {
    const handleSignOut = async () => {
      await signOut({ redirect: false });
      setIsSigningOut(false);
    };

    handleSignOut();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Sign Out</h1>
          <p className="mt-4">
            {isSigningOut ? "Signing out..." : "You have been signed out."}
          </p>
          {!isSigningOut && (
            <Link
              href="/"
              className="mt-6 inline-block px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none"
            >
              Return to Home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
