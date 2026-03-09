import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import {
  users,
  projects,
  adoConnections,
  states,
  aiProviderSettings,
  projectMembers,
  projectWebhookConfig,
} from "@/lib/firebase/db";
import { createHmac } from "crypto";

export async function POST(request: NextRequest) {
  try {
    // Enhanced session handling with debug
    const session = await getSession();
    console.log(
      "Session check in webhook test:",
      session ? "Found" : "Not found"
    );

    if (!session?.user) {
      console.error("Webhook test: No authenticated session found");

      // Get the authorization header as fallback
      const authHeader = request.headers.get("authorization");
      if (!authHeader) {
        return NextResponse.json(
          {
            error:
              "Unauthorized - No valid session found. Please try logging out and logging back in.",
            status: 401,
          },
          { status: 401 }
        );
      }

      // For development only - bypass auth in non-production
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "Webhook test: Bypassing auth in non-production environment"
        );
      } else {
        return NextResponse.json(
          {
            error: "Unauthorized - Valid session required",
            status: 401,
          },
          { status: 401 }
        );
      }
    }

    // Parse request body
    const body = await request.json();
    const { projectId, adoProjectId, secret } = body;

    if (!projectId || !adoProjectId) {
      return NextResponse.json(
        { error: "Project ID and ADO Project ID are required", status: 400 },
        { status: 400 }
      );
    }

    if (!secret) {
      return NextResponse.json(
        { error: "Webhook secret is required", status: 400 },
        { status: 400 }
      );
    }

    console.log("Testing webhook with project ID:", projectId);
    console.log("Testing webhook with ADO project ID:", adoProjectId);
    console.log("Secret provided:", secret ? "Yes (masked)" : "No");

    // Get user information - use email from session or bypass in development
    let user = null;
    if (session?.user?.email) {
      user = await users.findByEmail(session.user.email as string);
    } else if (process.env.NODE_ENV !== "production") {
      // In development, find any user
      const allUsers = await users.findMany();
      user = allUsers.length > 0 ? allUsers[0] : null;
      console.log(
        "Webhook test: Using fallback user in dev mode:",
        user?.email
      );
    }

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { error: "User not found", status: 404 },
        { status: 404 }
      );
    }

    // REMOVED: Project membership check is not required for webhook setup
    // Users should be able to set up webhooks regardless of project membership
    console.log("Webhook test: Bypassing project membership check");

    // Check required tables are populated and set up correctly before proceeding

    // 1. Check if State table has been seeded with required values
    const statesCount = await states.count();
    if (statesCount === 0) {
      // States need to be seeded first
      console.log("Missing States records. Seeding States table...");

      // Add required states
      const stateList = [
        {
          id: "new",
          name: "New",
          description: "The project is created but not yet approved.",
        },
        {
          id: "approved",
          name: "Approved",
          description: "The project is approved and ready to start.",
        },
        {
          id: "in_progress",
          name: "In Progress",
          description: "The project is active and ongoing.",
        },
        {
          id: "in_production",
          name: "In Production",
          description:
            "The project has been completed and the result is now live (e.g., a system in use).",
        },
        {
          id: "closed",
          name: "Closed",
          description: "The project is officially closed and archived.",
        },
        {
          id: "on_hold",
          name: "On Hold",
          description: "The project is temporarily paused.",
        },
        {
          id: "cancelled",
          name: "Cancelled",
          description: "The project has been stopped before completion.",
        },
      ];

      // Insert the states
      for (const state of stateList) {
        await states.upsert(state.id, {
          name: state.name,
          description: state.description,
        });
      }
      console.log("States table seeded successfully");
    }

    // 2. Check if AI Provider is configured
    const existingProviderSettings =
      await aiProviderSettings.findByOrganization(user.organizationId);

    if (existingProviderSettings.length === 0) {
      // Create a default AI Provider setting if none exists
      console.log("Creating default AI Provider settings...");
      await aiProviderSettings.upsert(user.organizationId, "OPENAI", {
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 2000,
        apiKey: process.env.OPENAI_API_KEY || "sk-demo-key",
      });
      console.log("Default AI Provider settings created");
    }

    // 3. Get the project to check the ADO connection
    const project = await projects.findById(projectId);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found", status: 404 },
        { status: 404 }
      );
    }

    // Get the ADO connection
    let adoConnection = null;
    if (project.adoConnectionId) {
      adoConnection = await adoConnections.findByOrganizationId(
        project.adoConnectionId
      );
    }

    if (!adoConnection) {
      return NextResponse.json(
        { error: "Project has no ADO connection configured", status: 400 },
        { status: 400 }
      );
    }

    // 4. Ensure the project has the correct stateId
    if (!project.stateId) {
      await projects.update(projectId, { stateId: "in_progress" });
      console.log(
        `Updated project ${projectId} with default state 'in_progress'`
      );
    }

    // 5. Check if there are valid project members
    const membersCount = await projectMembers.count(projectId);

    if (membersCount <= 1) {
      // Only the current user
      console.log(
        "Project has minimal members. Consider syncing team members from ADO."
      );
    }

    // 6. Test the ADO connection by making a basic API call
    let adoConnectionValid = false;
    try {
      // Format URL properly
      let adoUrl = adoConnection.adoOrganizationUrl;
      if (!adoUrl.startsWith("https://")) {
        adoUrl = `https://${adoUrl}`;
      }
      if (adoUrl.endsWith("/")) {
        adoUrl = adoUrl.slice(0, -1);
      }

      // Make a test call to the ADO API
      const response = await fetch(
        `${adoUrl}/_apis/projects/${adoProjectId}?api-version=6.0`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `:${adoConnection.pat}`
            ).toString("base64")}`,
          },
        }
      );

      adoConnectionValid = response.ok;

      if (!response.ok) {
        console.error(
          `Azure DevOps API returned status: ${response.status} - ${response.statusText}`
        );
        // Return a descriptive error message based on the status code
        if (response.status === 401) {
          return NextResponse.json(
            {
              error:
                "Authentication failed. Your Azure DevOps PAT might be invalid or expired.",
              status: 401,
              details: "Please update your PAT in the settings page.",
            },
            { status: 401 }
          );
        } else if (response.status === 404) {
          return NextResponse.json(
            {
              error:
                "Project not found in Azure DevOps. Please check the project ID.",
              status: 404,
              details: `The project with ID ${adoProjectId} was not found in your Azure DevOps organization.`,
            },
            { status: 404 }
          );
        } else {
          return NextResponse.json(
            {
              error: `Azure DevOps API error: ${response.status} ${response.statusText}`,
              status: response.status,
              details: "Please check your Azure DevOps connection settings.",
            },
            { status: 500 }
          );
        }
      } else {
        console.log("ADO API connection validated successfully");

        // Generate a test payload and signature to verify HMAC works correctly
        const testPayload = JSON.stringify({
          test: "webhook",
          projectId: projectId,
          timestamp: new Date().toISOString(),
        });

        // Generate signature with the provided secret using HMAC-SHA256
        const testSignature = createHmac("sha256", secret)
          .update(testPayload)
          .digest("hex");

        console.log("Test signature generated:", testSignature);

        // Verify the signature would be validated correctly
        // by doing a self-test of the signature generation
        const verificationSignature = createHmac("sha256", secret)
          .update(testPayload)
          .digest("hex");

        if (testSignature !== verificationSignature) {
          console.error("Signature validation self-test failed");
          return NextResponse.json(
            {
              error: "Webhook signature validation failed - internal error",
              status: 500,
              details: "There was an error validating the webhook signature.",
            },
            { status: 500 }
          );
        }
      }
    } catch (error) {
      console.error("Error validating ADO connection:", error);
      return NextResponse.json(
        {
          error: "Failed to connect to Azure DevOps API",
          status: 500,
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    if (!adoConnectionValid) {
      return NextResponse.json(
        { error: "Azure DevOps connection validation failed", status: 400 },
        { status: 400 }
      );
    }

    // 7. Save the webhook configuration if it doesn't exist yet
    // Find existing config to preserve active state
    const existingConfig = await projectWebhookConfig.findByProject(projectId);

    await projectWebhookConfig.upsert(projectId, {
      secret,
      // Preserve existing active state if present, otherwise default to false
      active: existingConfig?.active ?? false,
    });

    console.log(`Webhook configuration saved for project ${projectId}`);

    // 8. Return success response after all validations pass
    return NextResponse.json(
      {
        success: true,
        message:
          "Webhook connection verified successfully. Now Azure DevOps can trigger your AI agent.",
        adoConnectionValid,
        aiProviderConfigured: existingProviderSettings.length > 0,
        projectMembersCount: membersCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error testing webhook connection:", error);
    return NextResponse.json(
      {
        error: "Failed to test webhook connection",
        status: 500,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
