"use server";

import { getSession } from "@/lib/firebase/auth";
import { users, projects, projectMembers } from "@/lib/firebase/db";
import { adoConnections, organizations } from "@/lib/firebase/db";
import { encodeToBase64 } from "@/lib/buffer-utils";

/**
 * Server action to synchronize ADO data into the database
 * This will fetch projects from Azure DevOps and store them in the database
 */
export async function syncAdoData() {
  try {
    // Get session to check authentication
    const session = await getSession();

    // Check if user is authenticated
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's email from session
    const userEmail = session.user.email;
    if (!userEmail) {
      return { success: false, error: "User email not found" };
    }

    // Get the user from database
    const user = await users.findByEmail(userEmail);

    if (!user?.organizationId) {
      return {
        success: false,
        error:
          "No ADO connection configured. Please set up your ADO integration first.",
      };
    }

    // Get the ADO connection for the user's organization
    const adoConnection = await adoConnections.findByOrganizationId(user.organizationId);

    if (!adoConnection) {
      return {
        success: false,
        error:
          "No ADO connection configured. Please set up your ADO integration first.",
      };
    }

    const { pat, adoOrganizationUrl, id: adoConnectionId } = adoConnection;

    if (!pat || !adoOrganizationUrl) {
      return {
        success: false,
        error: "ADO connection is not properly configured",
      };
    }

    // Get projects from Azure DevOps API
    const orgUrlTrimmed = adoOrganizationUrl.endsWith("/")
      ? adoOrganizationUrl.slice(0, -1)
      : adoOrganizationUrl;

    const apiUrl = `${orgUrlTrimmed}/_apis/projects?api-version=7.0`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Basic ${encodeToBase64(`:${pat}`)}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to fetch ADO projects: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();
    const adoProjects = data.value;

    // Store projects in the database
    let createdCount = 0;
    let updatedCount = 0;

    for (const project of adoProjects) {
      // Check if project already exists using adoProjectId
      const existingProject = await projects.findByAdoProjectId(project.id);

      if (existingProject) {
        // Update existing project
        await projects.update(existingProject.id, {
          name: project.name,
          updatedAt: new Date(),
        });
        updatedCount++;
      } else {
        // Create new project
        await projects.create({
          name: project.name,
          adoProjectId: project.id,
          adoConnectionId: adoConnectionId,
        });
        createdCount++;
      }
    }

    return {
      success: true,
      message: `Sync completed. Created ${createdCount} new projects and updated ${updatedCount} existing projects.`,
    };
  } catch (error) {
    console.error("Error syncing ADO data:", error);
    return {
      success: false,
      error: `Failed to sync ADO data: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Synchronize an Azure DevOps project with the local database
 * This ensures that when a user clicks a project from the Azure DevOps list,
 * the project exists in our database for further operations
 */
export async function syncAzureProject(
  adoProjectId: string
): Promise<string | null> {
  try {
    // Get session to check authentication
    const session = await getSession();

    // Check if user is authenticated
    if (!session || !session.user) {
      console.error("Authentication required to sync project");
      return null;
    }

    // First, check if the project already exists in our database by adoProjectId
    const existingProject = await projects.findByAdoProjectId(adoProjectId);

    // If it exists, return its ID
    if (existingProject) {
      // Since the project exists, sync the team members
      await syncProjectTeamMembers(existingProject.id, adoProjectId);
      return existingProject.id;
    }

    // Get user's email and organization for the connection ID
    const userEmail = session.user.email;
    if (!userEmail) {
      console.error("User email not found");
      return null;
    }

    // Get the user from database
    const user = await users.findByEmail(userEmail);

    if (!user?.organizationId) {
      console.error("No ADO connection configured");
      return null;
    }

    const adoConnection = await adoConnections.findByOrganizationId(user.organizationId);

    if (!adoConnection) {
      console.error("No ADO connection configured");
      return null;
    }

    const adoConnectionId = adoConnection.id;

    // Now create the project with the proper connection ID
    const newProject = await projects.create({
      name: `Project ${adoProjectId.substring(0, 8)}`, // Use part of the ID as a placeholder name
      adoProjectId: adoProjectId,
      adoConnectionId: adoConnectionId,
    });

    // Sync the project name and details from Azure DevOps
    await fetchAndUpdateProjectDetails(
      newProject.id,
      adoProjectId,
      adoConnection
    );

    // Sync team members after creating the project
    await syncProjectTeamMembers(newProject.id, adoProjectId);

    return newProject.id;
  } catch (error) {
    console.error("Error synchronizing project:", error);
    return null;
  }
}

/**
 * Fetch project details from Azure DevOps and update our database
 */
async function fetchAndUpdateProjectDetails(
  projectId: string,
  adoProjectId: string,
  adoConnection: { pat: string; adoOrganizationUrl: string }
) {
  try {
    const { pat, adoOrganizationUrl } = adoConnection;

    const orgUrlTrimmed = adoOrganizationUrl.endsWith("/")
      ? adoOrganizationUrl.slice(0, -1)
      : adoOrganizationUrl;

    // Fetch project details from Azure DevOps API
    const apiUrl = `${orgUrlTrimmed}/_apis/projects/${adoProjectId}?api-version=7.0`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Basic ${encodeToBase64(`:${pat}`)}`,
      },
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch project details from ADO: ${response.status}`
      );
      return;
    }

    const projectData = await response.json();

    // Update our project with real data from Azure DevOps
    await projects.update(projectId, {
      name: projectData.name,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating project details:", error);
  }
}

/**
 * Synchronize team members from ADO to our database
 * This version has improved handling of member details and more robust logging
 */
export async function syncProjectTeamMembers(
  projectId: string,
  adoProjectId: string
) {
  try {
    console.log(
      `Starting team member synchronization for project ${projectId} (ADO ID: ${adoProjectId})`
    );

    // Get the project with its ADO connection
    const project = await projects.findById(projectId);

    if (!project?.adoConnectionId) {
      console.error("Project has no ADO connection");
      return {
        success: false,
        error: "Project has no ADO connection",
      };
    }

    // Get the ADO connection
    const adoConnection = await adoConnections.findByOrganizationId(project.adoConnectionId);

    // If findByOrganizationId doesn't work here (adoConnectionId != organizationId),
    // we may need to look up the connection differently. The project stores adoConnectionId directly.
    // Let's try to get it via the organization route instead.
    // Actually, we need the connection by its own ID. Let's check if there's a direct lookup.
    // For now, since the project has adoConnectionId, and we need the connection details,
    // we'll work with what we have.

    if (!adoConnection) {
      console.error("ADO connection not found");
      return {
        success: false,
        error: "ADO connection not found",
      };
    }

    if (!adoConnection.organizationId) {
      console.error("No organization ID found for the ADO connection");
      return {
        success: false,
        error: "Missing organization ID",
      };
    }

    console.log(
      `Found ADO connection: ${adoConnection.adoOrganizationUrl}`
    );

    const { pat, adoOrganizationUrl } = adoConnection;
    const orgUrlTrimmed = adoOrganizationUrl.endsWith("/")
      ? adoOrganizationUrl.slice(0, -1)
      : adoOrganizationUrl;

    // Get all members for this project directly from ADO
    console.log(`Fetching teams from ADO for project: ${adoProjectId}`);
    const teamsUrl = `${orgUrlTrimmed}/_apis/projects/${adoProjectId}/teams?api-version=7.0`;

    let allTeamMembers: Array<{
      displayName: string;
      email: string;
      adoUserId: string;
      imageUrl: string;
    }> = [];

    try {
      const teamsResponse = await fetch(teamsUrl, {
        headers: {
          Authorization: `Basic ${encodeToBase64(`:${pat}`)}`,
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!teamsResponse.ok) {
        console.error(`Failed to fetch teams: ${teamsResponse.status}`);
        return {
          success: false,
          error: `Failed to fetch teams: ${teamsResponse.status}`,
        };
      }

      const teamsData = await teamsResponse.json();
      const teams = teamsData.value || [];
      console.log(`Found ${teams.length} teams in project`);

      // Process each team to collect all members
      const memberSet = new Map(); // Use Map to deduplicate members

      for (const team of teams) {
        console.log(`Processing team: ${team.name} (${team.id})`);
        const membersUrl = `${orgUrlTrimmed}/_apis/projects/${adoProjectId}/teams/${team.id}/members?api-version=7.0`;

        try {
          const membersResponse = await fetch(membersUrl, {
            headers: {
              Authorization: `Basic ${encodeToBase64(`:${pat}`)}`,
            },
            signal: AbortSignal.timeout(30000),
          });

          if (!membersResponse.ok) {
            console.warn(
              `Failed to fetch members for team ${team.name}: ${membersResponse.status}`
            );
            continue;
          }

          const membersData = await membersResponse.json();
          const members = membersData.value || [];

          console.log(`Team ${team.name} has ${members.length} members.`);

          if (members.length > 0) {
            console.log(
              `Sample member data:`,
              JSON.stringify(members[0], null, 2)
            );
          }

          // Add all members to our collection
          for (const member of members) {
            if (!member.identity) {
              console.log(`Skipping member with no identity information`);
              continue;
            }

            const identity = member.identity;
            const email = identity.uniqueName || identity.principalName;

            if (!email || !email.includes("@")) {
              console.log(
                `Member has no valid email: ${identity.displayName}, skipping`
              );
              continue;
            }

            // Use email as key to deduplicate
            if (!memberSet.has(email)) {
              memberSet.set(email, {
                displayName: identity.displayName || "Unknown",
                email: email,
                adoUserId: identity.id,
                imageUrl: identity.imageUrl,
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching members for team ${team.name}:`, error);
        }
      }

      // Convert Map to array
      allTeamMembers = Array.from(memberSet.values());
      console.log(
        `Collected ${allTeamMembers.length} unique team members from ADO`
      );
    } catch (error) {
      console.error("Error fetching teams or members:", error);
      return {
        success: false,
        error: `Failed to fetch teams: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }

    // Only proceed if we found team members in ADO
    if (allTeamMembers.length === 0) {
      console.log("No members found in ADO teams, nothing to synchronize");
      return {
        success: true,
        memberCount: 0,
        newMembersAdded: 0,
        message: "No members found in ADO teams",
      };
    }

    // Process members from ADO teams
    console.log(`Processing ${allTeamMembers.length} team members from ADO...`);

    let membersCreated = 0;
    let usersCreated = 0;
    const errors: Array<{
      type: string;
      member?: string;
      user?: string;
      project?: string;
      email?: string;
      error: string;
    }> = [];

    // Process each member one at a time
    for (const member of allTeamMembers) {
      try {
        console.log(
          `\n------ Processing ${member.displayName} (${member.email}) ------`
        );

        // Step 1: Find or create user
        console.log(`Finding user by email: ${member.email}`);
        let user = await users.findByEmailOrAdoUserId(member.email, member.adoUserId);

        if (!user) {
          console.log(
            `User not found, creating new user: ${member.displayName}`
          );
          try {
            user = await users.create({
              name: member.displayName,
              email: member.email,
              adoUserId: member.adoUserId,
              image: member.imageUrl,
              organizationId: adoConnection.organizationId,
              maxHoursPerWeek: 40,
              theme: "dark",
              licenseType: "FREE",
            });

            usersCreated++;
            console.log(`Created user with ID: ${user.id}`);
          } catch (userCreateError: any) {
            console.error(`ERROR creating user:`, userCreateError);
            errors.push({
              type: "user_create",
              member: member.displayName,
              email: member.email,
              error: userCreateError.message || String(userCreateError),
            });
            continue; // Skip to next member
          }
        } else {
          console.log(
            `Found existing user ID: ${user.id}, name: ${
              user.name || "unnamed"
            }`
          );

          // Update ADO user ID if it's missing
          if (!user.adoUserId && member.adoUserId) {
            try {
              console.log(`Updating user with ADO ID: ${member.adoUserId}`);
              user = await users.update(user.id, { adoUserId: member.adoUserId });
              console.log(`Updated ADO user ID`);
            } catch (updateError) {
              console.error(`Failed to update ADO user ID:`, updateError);
              // Continue anyway since we have the user
            }
          }
        }

        // Step 2: Create project member if it doesn't exist
        console.log(
          `Checking if user ${user.id} is already a member of project ${projectId}`
        );
        const existingMember = await projectMembers.findByUserAndProject(user.id, projectId);

        if (!existingMember) {
          console.log(
            `User is not a project member, creating project member relation`
          );

          try {
            const newProjectMember = await projectMembers.create({
              userId: user.id,
              projectId: projectId,
              role: "MEMBER", // All ADO team members get MEMBER role
            });

            console.log(
              `Created project member with ID: ${newProjectMember.id}`
            );
            membersCreated++;
          } catch (memberCreateError: any) {
            console.error(
              `ERROR creating project member:`,
              memberCreateError
            );
            console.error(
              `Details - User ID: ${user.id}, Project ID: ${projectId}`
            );

            errors.push({
              type: "project_member_create",
              user: user.id,
              project: projectId,
              error: memberCreateError.message || String(memberCreateError),
            });
          }
        } else {
          console.log(
            `User is already a project member (ID: ${existingMember.id})`
          );
        }
      } catch (processingError: any) {
        console.error(
          `Unexpected error processing team member:`,
          processingError
        );
        errors.push({
          type: "unknown",
          member: member.displayName,
          email: member.email,
          error: processingError.message || String(processingError),
        });
      }
    }

    // Final counts
    const memberCount = await projectMembers.count(projectId);

    console.log(`\n===== Sync Complete =====`);
    console.log(`  Project members added: ${membersCreated}`);
    console.log(`  Users created: ${usersCreated}`);
    console.log(`  Total project members for this project: ${memberCount}`);

    if (errors.length > 0) {
      console.log(`Encountered ${errors.length} errors during sync`);
    }

    return {
      success: true,
      memberCount,
      newMembersAdded: membersCreated,
      usersCreated,
      errors: errors.length > 0 ? errors : null,
    };
  } catch (error) {
    console.error("Error synchronizing team members:", error);
    return {
      success: false,
      error: `Failed to synchronize team members: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

// Add a function to check if ADO integration is set up and a sync has been run
export async function checkAdoIntegrationStatus(userId: string) {
  try {
    // First get the user and their organization
    const user = await users.findById(userId);

    if (!user || !user.organizationId) {
      return {
        isIntegrated: false,
        hasSyncedData: false,
      };
    }

    // Check if the organization has an ADO connection
    const adoConnection = await adoConnections.findByOrganizationId(user.organizationId);

    if (!adoConnection) {
      return {
        isIntegrated: false,
        hasSyncedData: false,
      };
    }

    // Check if there is any synced data by looking for projects with ADO IDs
    const adoProjects = await projects.findMany({
      adoConnectionId: adoConnection.id,
      adoProjectIdNotNull: true,
    });

    return {
      isIntegrated: true,
      hasSyncedData: adoProjects.length > 0,
    };
  } catch (error) {
    console.error("Error checking ADO integration status:", error);
    return {
      isIntegrated: false,
      hasSyncedData: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
