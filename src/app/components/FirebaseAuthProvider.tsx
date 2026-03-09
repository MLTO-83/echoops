"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  organizationId?: string | null;
  theme?: string | null;
  emailVerified?: Date | null;
}

interface SessionData {
  user: SessionUser;
}

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

interface SessionContextValue {
  data: SessionData | null;
  status: SessionStatus;
  update: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  data: null,
  status: "loading",
  update: async () => {},
});

/**
 * Set the __session cookie with the Firebase ID token for SSR
 */
async function setSessionCookie(user: User | null) {
  if (user) {
    const token = await user.getIdToken();
    document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax`;
  } else {
    document.cookie = "__session=; path=/; max-age=0";
  }
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  const fetchUserProfile = useCallback(async (firebaseUser: User) => {
    try {
      // Set cookie first so the API route can read it
      await setSessionCookie(firebaseUser);

      // Ensure user doc exists in Firestore
      await fetch("/api/auth/ensure-user", { method: "POST" });

      // Fetch full profile
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const { user } = await res.json();
        setSessionData({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            organizationId: user.organizationId || null,
            theme: user.theme,
            emailVerified: user.emailVerified || null,
          },
        });
      } else {
        // Profile API failed but user is authenticated
        setSessionData({
          user: {
            id: firebaseUser.uid,
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            image: firebaseUser.photoURL,
          },
        });
      }
      setStatus("authenticated");
    } catch {
      // Even if profile fetch fails, user is still authenticated
      setSessionData({
        user: {
          id: firebaseUser.uid,
          name: firebaseUser.displayName,
          email: firebaseUser.email,
          image: firebaseUser.photoURL,
        },
      });
      setStatus("authenticated");
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await fetchUserProfile(firebaseUser);
      } else {
        await setSessionCookie(null);
        setSessionData(null);
        setStatus("unauthenticated");
      }
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

  // Token refresh every 50 minutes
  useEffect(() => {
    const interval = setInterval(
      async () => {
        const user = auth.currentUser;
        if (user) {
          await user.getIdToken(true);
          await setSessionCookie(user);
        }
      },
      50 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, []);

  const update = useCallback(async () => {
    const user = auth.currentUser;
    if (user) {
      await fetchUserProfile(user);
    }
  }, [fetchUserProfile]);

  return (
    <SessionContext.Provider value={{ data: sessionData, status, update }}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Drop-in replacement for NextAuth's useSession()
 */
export function useSession() {
  return useContext(SessionContext);
}

/**
 * Sign out from Firebase and clear cookies
 */
export async function signOut(options?: { callbackUrl?: string }) {
  await firebaseSignOut(auth);
  document.cookie = "__session=; path=/; max-age=0";
  if (options?.callbackUrl) {
    window.location.href = options.callbackUrl;
  }
}
