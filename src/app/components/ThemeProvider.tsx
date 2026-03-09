"use client";

import { useSession } from "@/app/components/FirebaseAuthProvider";
import { createContext, useContext, useEffect, useState } from "react";

// Define the theme type
type Theme = "dark" | "light";

// Create a context for theme management
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  // Client-side theme detection
  const [theme, setThemeState] = useState<Theme>("dark"); // Default theme
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();

  // Function to update theme that will be exposed in the context
  const setTheme = async (newTheme: Theme) => {
    try {
      console.log(`Setting theme to ${newTheme}`);

      // Update state
      setThemeState(newTheme);

      // Update HTML class
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(newTheme);

      // Store in localStorage for persistence between page loads
      localStorage.setItem("theme", newTheme);

      // Update user preference in database if authenticated
      if (status === "authenticated") {
        console.log(
          `User authenticated, updating theme in database to ${newTheme}`
        );
        const response = await fetch("/api/user/theme", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ theme: newTheme }),
        });

        if (!response.ok) {
          const data = await response.json();
          console.error("Failed to update theme preference:", data.error);
        } else {
          console.log(`Theme successfully updated in database to ${newTheme}`);
          const data = await response.json();
          console.log("Server response:", data);
        }
      }
    } catch (error) {
      console.error("Error setting theme:", error);
    }
  };

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);
    console.log("ThemeProvider mounted, initializing theme");

    // Get theme preference from localStorage or cookies first (fast local access)
    const getInitialTheme = (): Theme => {
      // Check for stored theme preference in localStorage
      const storedTheme =
        typeof window !== "undefined"
          ? window.localStorage.getItem("theme")
          : null;
      console.log(`Found theme in localStorage: ${storedTheme}`);
      if (storedTheme === "dark" || storedTheme === "light") {
        return storedTheme;
      }

      // Check for cookie
      const themeCookie =
        typeof document !== "undefined"
          ? document.cookie.split("; ").find((row) => row.startsWith("theme="))
          : null;

      if (themeCookie) {
        const cookieTheme = themeCookie.split("=")[1];
        if (cookieTheme === "dark" || cookieTheme === "light") {
          return cookieTheme as Theme;
        }
      }

      // Default to dark theme
      return "dark";
    };

    const initialTheme = getInitialTheme();
    console.log(`Using initial theme: ${initialTheme}`);
    setThemeState(initialTheme);

    // Ensure the HTML element has the correct class
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(initialTheme);
      console.log(`Applied theme class to HTML: ${initialTheme}`);
    }

    // For authenticated users, fetch their theme preference from the API
    // and update if different from local storage
    const syncUserTheme = async () => {
      if (status === "authenticated") {
        console.log("User is authenticated, syncing theme with database");
        try {
          const response = await fetch("/api/user/theme");
          if (response.ok) {
            const data = await response.json();
            console.log(`Theme from database:`, data);
            if (
              data.theme &&
              (data.theme === "dark" || data.theme === "light") &&
              data.theme !== initialTheme
            ) {
              console.log(
                `Database theme (${data.theme}) differs from local, updating...`
              );
              // Update theme if user preference from database is different
              await setTheme(data.theme as Theme);
            } else {
              console.log(
                `Database theme matches local theme (${initialTheme}) or is not valid`
              );
            }
          }
        } catch (error) {
          console.error("Error fetching user theme:", error);
        }
      }
    };

    syncUserTheme();
  }, [status]);

  // Avoid rendering during SSR to prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  // Provide context to children
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
