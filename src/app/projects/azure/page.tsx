"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/app/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TagDisplay from "@/app/components/Tags/TagDisplay";
import dynamic from "next/dynamic";

// Dynamically import the TagSelector component
const TagSelector = dynamic(() => import("@/app/components/Tags/TagSelector"), {
  ssr: false,
  loading: () => (
    <div className="p-2 text-sm animate-pulse">Loading tag editor...</div>
  ),
});

// Azure DevOps project type
interface AzureProject {
  id: string; // This is the ADO project ID
  name: string;
  description?: string;
  visibility: string;
  lastUpdated: string;
  url?: string;
  localProjectId?: string; // This will store our internal project ID
  teamData?: {
    teams: any[];
    teamCount: number;
    memberCount: number;
  };
  // Add state and related properties
  state?: {
    id: string;
    name: string;
    description?: string;
  };
  stateId?: string;
  memberCount?: number; // Direct member count property
  createdAt?: string;
  updatedAt?: string;
}

interface ProjectState {
  id: string;
  name: string;
}

// Helper function to wait for a specified time
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function AzureProjects() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<AzureProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [patConfigured, setPatConfigured] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [managingTagsForProject, setManagingTagsForProject] = useState<
    string | null
  >(null);
  const [tagErrors, setTagErrors] = useState<Record<string, string>>({});
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [refreshingFromADO, setRefreshingFromADO] = useState(false);

  // State for team member synchronization
  const [syncingMembers, setSyncingMembers] = useState(false);

  // Hover state for card animations
  const [isHovering, setIsHovering] = useState(-1);

  // NEW: Single comprehensive refresh function
  const refreshProjectsAndMembers = async () => {
    setLoading(true);
    setError("");
    setRefreshingFromADO(true);

    try {
      console.log(
        "Starting comprehensive refresh of ADO projects and members..."
      );

      // First check if the ADO config is valid
      try {
        const configResponse = await fetch("/api/ado/config");

        if (!configResponse.ok) {
          throw new Error("Azure DevOps configuration check failed");
        }

        const configData = await configResponse.json();
        if (!configData.configured || !configData.valid) {
          throw new Error(
            "Azure DevOps integration is not properly configured. Please check your settings."
          );
        }
      } catch (configError) {
        console.error("Error checking ADO configuration:", configError);
        throw new Error(
          "Could not validate Azure DevOps configuration. Please check your settings."
        );
      }

      // Call a new unified endpoint to refresh everything at once
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // Extended timeout to 90 seconds

      try {
        // Use the comprehensive endpoint that syncs everything
        const response = await fetch("/api/ado/comprehensive-sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
          signal: controller.signal,
          credentials: "same-origin",
          body: JSON.stringify({
            timestamp: Date.now(), // Force unique request
            syncMembers: true, // Explicitly request member sync
            forceSync: true, // Force a full sync
          }),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage;
          try {
            const errorData = await response.json();
            errorMessage =
              errorData.error ||
              `Error ${response.status}: ${response.statusText}`;
          } catch (parseError) {
            errorMessage = `Server returned an error (${response.status}) that could not be processed.`;
          }
          throw new Error(errorMessage);
        }

        // Parse response
        const responseText = await response.text();
        if (!responseText || responseText.trim() === "") {
          throw new Error("Empty response from server");
        }

        let result;
        try {
          result = JSON.parse(responseText);
        } catch (jsonError) {
          throw new Error(
            `Invalid JSON response from server: ${jsonError.message}`
          );
        }

        console.log("Comprehensive sync completed:", result);

        // Show success information
        if (result.success) {
          let message = "Projects and members synchronized successfully.";

          // Show statistics if available
          if (result.stats) {
            message += `\n\nProjects: ${result.stats.projects || 0}`;
            message += `\nTeams: ${result.stats.teams || 0}`;
            message += `\nMembers: ${result.stats.members || 0}`;
          }

          // Visual feedback to user
          alert(message);
        }

        // After successful sync, fetch the latest data from the database
        await fetchProjectsFromDatabase();
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError.name === "AbortError") {
          throw new Error(
            "Request timed out. The operation may still be running on the server."
          );
        }
        throw fetchError;
      }
    } catch (err) {
      console.error("Error during comprehensive refresh:", err);

      let errorMessage = "Failed to synchronize projects and members";
      if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      alert(`Sync failed: ${errorMessage}`);
    } finally {
      setLoading(false);
      setRefreshingFromADO(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    // Check if PAT is configured in the database
    const checkPatConfiguration = async () => {
      try {
        // Make API call to check PAT configuration
        const response = await fetch("/api/ado/config");
        const data = await response.json();

        if (data.configured && data.valid) {
          setPatConfigured(true);
          // Load projects from database instead of direct ADO fetch
          fetchProjectsFromDatabase();
        } else {
          // Handle different error types
          setPatConfigured(false);

          if (data.errorType === "validation") {
            // Show specific validation errors
            setError(
              `Your Azure DevOps integration needs attention: ${
                data.message || "Please check your settings."
              }`
            );
          } else if (data.message) {
            // Show other error messages
            setError(data.message);
          } else {
            // Fallback error message
            setError("Azure DevOps integration is not properly configured.");
          }

          setLoading(false);
        }
      } catch (err) {
        console.error("Error checking PAT configuration:", err);
        setError("Failed to check Azure DevOps integration status.");
        setPatConfigured(false);
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      checkPatConfiguration();
    }
  }, [status, router]);

  // New function to fetch projects from our database only (not from ADO)
  const fetchProjectsFromDatabase = async () => {
    setLoading(true);
    setError("");

    try {
      console.log("Fetching Azure DevOps projects from database...");

      // Make API call to get only cached/synced projects from the database
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for database queries

      try {
        const response = await fetch("/api/projects/ado", {
          signal: controller.signal,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
          credentials: "same-origin",
          next: {
            revalidate: 0,
          },
        });

        clearTimeout(timeoutId);

        console.log("Database API response status:", response.status);

        if (!response.ok) {
          const contentType = response.headers.get("content-type");
          let errorMessage;

          try {
            if (contentType && contentType.includes("application/json")) {
              const errorData = await response.json();
              errorMessage =
                errorData.error ||
                `Error ${response.status}: ${response.statusText}`;
            } else {
              const errorText = await response.text();
              errorMessage =
                errorText || `Error ${response.status}: ${response.statusText}`;
            }
          } catch (parseError) {
            console.error("Failed to parse error response:", parseError);
            errorMessage = `Server returned an error (${response.status}) that could not be processed.`;
          }

          throw new Error(errorMessage);
        }

        // Safely get response text first for debugging
        const responseText = await response.text();
        if (!responseText || responseText.trim() === "") {
          console.warn(
            "Empty response received when fetching database projects"
          );
          setProjects([]);
          setLoading(false);
          return;
        }

        // Then parse as JSON
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error(
            "Failed to parse database response as JSON:",
            jsonError,
            "Response was:",
            responseText.substring(0, 200)
          );
          throw new Error(
            `Invalid JSON response from database API: ${jsonError.message}`
          );
        }

        // Check if projects array exists, if not, just use an empty array
        if (!data.projects) {
          console.warn("No projects property in database response:", data);
          setProjects([]);
          setLoading(false);
          return;
        }

        console.log(`Loaded ${data.projects.length} projects from database`);

        // Process the projects from the database
        const projectsWithData = data.projects.map((project: AzureProject) => {
          return {
            ...project,
            localProjectId: project.localProjectId || undefined,
            teamData: project.teamData || {
              teams: [],
              teamCount: 0,
              memberCount: 0,
            },
          };
        });

        setProjects(projectsWithData);
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError.name === "AbortError") {
          throw new Error(
            "Request to database timed out. The server might be experiencing high load."
          );
        }

        throw fetchError;
      }
    } catch (err) {
      console.error("Error fetching Azure DevOps projects from database:", err);

      // Set a user-friendly error message based on the type of error
      let userMessage = "Failed to fetch projects from database";

      if (err instanceof Error) {
        // More specific error handling
        if (
          err.message.includes("Unauthorized") ||
          err.message.includes("401")
        ) {
          userMessage = "You need to log in again to access your projects.";
        } else if (err.message.includes("timed out")) {
          userMessage = "Database request timed out. Please try again later.";
        } else if (err.message.includes("not found")) {
          userMessage =
            "No projects found. You may need to sync projects from Azure DevOps first.";
        } else {
          userMessage = err.message;
        }
      }

      setError(userMessage);

      // For empty projects or specific errors, still show an empty project list
      // instead of an error state for better UX
      if (userMessage.includes("No projects found")) {
        setProjects([]);
      }

      throw err; // Rethrow the error so the caller knows the operation failed
    } finally {
      setLoading(false);
    }
  };

  // Wait for database operations with progressive retries
  const waitForDatabaseUpdate = async (attempts = 3, initialDelay = 2000) => {
    for (let i = 0; i < attempts; i++) {
      const delay = initialDelay * Math.pow(2, i); // Exponential backoff
      console.log(
        `Waiting ${delay}ms for database operations to complete (attempt ${i + 1}/${attempts})...`
      );
      await wait(delay);

      try {
        // Try fetching fresh data from the database
        await fetchProjectsFromDatabase();
        return true; // Success
      } catch (err) {
        console.log(
          `Retry attempt ${i + 1} failed, will try again if attempts remain`
        );
        // Continue to next attempt
      }
    }
    return false; // All attempts failed
  };

  // Refresh function that explicitly fetches from ADO API
  const fetchProjectsFromADO = async () => {
    setLoading(true);
    setError("");
    setRetryCount(0);
    setRefreshingFromADO(true);

    try {
      // Code remains unchanged...
      console.log("Refreshing Azure DevOps projects from ADO API...");

      // First check if the ADO config is valid
      try {
        const configResponse = await fetch("/api/ado/config", {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
          credentials: "same-origin",
        });

        if (!configResponse.ok) {
          throw new Error("Azure DevOps configuration check failed");
        }

        const configData = await configResponse.json();
        if (!configData.configured || !configData.valid) {
          throw new Error(
            "Azure DevOps integration is not properly configured. Please check your settings."
          );
        }

        console.log("ADO configuration is valid, proceeding to fetch projects");
      } catch (configError) {
        console.error("Error checking ADO configuration:", configError);
        throw new Error(
          "Could not validate Azure DevOps configuration. Please check your settings."
        );
      }

      // Call our API endpoint that fetches Azure DevOps projects with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // Extended timeout to 45 seconds

      try {
        // Configure fetch with more resilient networking options
        const response = await fetch("/api/ado/projects", {
          signal: controller.signal,
          // Prevent caching to ensure we get fresh data
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
          // Add credentials to ensure cookies are sent
          credentials: "same-origin",
          // Configure more resilient fetch behavior
          mode: "cors",
          keepalive: true,
          // Explicitly disable cache to get fresh data
          next: {
            revalidate: 0,
          },
        });

        clearTimeout(timeoutId);

        // Log the response for debugging
        console.log("API response status:", response.status);

        if (!response.ok) {
          const contentType = response.headers.get("content-type");
          let errorMessage;

          try {
            // Try to parse response as JSON if it looks like JSON
            if (contentType && contentType.includes("application/json")) {
              const errorData = await response.json();
              // If the error response is empty, provide a more helpful message
              if (!errorData || Object.keys(errorData).length === 0) {
                errorMessage =
                  "The server returned an empty error response. This might indicate a configuration issue with Azure DevOps.";
              } else {
                errorMessage =
                  errorData.error ||
                  `Error ${response.status}: ${response.statusText}`;
              }
            } else {
              // Otherwise try to get it as text
              const errorText = await response.text();
              errorMessage =
                errorText || `Error ${response.status}: ${response.statusText}`;
            }
          } catch (parseError) {
            // If we can't parse the error at all, use a generic message
            console.error("Failed to parse error response:", parseError);
            errorMessage = `Server returned an error (${response.status}) that could not be processed.`;
          }

          throw new Error(errorMessage);
        }

        // First try to get the response body and make sure it's not empty
        const responseText = await response.text();
        if (!responseText || responseText.trim() === "") {
          throw new Error(
            "Empty response from server. Azure DevOps API may be unavailable or experiencing issues."
          );
        }

        // Then parse as JSON
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error(
            "Failed to parse response as JSON:",
            jsonError,
            "Response was:",
            responseText.substring(0, 200)
          );
          throw new Error(
            `Invalid JSON response from server: ${jsonError.message}`
          );
        }

        if (!data.projects) {
          console.error("Invalid API response format:", data);
          throw new Error(
            "Invalid response format from server. Expected a 'projects' array."
          );
        }

        // Show information about the database sync if available
        if (data.databaseSync && data.databaseSync.success) {
          console.log(
            `Database sync results - Created: ${
              data.databaseSync.created
            }, Updated: ${data.databaseSync.updated}, Members: ${
              data.databaseSync.teamMembersSync || 0
            }`
          );
        }

        // Map ADO projects and get their local IDs and team members
        const projectsWithData = await Promise.all(
          data.projects.map(async (project: AzureProject) => {
            try {
              // For each project, check if it exists in our database and get the internal ID
              const localProjectResponse = await fetch(
                `/api/projects/ado/${project.id}`
              );

              let localProjectId = undefined;
              let teamData = { teams: [], teamCount: 0, memberCount: 0 };

              if (localProjectResponse.ok) {
                const localData = await localProjectResponse.json();
                localProjectId = localData.localProjectId;
              }

              // Also fetch team data for this project with a timeout to prevent hanging
              try {
                console.log(
                  `Fetching team data for project ${project.name} (${project.id})`
                );

                // Use AbortController to implement a timeout
                const teamController = new AbortController();
                const teamTimeoutId = setTimeout(
                  () => teamController.abort(),
                  15000
                ); // 15 second timeout

                const teamsResponse = await fetch(
                  `/api/ado/projects/${project.id}/teams`,
                  { signal: teamController.signal }
                );

                clearTimeout(teamTimeoutId);

                if (teamsResponse.ok) {
                  const teamsData = await teamsResponse.json();
                  console.log(
                    `Found ${teamsData.teams?.length || 0} teams for project ${
                      project.name
                    }`
                  );

                  // Count total members across all teams
                  let totalMembers = 0;
                  if (teamsData.teams && teamsData.teams.length > 0) {
                    teamsData.teams.forEach((team) => {
                      // Handle the specific structure from ADO response where members are in team.members array
                      if (team.members && Array.isArray(team.members)) {
                        totalMembers += team.members.length;
                        console.log(
                          `Team ${team.name} has ${team.members.length} members`
                        );
                      }
                    });
                  }

                  teamData = {
                    teams: teamsData.teams || [],
                    teamCount: teamsData.teams?.length || 0,
                    memberCount: totalMembers,
                  };
                }
              } catch (teamErr) {
                console.warn(
                  `Error fetching teams for project ${project.name}:`,
                  teamErr
                );
                // Continue with project processing even if team data fetch fails
              }

              return {
                ...project,
                localProjectId,
                teamData,
              };
            } catch (err) {
              console.error(
                `Error fetching data for project ${project.id}:`,
                err
              );
              return project;
            }
          })
        );

        setProjects(projectsWithData);

        // Check if we need to refresh local database data after successful fetch
        // Wait for database operations to complete using progressive retries
        if (data.databaseSync && data.databaseSync.success) {
          console.log(
            "ADO remote fetch successful - waiting for database operations to complete before refreshing local data"
          );

          // Wait for database updates to complete using progressive retries
          const refreshSuccess = await waitForDatabaseUpdate(3, 3000);

          if (!refreshSuccess) {
            console.warn(
              "Database refresh attempts failed, showing remote data only"
            );
          }
        }

        // This helps when team member syncing takes longer than expected
        if (data.databaseSync && data.databaseSync.teamMembersSync) {
          console.log("Team members were synced, showing success notification");
          // Only show the popup after we've confirmed the database is updated
          alert(
            `Projects and members synchronized successfully.\n\nProjects: ${data.projects.length}\nTeams: ${data.databaseSync.teamCount || 0}\nMembers: ${data.databaseSync.teamMembersSync || 0}`
          );
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError.name === "AbortError") {
          throw new Error(
            "Request timed out after 45 seconds. The Azure DevOps API might be experiencing high load or network connectivity issues."
          );
        }

        // Enhanced network error detection and handling
        if (fetchError.message && typeof fetchError.message === "string") {
          if (
            fetchError.message.toLowerCase().includes("network") ||
            fetchError.message.toLowerCase().includes("fetch") ||
            fetchError.message.toLowerCase().includes("failed to fetch")
          ) {
            console.error("Network error details:", fetchError);
            throw new Error(
              "Network connection error. This may be due to firewall settings, proxy configuration, or internet connectivity issues. Make sure your server can reach dev.azure.com."
            );
          }
        }

        throw fetchError;
      }
    } catch (err) {
      console.error("Error fetching Azure DevOps projects from ADO:", err);

      // Provide more descriptive error messages
      let errorMessage = "Failed to fetch projects from Azure DevOps";

      if (err instanceof Error) {
        errorMessage = err.message;

        // Add more details for common error scenarios
        if (
          err.message.includes("empty error response") ||
          err.message.includes("{}")
        ) {
          errorMessage =
            "Server returned an empty error response. Check your Azure DevOps configuration and network connectivity.";
        } else if (
          err.message.includes("network") ||
          err.message.includes("fetch") ||
          err.message.includes("Network error")
        ) {
          errorMessage =
            "Network error when connecting to Azure DevOps. Please check your internet connection and proxy settings. If you're behind a corporate firewall, make sure dev.azure.com is allowed.";
        } else if (
          err.message.includes("401") ||
          err.message.includes("Unauthorized")
        ) {
          errorMessage =
            "Authentication failed: Your Azure DevOps Personal Access Token may be invalid or expired.";
        } else if (
          err.message.includes("404") ||
          err.message.includes("Not Found")
        ) {
          errorMessage =
            "Organization not found: Please check your Azure DevOps organization URL.";
        } else if (
          err.message.includes("403") ||
          err.message.includes("Forbidden")
        ) {
          errorMessage =
            "Access denied: Your token doesn't have sufficient permissions to access Azure DevOps projects.";
        } else if (
          err.message.includes("timed out") ||
          err.message.includes("AbortError")
        ) {
          errorMessage =
            "Connection timeout: Azure DevOps API is not responding. Please try again later.";
        }
      }

      setError(errorMessage);

      // Retry mechanism with exponential backoff
      if (retryCount < 3) {
        setRetryCount(retryCount + 1);
        setIsRetrying(true);
        const backoffTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(
          `Retrying in ${backoffTime / 1000} seconds... (Attempt ${
            retryCount + 1
          } of 3)`
        );
        await wait(backoffTime);
        setIsRetrying(false);
        fetchProjectsFromADO();
      } else {
        // After all retries failed, try getting data from the database as a fallback
        console.log(
          "All retry attempts failed. Falling back to database data."
        );
        await fetchProjectsFromDatabase();
      }
    } finally {
      setLoading(false);
      setRefreshingFromADO(false);
    }
  };

  // Function to sync all team members
  const syncAllTeamMembers = async () => {
    if (syncingMembers) return;

    setSyncingMembers(true);
    setError("");

    try {
      console.log("Starting team member synchronization for all projects...");

      // Direct debugging
      console.log("DEBUG: Sending request to /api/ado/sync-members");

      // Use more robust fetch with better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch("/api/ado/sync-members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        signal: controller.signal,
        credentials: "same-origin",
        body: JSON.stringify({
          timestamp: Date.now(), // Force unique request
          forceSync: true,
        }),
      });

      clearTimeout(timeoutId);

      // Log raw response
      console.log(`DEBUG: API response status: ${response.status}`);

      // Better error handling
      if (!response.ok) {
        let errorMessage = `Server returned error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse JSON, try to get text
          try {
            errorMessage = await response.text();
          } catch (textError) {
            console.error("Could not parse error response", textError);
          }
        }
        throw new Error(errorMessage);
      }

      // Parse response safely
      let responseText;
      try {
        responseText = await response.text();
        console.log(`DEBUG: Response received, length: ${responseText.length}`);
      } catch (textError) {
        console.error("Error reading response text:", textError);
        throw new Error("Failed to read server response");
      }

      // Parse as JSON if we have content
      let result;
      if (responseText && responseText.trim()) {
        try {
          result = JSON.parse(responseText);
          console.log("DEBUG: Sync result:", result);
        } catch (jsonError) {
          console.error(
            "Error parsing JSON response:",
            jsonError,
            "Response was:",
            responseText.substring(0, 200)
          );
          throw new Error("Invalid response format from server");
        }
      } else {
        console.warn("Empty response received");
        result = {
          success: true,
          message: "Sync completed, but no details returned",
        };
      }

      // Show success message
      const message = result.message || "Team member synchronization completed";
      console.log(message);

      if (result.stats) {
        alert(
          `${message}\n\nProjects processed: ${result.stats.processedProjects}\nMembers added: ${result.stats.totalMembersAdded}\nTotal members: ${result.stats.totalMemberCount}`
        );
      } else {
        alert(message);
      }

      // Refresh projects to show updated counts
      await wait(2000); // Small delay to ensure DB updates are complete
      fetchProjectsFromDatabase();
    } catch (error) {
      console.error("Error synchronizing team members:", error);

      let errorMessage = "Failed to synchronize team members";
      if (error instanceof Error) {
        errorMessage = error.message;

        // Provide more helpful messaging for common errors
        if (
          error.message.includes("AbortError") ||
          error.message.includes("timed out")
        ) {
          errorMessage =
            "The request timed out. The server might be busy or the operation may be taking longer than expected.";
        } else if (
          error.message.includes("NetworkError") ||
          error.message.includes("Failed to fetch")
        ) {
          errorMessage =
            "Network error. Please check your internet connection and try again.";
        }
      }

      setError(errorMessage);
      alert(`Sync failed: ${errorMessage}`);
    } finally {
      setSyncingMembers(false);
    }
  };

  // Simplified fetchProjects function that serves as a router
  const fetchProjects = () => {
    // When called via refresh button, always go to ADO
    fetchProjectsFromADO();
  };

  // Function to handle project click - will sync with database if needed
  const handleProjectClick = async (
    adoProjectId: string,
    localProjectId?: string
  ) => {
    if (localProjectId) {
      // If we already have a local ID, just navigate to it
      router.push(`/projects/${localProjectId}`);
      return;
    }

    // Otherwise, we need to sync this project first
    setLoading(true);

    try {
      // Call the API to sync the project
      const response = await fetch("/api/ado/sync-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adoProjectId }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync project with database");
      }

      const data = await response.json();

      if (data.localProjectId) {
        // Navigate to the project using the local ID
        router.push(`/projects/${data.localProjectId}`);
      } else {
        throw new Error("No local project ID returned after sync");
      }
    } catch (err) {
      console.error("Error syncing project:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to sync project with database"
      );
      setLoading(false);
    }
  };

  // Toggle tag management for a project
  const toggleManageTags = (projectId: string) => {
    if (managingTagsForProject === projectId) {
      setManagingTagsForProject(null);
    } else {
      setManagingTagsForProject(projectId);
      // Clear any previous errors for this project
      setTagErrors((prev) => ({ ...prev, [projectId]: "" }));
    }
  };

  // Handle tag loading errors
  const handleTagError = (projectId: string, errorMessage: string) => {
    setTagErrors((prev) => ({ ...prev, [projectId]: errorMessage }));
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center card-spatial animate-pulse">
          <h1 className="font-display font-bold text-4xl mb-4 relative">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Loading...
            </span>
          </h1>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-6 md:p-12">
      {/* Floating decoration elements */}
      <div className="fixed top-20 left-10 w-24 h-24 bg-primary/20 rounded-full animate-float blur-xl"></div>
      <div className="fixed bottom-20 right-10 w-32 h-32 bg-secondary/20 rounded-full animate-pulse-slow blur-xl"></div>

      <div className="w-full max-w-6xl space-y-8">
        {/* Header section - Updated to match the requested layout */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
              Azure DevOps Projects
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and monitor your development projects
            </p>
          </div>

          <Link
            href="/dashboard"
            className="button-neo text-foreground hover:bg-primary/10 
                   transition-all duration-300 flex items-center gap-2"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {loading ? (
          // Loading state
          <div className="card-spatial flex flex-col justify-center items-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-xl text-muted-foreground animate-pulse">
              {refreshingFromADO
                ? "Refreshing projects from Azure DevOps..."
                : "Loading projects from database..."}
            </p>
          </div>
        ) : !patConfigured ? (
          // PAT not configured
          <div className="card-neo p-8 bg-background/50 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 rounded-full blur-xl transform translate-x-12 -translate-y-1/2"></div>

            <div className="relative z-10">
              <div className="mb-6 flex items-center">
                <svg
                  className="h-8 w-8 text-warning mr-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m-1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="font-display text-2xl font-bold text-warning">
                  Azure DevOps Integration Not Configured
                </h3>
              </div>

              <p className="text-muted-foreground mb-8 pl-16 max-w-xl">
                To view and manage your Azure DevOps projects, you need to
                configure your Personal Access Token (PAT) first.
              </p>

              <div className="pl-16">
                <Link
                  href="/settings"
                  className="button-accent inline-flex items-center group"
                >
                  <span>Configure PAT</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 ml-2 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        ) : error ? (
          // Error state
          <div className="card-neo p-8 bg-background/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-error/10 rounded-full blur-xl transform translate-x-12 -translate-y-1/2"></div>

            <div className="relative z-10">
              <div className="mb-6 flex items-center">
                <svg
                  className="h-8 w-8 text-error mr-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="font-display text-2xl font-bold text-error">
                  Error Loading Projects
                </h3>
              </div>

              <p className="text-muted-foreground mb-8 pl-16 max-w-xl">
                {error}
              </p>

              <div className="pl-16">
                <button
                  onClick={fetchProjects}
                  className="button-primary inline-flex items-center group"
                >
                  <span>Try Again</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 ml-2 group-hover:animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : projects.length === 0 ? (
          // No projects found
          <div className="card-neo p-8 bg-background/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-foreground/5 rounded-full blur-xl transform translate-x-12 -translate-y-1/2"></div>

            <div className="relative z-10">
              <div className="mb-6 flex items-center">
                <svg
                  className="h-8 w-8 text-muted-foreground mr-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1.994 1.994 0 006.586 13H4"
                  />
                </svg>
                <h3 className="font-display text-2xl font-bold text-foreground">
                  No Projects Found
                </h3>
              </div>

              <p className="text-muted-foreground mb-8 pl-16 max-w-xl">
                No Azure DevOps projects found in the database. Click refresh to
                fetch projects from Azure DevOps.
              </p>

              <div className="pl-16">
                <button
                  onClick={fetchProjects}
                  className="button-primary inline-flex items-center group"
                >
                  <span>Refresh Projects</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 ml-2 group-hover:animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Project list with count and action buttons correctly placed
          <>
            {/* Project count and actions - Positioned below the header as requested */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2">
              <p className="text-muted-foreground text-base">
                <span className="font-medium text-foreground">
                  {projects.length} projects found in your organization
                </span>{" "}
                {!refreshingFromADO && (
                  <span className="text-sm text-muted-foreground">
                    (database data)
                  </span>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={refreshProjectsAndMembers}
                  disabled={loading || refreshingFromADO || syncingMembers}
                  className={`button-primary inline-flex items-center gap-2 px-3 py-1.5 text-sm
                        ${
                          loading || refreshingFromADO || syncingMembers
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 ${
                      loading || refreshingFromADO ? "animate-spin" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh Projects & Members
                </button>
              </div>
            </div>

            <div className="card-neo p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-background-secondary/70">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/30">
                        Name
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/30">
                        State
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/30">
                        Members
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/30">
                        Last Updated
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/30">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 bg-background/50">
                    {projects.map((project) => (
                      <tr
                        key={project.id}
                        className={`transition-colors duration-150 group ${
                          hoveredRow === project.id ? "bg-primary/5" : ""
                        }`}
                        onMouseEnter={() => setHoveredRow(project.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <td className="py-4 px-4">
                          <div className="text-base font-medium text-gray-900 dark:text-primary group-hover:translate-x-1 transition-transform">
                            <button
                              onClick={() =>
                                handleProjectClick(
                                  project.id,
                                  project.localProjectId
                                )
                              }
                              className="hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 rounded-sm"
                              aria-label={`View details for ${project.name}`}
                            >
                              {project.name}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                              ${
                                project.state?.id === "new"
                                  ? "bg-gray-100 text-foreground/80 dark:bg-muted dark:text-muted-foreground"
                                  : project.state?.id === "approved"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                    : project.state?.id === "in_progress"
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                      : project.state?.id === "in_production"
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                        : project.state?.id === "closed"
                                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                                          : project.state?.id === "on_hold"
                                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                                            : project.state?.id === "cancelled"
                                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                              : "bg-gray-100 text-foreground/80 dark:bg-muted dark:text-muted-foreground"
                              }`}
                            >
                              {project.state?.name || "Unknown"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">
                              {project.memberCount || 0} members
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="text-sm text-muted-foreground">
                            {new Date(project.lastUpdated).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-right space-x-2">
                          <button
                            onClick={() =>
                              handleProjectClick(
                                project.id,
                                project.localProjectId
                              )
                            }
                            className="inline-flex items-center px-3 py-1 text-xs bg-primary dark:bg-primary text-white dark:text-white light:text-gray-900 font-bold rounded-md 
                                  hover:bg-primary/80 hover:-translate-y-0.5 transition duration-200 border border-primary/50 shadow-sm"
                            aria-label={`View details for ${project.name}`}
                          >
                            <span className="text-foreground">
                              Details
                            </span>
                          </button>

                          {project.url && (
                            <a
                              href={project.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1 text-xs bg-background-secondary text-foreground rounded-md 
                                     hover:bg-background-secondary/80 hover:-translate-y-0.5 transition duration-200 border border-border/30 shadow-sm"
                              aria-label={`Open ${project.name} in Azure DevOps`}
                            >
                              <svg
                                className="h-3 w-3 mr-1 text-foreground"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                              Azure
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
