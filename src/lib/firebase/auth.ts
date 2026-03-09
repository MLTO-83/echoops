import { cookies } from "next/headers";
import { headers } from "next/headers";
import { adminAuth } from "./admin";
import { users } from "./db";
import type { AppSession } from "./types";

/**
 * Server-side session retrieval — replaces getServerSession(authOptions)
 *
 * Reads the Firebase ID token from:
 *   1. `__session` cookie (set by FirebaseAuthProvider on the client)
 *   2. `Authorization: Bearer <token>` header
 *
 * Returns an AppSession with the same shape as the old NextAuth session.
 */
export async function getSession(): Promise<AppSession | null> {
  try {
    let token: string | undefined;

    // Try cookie first
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session");
    if (sessionCookie?.value) {
      token = sessionCookie.value;
    }

    // Fallback to Authorization header
    if (!token) {
      const headerStore = await headers();
      const authHeader = headerStore.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (!token) return null;

    // Verify the Firebase ID token
    const decoded = await adminAuth.verifyIdToken(token);

    // Fetch user doc from Firestore for extra fields
    const userDoc = await users.findById(decoded.uid);

    if (!userDoc) {
      // User authenticated with Firebase but has no Firestore doc yet
      // Return minimal session — the ensure-user endpoint will create the doc
      return {
        user: {
          id: decoded.uid,
          name: decoded.name || null,
          email: decoded.email || null,
          image: decoded.picture || null,
          organizationId: null,
          theme: null,
          emailVerified: decoded.email_verified ? new Date() : null,
        },
      };
    }

    return {
      user: {
        id: userDoc.id,
        name: userDoc.name,
        email: userDoc.email,
        image: userDoc.image,
        organizationId: userDoc.organizationId,
        theme: userDoc.theme,
        emailVerified: userDoc.emailVerified,
      },
    };
  } catch (error) {
    // Token expired, invalid, or other error
    console.error("Firebase auth error:", error);
    return null;
  }
}
