"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import TagDisplay from "@/app/components/Tags/TagDisplay";
import AIAgentPanel from "@/app/components/AIAgent/AIAgentPanel";
import AIProgressSection from "@/app/components/AIAgent/AIProgressSection/AIProgressSection";
// Import the synchronization function
import { syncAzureProject } from "@/lib/actions/adoSync";

// Types
interface ProjectDetails {
  id: string;
  name: string;
  description?: string;
  adoProjectId?: string;
  createdAt: string;
  updatedAt: string;
  stateId: string;
  state?: {
    id: string;
    name: string;
    description?: string;
  };
}

interface TeamMember {
  id: string;
  displayName: string;
  uniqueName: string;
  imageUrl?: string;
  adoUserId: string;
}

interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  hoursPerWeek: number;
  hoursPerMonth: number;
  createdAt: string;
  updatedAt: string;
}

interface TeamData {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
}

export default function ProjectDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(
    null
  );
  const [projectManager, setProjectManager] = useState<ProjectMember | null>(
    null
  );
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [availableTeams, setAvailableTeams] = useState<TeamData[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [syncingProject, setSyncingProject] = useState(false);

  // State-related variables
  const [availableStates, setAvailableStates] = useState<
    Array<{ id: string; name: string; description?: string }>
  >([]);
  const [isEditingState, setIsEditingState] = useState(false);
  const [updatingState, setUpdatingState] = useState(false);

  // UI states
  const [isEditingManager, setIsEditingManager] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [isEditingMember, setIsEditingMember] = useState<string | null>(null);

  // Form states
  const [newManagerId, setNewManagerId] = useState<string>("");
  const [memberHoursForm, setMemberHoursForm] = useState<{
    userId: string;
    hoursPerWeek: number;
    hoursPerMonth: number;
  }>({
    userId: "",
    hoursPerWeek: 0,
    hoursPerMonth: 0,
  });

  // Load project details
  const fetchProjectDetails = useCallback(async () => {
    if (!projectId || status !== "authenticated") return;

    setIsLoading(true);
    setError("");

    try {
      // Fetch project details from your API
      const response = await fetch(`/api/projects/${projectId}`);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch project details: ${response.statusText}`
        );
      }

      const data = await response.json();
      setProjectDetails(data.project);
    } catch (err) {
      console.error("Error fetching project details:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId, status]);

  // Fetch available project states
  const fetchAvailableStates = useCallback(async () => {
    if (status !== "authenticated") return;

    try {
      const response = await fetch("/api/states");
      if (!response.ok) {
        throw new Error("Failed to fetch project states");
      }
      const data = await response.json();
      setAvailableStates(data.states || []);
    } catch (err) {
      console.error("Error fetching project states:", err);
      // Not showing an error to the user as this is not critical
    }
  }, [status]);

  // Handle updating project state
  const handleUpdateProjectState = async (stateId: string) => {
    if (!projectId || !stateId || updatingState) return;

    setUpdatingState(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stateId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update project state");
      }

      const data = await response.json();
      setProjectDetails(data.project);
      setIsEditingState(false);
    } catch (err) {
      console.error("Error updating project state:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setUpdatingState(false);
    }
  };

  // Load project members and manager
  const fetchProjectMembers = useCallback(async () => {
    if (!projectId || status !== "authenticated") return;

    try {
      console.log(`Fetching members for project: ${projectId}`);
      const response = await fetch(`/api/projects/${projectId}/members`);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch project members: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log(
        `Received ${data.members?.length || 0} project members:`,
        data
      );

      // Handle case where data or members array is undefined/null
      const members = data.members || [];

      // Separate members and manager
      const manager = members.find(
        (member: ProjectMember) => member.role === "OWNER"
      );
      const regularMembers = members.filter(
        (member: ProjectMember) => member.role !== "OWNER"
      );

      setProjectManager(manager || null);
      setProjectMembers(regularMembers);
    } catch (err) {
      console.error("Error fetching project members:", err);
      // Set empty arrays to avoid undefined errors in the UI
      setProjectManager(null);
      setProjectMembers([]);
    }
  }, [projectId, status]);

  // Load available teams from Azure DevOps
  const fetchAvailableTeams = useCallback(async () => {
    if (!projectDetails?.adoProjectId || status !== "authenticated") return;

    try {
      const response = await fetch(
        `/api/ado/projects/${projectDetails.adoProjectId}/teams`
      );

      if (!response.ok) {
        // Not a critical error, just log it
        console.warn(
          "Could not fetch ADO teams. Azure DevOps may not be configured correctly."
        );
        return;
      }

      const data = await response.json();
      setAvailableTeams(data.teams || []);

      // Automatically select all teams to load members
      if (data.teams && data.teams.length > 0) {
        setSelectedTeams(data.teams.map((team) => team.id));
      }
    } catch (err) {
      console.error("Error fetching teams:", err);
    }
  }, [projectDetails, status]);

  // Handler to manually sync project from Azure DevOps
  const handleSyncFromADO = useCallback(async () => {
    if (!projectId || status !== "authenticated") return;
    setSyncingProject(true);
    try {
      await syncAzureProject(projectId);
      // Refresh local data
      await fetchProjectDetails();
      await fetchProjectMembers();
      await fetchAvailableTeams();
    } catch (err) {
      console.error("Error syncing project from ADO:", err);
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncingProject(false);
    }
  }, [
    projectId,
    status,
    fetchProjectDetails,
    fetchProjectMembers,
    fetchAvailableTeams,
  ]);

  // Initialize data
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      // First ensure the project exists, then fetch details
      fetchProjectDetails();
      // Also fetch available project states
      fetchAvailableStates();
    }
  }, [status, fetchProjectDetails, fetchAvailableStates, router]);

  // Load members and teams after project details are loaded
  useEffect(() => {
    if (projectDetails) {
      fetchProjectMembers();
      fetchAvailableTeams();
    }
  }, [projectDetails, fetchProjectMembers, fetchAvailableTeams]);

  // Load team members when teams are selected
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (selectedTeams.length === 0 || !projectDetails?.adoProjectId) return;

      try {
        const promises = selectedTeams.map((teamId) =>
          fetch(
            `/api/ado/projects/${projectDetails.adoProjectId}/teams/${teamId}/members`
          ).then((res) => (res.ok ? res.json() : { members: [] }))
        );

        const results = await Promise.all(promises);

        // Combine all team members, removing duplicates
        const allMembers = results.flatMap((result) => result.members || []);
        const uniqueMembers = Array.from(
          new Map(
            allMembers.map((member) => [member.adoUserId, member])
          ).values()
        );

        setTeamMembers(uniqueMembers);
      } catch (err) {
        console.error("Error fetching team members:", err);
      }
    };

    fetchTeamMembers();
  }, [selectedTeams, projectDetails]);

  // Handle setting project manager
  const handleSetProjectManager = async () => {
    if (!projectId || !newManagerId) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/manager`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: newManagerId }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to set project manager: ${response.statusText}`
        );
      }

      await fetchProjectMembers();
      setIsEditingManager(false);
      setNewManagerId("");
    } catch (err) {
      console.error("Error setting project manager:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    }
  };

  // Handle adding/updating project member
  const handleManageProjectMember = async (
    userId: string,
    isUpdate = false
  ) => {
    if (!projectId || !memberHoursForm.userId) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: isUpdate ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: isUpdate ? userId : memberHoursForm.userId,
          hoursPerWeek: memberHoursForm.hoursPerWeek,
          hoursPerMonth: memberHoursForm.hoursPerMonth,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to ${isUpdate ? "update" : "add"} project member: ${
            response.statusText
          }`
        );
      }

      await fetchProjectMembers();
      setIsAddingMembers(false);
      setIsEditingMember(null);
      setMemberHoursForm({
        userId: "",
        hoursPerWeek: 0,
        hoursPerMonth: 0,
      });
    } catch (err) {
      console.error(
        `Error ${isUpdate ? "updating" : "adding"} project member:`,
        err
      );
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    }
  };

  // Handle removing project member
  const handleRemoveProjectMember = async (userId: string) => {
    if (!projectId) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/members/${userId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to remove project member: ${response.statusText}`
        );
      }

      await fetchProjectMembers();
    } catch (err) {
      console.error("Error removing project member:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    }
  };

  // Handle selecting a team
  const handleTeamSelection = (teamId: string) => {
    setSelectedTeams((prev) => {
      if (prev.includes(teamId)) {
        return prev.filter((id) => id !== teamId);
      } else {
        return [...prev, teamId];
      }
    });
  };

  // Handle starting to edit a member
  const startEditMember = (member: ProjectMember) => {
    setIsEditingMember(member.userId);
    setMemberHoursForm({
      userId: member.userId,
      hoursPerWeek: member.hoursPerWeek,
      hoursPerMonth: member.hoursPerMonth,
    });
  };

  // Handle importing all selected team members to project members
  const handleImportAllTeamMembers = async () => {
    if (!projectId || teamMembers.length === 0) return;

    try {
      setIsLoading(true);
      console.log("Processing import of", teamMembers.length, "team members");

      // Process each team member one by one
      const addPromises = teamMembers.map(async (member, index) => {
        try {
          // Extract member data
          const name = member.displayName;
          const email = member.uniqueName;
          // Extract imageUrl
          let imageUrl = member.imageUrl;
          // Ensure image URL is absolute
          if (imageUrl && !imageUrl.startsWith("http")) {
            if (imageUrl.startsWith("/")) {
              // Handle relative URLs by prepending with Azure DevOps domain
              const adoDomain = new URL(window.location.href).origin;
              imageUrl = `${adoDomain}${imageUrl}`;
            }
          }

          console.log(
            `[${index}] Image URL for ${name}: ${imageUrl || "none"}`
          );

          const adoUserId = member.adoUserId || member.id;

          console.log(`[${index}] Processing member:`, {
            name,
            email,
            adoUserId,
            imageUrl,
          });

          if (!name || !email) {
            console.error(
              `[${index}] Missing required data for member:`,
              member
            );
            return false;
          }

          // Create/update user record
          console.log(
            `[${index}] Creating/updating user for ${name} (${email})`
          );

          const userData = {
            name,
            email,
            image: imageUrl || null,
            adoUserId,
          };

          console.log(`[${index}] Sending user data to API:`, userData);

          const userResponse = await fetch(`/api/user/direct-fix`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(userData),
          });

          if (!userResponse.ok) {
            const errorText = await userResponse.text();
            console.error(
              `[${index}] Failed to create/fetch user: ${userResponse.status} - ${errorText}`
            );
            throw new Error(
              `Failed to create/fetch user: ${userResponse.statusText}`
            );
          }

          const userDataResult = await userResponse.json();
          const userId = userDataResult.id;

          console.log(`[${index}] Got user ID: ${userId} for ${name}`);

          if (!userId) {
            throw new Error(`User ID not returned from API for ${name}`);
          }

          // Now add the user as a project member
          console.log(
            `[${index}] Adding user ${userId} (${name}) to project ${projectId}`
          );
          const memberResponse = await fetch(
            `/api/projects/${projectId}/members`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId,
                role: "MEMBER",
                hoursPerWeek: 40, // Default values
                hoursPerMonth: 160,
              }),
            }
          );

          if (!memberResponse.ok && memberResponse.status !== 409) {
            const errorText = await memberResponse.text();
            console.error(
              `[${index}] Failed to add member: ${memberResponse.status} - ${errorText}`
            );
            throw new Error(
              `Failed to add ${name} as project member: ${memberResponse.statusText}`
            );
          }

          console.log(
            `[${index}] Successfully added/updated ${name} as project member`
          );
          return true;
        } catch (err) {
          console.error(`Error adding team member:`, err);
          return false;
        }
      });

      const results = await Promise.all(addPromises);
      const successCount = results.filter(Boolean).length;
      console.log(
        `Successfully imported ${successCount} of ${teamMembers.length} team members`
      );

      // Refresh the project members list
      await fetchProjectMembers();

      // Show a temporary success message
      setError(`Successfully imported ${successCount} team members.`);
      setTimeout(() => setError(""), 3000);

      // Clear team selection after import
      setSelectedTeams([]);
      setTeamMembers([]);
    } catch (err) {
      console.error("Error importing team members:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total weekly and monthly hours
  const totalWeeklyHours = projectMembers.reduce(
    (total, member) => total + (member.hoursPerWeek || 0),
    0
  );

  const totalMonthlyHours = projectMembers.reduce(
    (total, member) => total + (member.hoursPerMonth || 0),
    0
  );

  /* Display Member name properly, handling null values */
  const getMemberDisplayName = (member) => {
    if (member.user.name) return member.user.name;
    if (member.user.email) return member.user.email;
    return "Team Member";
  };

  /* Get an initial for the avatar placeholder */
  const getMemberInitial = (member) => {
    if (member.user.name && member.user.name.length > 0) {
      return member.user.name.charAt(0).toUpperCase();
    }
    if (member.user.email && member.user.email.length > 0) {
      return member.user.email.charAt(0).toUpperCase();
    }
    return "?";
  };

  // Loading state - show a special message during synchronization
  if (syncingProject) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center card-spatial animate-pulse">
          <h1 className="font-display font-bold text-4xl mb-4 relative">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Synchronizing Project...
            </span>
          </h1>
          <p className="text-gray-700 dark:text-white mb-4">
            Ensuring project data is up-to-date between Azure DevOps and Portavi
          </p>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  if (isLoading || status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center card-spatial animate-pulse">
          <h1 className="font-display font-bold text-4xl mb-4 relative">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Loading Project Details...
            </span>
          </h1>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center p-8">
        <div className="card-neo p-8 bg-background/50 relative overflow-hidden max-w-3xl w-full">
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
                Error Loading Project
              </h3>
            </div>

            <p className="text-gray-700 dark:text-white mb-8 pl-16 max-w-xl">
              {error}
            </p>

            <div className="pl-16 flex space-x-4">
              <button
                onClick={fetchProjectDetails}
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
              <Link
                href="/projects/azure"
                className="button-neo inline-flex items-center group"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
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
                <span>Back to Projects</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!projectDetails) {
    return (
      <div className="flex min-h-screen flex-col items-center p-8">
        <div className="card-neo p-8 bg-background/50 relative overflow-hidden max-w-3xl w-full">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="font-display text-2xl font-bold text-warning">
              Project Not Found
            </h3>
          </div>

          <p className="text-gray-700 dark:text-white mb-8 pl-16 max-w-xl">
            The project you're looking for could not be found. It might have
            been deleted or you don't have permission to view it.
          </p>

          <div className="pl-16">
            <Link
              href="/projects/azure"
              className="button-neo inline-flex items-center group"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
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
              <span>Back to Projects</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main content - Project details
  return (
    <div className="flex min-h-screen flex-col items-center p-6 md:p-12">
      {/* Floating decoration elements */}
      <div className="fixed top-20 left-10 w-24 h-24 bg-primary/20 rounded-full animate-float blur-xl"></div>
      <div className="fixed bottom-20 right-10 w-32 h-32 bg-secondary/20 rounded-full animate-pulse-slow blur-xl"></div>

      <div className="w-full max-w-6xl space-y-8">
        {/* Header section with back button */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
          <div className="space-y-1">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
              {projectDetails.name}
            </h1>
            <p className="text-gray-700 dark:text-white">
              {projectDetails.description || "No description provided"}
            </p>
          </div>

          <Link
            href="/projects/azure"
            className="button-neo border-primary dark:border-primary text-gray-900 dark:text-white hover:bg-primary/10 
                   transition-all duration-300 flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 transform"
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
            <span>Back to Projects</span>
          </Link>
          <button
            onClick={handleSyncFromADO}
            disabled={syncingProject}
            className="button-primary text-sm flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.581m15.358-2A8.003 8.003 0 014.582 9M4 12h5m0 0v5m0-5H9m10 0h-5"
              />
            </svg>
            <span>Sync from Azure DevOps</span>
          </button>
        </div>

        {/* Project State Section */}
        <div className="card-neo bg-background/50 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Project State
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Current status of this project
              </p>
            </div>
            {!isEditingState && (
              <button
                onClick={() => setIsEditingState(true)}
                className="button-neo text-sm border-primary/80 dark:border-primary/80 flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                Change State
              </button>
            )}
          </div>

          {isEditingState ? (
            <div className="bg-background-secondary/20 border border-border/20 rounded-md p-4">
              <div className="flex flex-col space-y-4">
                <label className="block">
                  <span className="text-gray-700 dark:text-white">
                    Select Project State
                  </span>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-white dark:bg-gray-800 focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    value={projectDetails.stateId}
                    onChange={(e) => handleUpdateProjectState(e.target.value)}
                    disabled={updatingState}
                  >
                    {availableStates.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.name}{" "}
                        {state.description ? `- ${state.description}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsEditingState(false)}
                    className="button-secondary text-sm"
                    disabled={updatingState}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-4 p-4 bg-background-secondary/10 rounded-md">
              <div
                className={`px-3 py-1 rounded-full ${
                  projectDetails.state?.id === "new"
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    : projectDetails.state?.id === "approved"
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                      : projectDetails.state?.id === "in_progress"
                        ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                        : projectDetails.state?.id === "in_production"
                          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                          : projectDetails.state?.id === "closed"
                            ? "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                            : projectDetails.state?.id === "on_hold"
                              ? "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200"
                              : projectDetails.state?.id === "cancelled"
                                ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                                : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                <span className="text-sm font-medium">
                  {projectDetails.state?.name || "Unknown State"}
                </span>
              </div>
              {projectDetails.state?.description && (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {projectDetails.state.description}
                </span>
              )}
            </div>
          )}
        </div>

        {/* AI Agent Panel */}
        {projectDetails?.adoProjectId && (
          <AIAgentPanel
            projectId={projectDetails.id}
            projectName={projectDetails.name}
            adoProjectId={projectDetails.adoProjectId}
          />
        )}

        {/* AI Agent Progress Section - NEW */}
        {projectDetails?.id && (
          <AIProgressSection projectId={projectDetails.id} />
        )}

        {/* Project tags */}
        <div className="card-neo bg-background/50 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Project Tags
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Click below to edit or add tags to this project
              </p>
            </div>
            <button
              onClick={() => {
                // Find the TagDisplay component and directly trigger its click
                const tagDisplay = document.querySelector(
                  "#tag-display-component div[role='button']"
                );
                if (tagDisplay) {
                  (tagDisplay as HTMLElement).click();
                }
              }}
              className="button-neo text-sm border-primary/80 dark:border-primary/80 flex items-center gap-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Manage Tags
            </button>
          </div>

          <div className="bg-background-secondary/10 p-4 rounded-md">
            <div id="tag-display-component">
              <TagDisplay
                projectId={projectId}
                onErrorAction={(msg) => setError(msg)}
              />
            </div>
          </div>
        </div>

        {/* Project Manager Section */}
        <div className="card-neo bg-background/50 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Project Manager
            </h2>
            {!isEditingManager && (
              <button
                onClick={() => setIsEditingManager(true)}
                className="button-neo text-sm border-primary/80 dark:border-primary/80"
              >
                {projectManager ? "Change Manager" : "Assign Manager"}
              </button>
            )}
          </div>

          {isEditingManager ? (
            <div className="bg-background-secondary/20 border border-border/20 rounded-md p-4">
              <div className="flex flex-col space-y-4">
                <label className="block">
                  <span className="text-gray-700 dark:text-white">
                    Select User
                  </span>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-white dark:bg-gray-800 focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    value={newManagerId}
                    onChange={(e) => setNewManagerId(e.target.value)}
                    required
                  >
                    <option value="">Select a user</option>
                    {projectMembers.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.user.name || member.user.email || "Team Member"}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsEditingManager(false)}
                    className="button-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSetProjectManager}
                    disabled={!newManagerId}
                    className={`button-primary text-sm ${
                      !newManagerId ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : projectManager ? (
            <div className="flex items-center space-x-4 p-4 bg-background-secondary/10 rounded-md">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary overflow-hidden border-2 border-primary/50">
                {projectManager.user.image ? (
                  <img
                    src={projectManager.user.image}
                    alt={projectManager.user.name || "Project Manager"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>
                    {(
                      projectManager.user.name ||
                      projectManager.user.email ||
                      "?"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {projectManager.user.name || "Unnamed User"}
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {projectManager.user.email}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-background-secondary/10 rounded-md text-center text-gray-700 dark:text-gray-300">
              No project manager assigned
            </div>
          )}
        </div>

        {/* Project Members Section */}
        <div className="card-neo bg-background/50 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Project Members
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Define team members and their resource allocation
              </p>
            </div>

            <div className="flex space-x-2">
              <Link
                href={`/projects/${projectId}/weekly-hours`}
                className="button-primary text-sm border-primary/80 dark:border-primary/80"
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Weekly Hours Grid
              </Link>
              {teamMembers.length > 0 && (
                <button
                  onClick={handleImportAllTeamMembers}
                  className="button-primary text-sm border-primary/80 dark:border-primary/80"
                >
                  Import All Team Members
                </button>
              )}
              {!isAddingMembers && (
                <button
                  onClick={() => setIsAddingMembers(true)}
                  className="button-neo text-sm border-primary/80 dark:border-primary/80"
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Members
                </button>
              )}
            </div>
          </div>

          {/* Resource summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-background-secondary/10 p-4 rounded-md">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Weekly Resource Allocation
              </h3>
              <div className="text-2xl font-bold text-primary">
                {totalWeeklyHours}{" "}
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  hours
                </span>
              </div>
            </div>

            <div className="bg-background-secondary/10 p-4 rounded-md">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Monthly Resource Allocation
              </h3>
              <div className="text-2xl font-bold text-primary">
                {totalMonthlyHours}{" "}
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  hours
                </span>
              </div>
            </div>
          </div>

          {/* Add member form */}
          {isAddingMembers && (
            <div className="bg-background-secondary/20 border border-border/20 rounded-md p-4 mb-6">
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                Add Project Member
              </h3>

              {/* Teams Selection Section */}
              {availableTeams.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-white mb-2">
                    Import from Azure DevOps Teams
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    {availableTeams.map((team) => (
                      <div
                        key={team.id}
                        className={`p-2 border rounded-md cursor-pointer transition-colors
                                  ${
                                    selectedTeams.includes(team.id)
                                      ? "border-primary bg-primary/10"
                                      : "border-gray-300 dark:border-gray-700 hover:bg-background-secondary/20"
                                  }`}
                        onClick={() => handleTeamSelection(team.id)}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedTeams.includes(team.id)}
                            onChange={() => handleTeamSelection(team.id)}
                            className="mr-2"
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {team.name}
                            </div>
                            {team.description && (
                              <div className="text-xs text-gray-700 dark:text-gray-300 truncate">
                                {team.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected team members */}
              {teamMembers.length > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-white">
                      Team Members ({teamMembers.length})
                    </h4>
                    <button
                      onClick={handleImportAllTeamMembers}
                      className="button-primary text-xs py-1 px-3 flex items-center"
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
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Import All to Project
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Member
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {teamMembers.map((member) => (
                          <tr key={member.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary mr-3 overflow-hidden border-2 border-primary/50">
                                  {member.imageUrl ? (
                                    <img
                                      src={member.imageUrl}
                                      alt={member.displayName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span>
                                      {member.displayName
                                        .charAt(0)
                                        .toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <span className="text-gray-900 dark:text-white">
                                  {member.displayName}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {member.uniqueName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() =>
                                  setMemberHoursForm((prev) => ({
                                    ...prev,
                                    userId: member.adoUserId,
                                  }))
                                }
                                className="button-secondary text-xs py-1 px-3"
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block">
                    <span className="text-gray-700 dark:text-white">
                      User ID (Manual Entry)
                    </span>
                    <input
                      type="text"
                      placeholder="Enter user ID"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-white dark:bg-gray-800 focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                      value={memberHoursForm.userId}
                      onChange={(e) =>
                        setMemberHoursForm((prev) => ({
                          ...prev,
                          userId: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <div>
                  <label className="block">
                    <span className="text-gray-700 dark:text-white">
                      Hours Per Week
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-white dark:bg-gray-800 focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                      value={memberHoursForm.hoursPerWeek}
                      onChange={(e) =>
                        setMemberHoursForm((prev) => ({
                          ...prev,
                          hoursPerWeek: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </label>
                </div>
                <div>
                  <label className="block">
                    <span className="text-gray-700 dark:text-white">
                      Hours Per Month
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-white dark:bg-gray-800 focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                      value={memberHoursForm.hoursPerMonth}
                      onChange={(e) =>
                        setMemberHoursForm((prev) => ({
                          ...prev,
                          hoursPerMonth: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsAddingMembers(false);
                    setMemberHoursForm({
                      userId: "",
                      hoursPerWeek: 0,
                      hoursPerMonth: 0,
                    });
                  }}
                  className="button-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    handleManageProjectMember(memberHoursForm.userId, false)
                  }
                  disabled={!memberHoursForm.userId}
                  className={`button-primary text-sm ${
                    !memberHoursForm.userId
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  Add Member
                </button>
                <button
                  onClick={handleImportAllTeamMembers}
                  className="button-primary text-sm"
                >
                  Import All Team Members
                </button>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Weekly Hours
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Monthly Hours
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {projectMembers.length > 0 ? (
                  projectMembers.map((member) => (
                    <tr key={member.userId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary mr-3 overflow-hidden border-2 border-primary/50">
                            {member.user.image ? (
                              <img
                                src={member.user.image}
                                alt={getMemberDisplayName(member)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span>{getMemberInitial(member)}</span>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {getMemberDisplayName(member)}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {member.user.email || "No email available"}
                            </div>
                          </div>
                        </div>
                      </td>
                      {isEditingMember === member.userId ? (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              className="w-20 rounded-md border-gray-300 shadow-sm bg-white dark:bg-gray-800 focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                              value={memberHoursForm.hoursPerWeek}
                              onChange={(e) =>
                                setMemberHoursForm((prev) => ({
                                  ...prev,
                                  hoursPerWeek: parseFloat(e.target.value) || 0,
                                }))
                              }
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              className="w-20 rounded-md border-gray-300 shadow-sm bg-white dark:bg-gray-800 focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                              value={memberHoursForm.hoursPerMonth}
                              onChange={(e) =>
                                setMemberHoursForm((prev) => ({
                                  ...prev,
                                  hoursPerMonth:
                                    parseFloat(e.target.value) || 0,
                                }))
                              }
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                            <button
                              onClick={() => setIsEditingMember(null)}
                              className="button-secondary text-xs py-1 px-2"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() =>
                                handleManageProjectMember(member.userId, true)
                              }
                              className="button-primary text-xs py-1 px-2"
                            >
                              Save
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <span className="text-primary font-bold">
                              {member.hoursPerWeek}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 ml-1">
                              hrs/week
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <span className="text-primary font-bold">
                              {member.hoursPerMonth}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 ml-1">
                              hrs/month
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                            <button
                              onClick={() => startEditMember(member)}
                              className="button-neo text-xs py-1 px-2"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleRemoveProjectMember(member.userId)
                              }
                              className="button-error text-xs py-1 px-2"
                            >
                              Remove
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-center text-gray-500 dark:text-gray-400"
                    >
                      No project members assigned yet
                    </td>
                  </tr>
                )}
              </tbody>
              {projectMembers.length > 0 && (
                <tfoot className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total Resource Allocation
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {totalWeeklyHours} hrs/week
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {totalMonthlyHours} hrs/month
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
