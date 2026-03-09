import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { projects, users, projectMembers, projectWebhookConfig, adoConnections } from "@/lib/firebase/db";

/**
 * GET handler to retrieve webhook config for a project
 * Uses URL-based project ID extraction to work around Next.js type issues
 *
 * Access is granted to:
 * 1. Project members of the project
 * 2. Organization admins of the organization that owns the project
 */
export async function GET(request: Request) {
  try {
    // Extract projectId from the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    // Check if secret should be included in response
    const includeSecret = url.searchParams.get("includeSecret") === "true";

    // Get user session
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, get the project
    const project = await projects.findById(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get the ADO connection to check organization
    let adoConnection = null;
    if (project.adoConnectionId) {
      adoConnection = await adoConnections.findById(project.adoConnectionId);
    }

    // Get the current user with their organization
    const user = await users.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has access to this project as a member
    const member = await projectMembers.findByUserAndProject(user.id, projectId);

    // Check if user is an organization admin (same organization as the project)
    const isOrgAdmin =
      user.organizationId &&
      adoConnection?.organizationId === user.organizationId;

    // User needs to be either a project member or an org admin
    if (!member && !isOrgAdmin) {
      return NextResponse.json(
        {
          error:
            "You don't have access to this project's webhook configuration",
        },
        { status: 403 }
      );
    }

    // Get webhook config
    const webhookCfg = await projectWebhookConfig.findByProject(projectId);

    // If no config exists yet, return an empty object with defaults
    if (!webhookCfg) {
      return NextResponse.json(
        {
          active: false,
          repositoryName: "",
          agentInstructions: "",
          description: "",
          // Include an empty secret if requested
          ...(includeSecret && { secret: "" }),
        },
        { status: 200 }
      );
    }

    // Build response, optionally excluding secret
    const response: Record<string, unknown> = {
      id: webhookCfg.id,
      active: Boolean(webhookCfg.active),
      repositoryName: webhookCfg.repositoryName,
      agentInstructions: webhookCfg.agentInstructions,
      description: webhookCfg.description,
      createdAt: webhookCfg.createdAt,
      updatedAt: webhookCfg.updatedAt,
    };

    if (includeSecret) {
      response.secret = webhookCfg.secret || "";
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error retrieving webhook config:", error);
    return NextResponse.json(
      { error: "Failed to retrieve webhook configuration" },
      { status: 500 }
    );
  }
}

/**
 * POST handler to create or update webhook config for a project
 * Uses URL-based project ID extraction to work around Next.js type issues
 *
 * Access is granted to:
 * 1. Project members of the project
 * 2. Organization admins of the organization that owns the project
 */
export async function POST(request: Request) {
  try {
    // Extract projectId from the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    // Get user session
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, get the project
    const project = await projects.findById(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get the ADO connection to check organization
    let adoConnection = null;
    if (project.adoConnectionId) {
      adoConnection = await adoConnections.findById(project.adoConnectionId);
    }

    // Get the current user with their organization
    const user = await users.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has access to this project as a member
    const member = await projectMembers.findByUserAndProject(user.id, projectId);

    // Check if user is an organization admin (same organization as the project)
    const isOrgAdmin =
      user.organizationId &&
      adoConnection?.organizationId === user.organizationId;

    // User needs to be either a project member or an org admin
    if (!member && !isOrgAdmin) {
      return NextResponse.json(
        {
          error:
            "You don't have access to update this project's webhook configuration",
        },
        { status: 403 }
      );
    }

    // Parse request body
    const data = await request.json();

    // Generate a webhook secret if one doesn't exist
    function generateWebhookSecret() {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let result = "";
      for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }

    // Normalize active state to ensure consistency across environments
    // Convert various active formats to a boolean (true, "true", 1, "1")
    const normalizedActive =
      data.active === true ||
      data.active === "true" ||
      data.active === 1 ||
      data.active === "1";

    console.log(
      "API: Normalizing webhook active state:",
      data.active,
      "->",
      normalizedActive,
      "type:",
      typeof data.active,
      "->",
      typeof normalizedActive
    );

    // Check if config already exists to preserve the secret
    const existingConfig = await projectWebhookConfig.findByProject(projectId);
    const secret = existingConfig?.secret || generateWebhookSecret();

    // Create or update webhook config
    const webhookCfg = await projectWebhookConfig.upsert(projectId, {
      active: normalizedActive,
      repositoryName: data.repositoryName,
      agentInstructions: data.agentInstructions,
      description: data.description,
      secret,
    });

    // Create response with explicit boolean conversion for active state
    return NextResponse.json({
      id: webhookCfg.id,
      active: Boolean(webhookCfg.active), // Ensure active is always a boolean in the response
      repositoryName: webhookCfg.repositoryName,
      agentInstructions: webhookCfg.agentInstructions,
      description: webhookCfg.description,
      createdAt: webhookCfg.createdAt,
      updatedAt: webhookCfg.updatedAt,
      // Always include the secret in the POST response to ensure it's preserved across edits
      secret: webhookCfg.secret,
    });
  } catch (error) {
    console.error("Error updating webhook config:", error);
    return NextResponse.json(
      { error: "Failed to update webhook configuration" },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler to remove webhook config from a project
 * Uses URL-based project ID extraction to work around Next.js type issues
 *
 * Access is granted to:
 * 1. Project OWNER role members
 * 2. Organization admins of the organization that owns the project
 */
export async function DELETE(request: Request) {
  try {
    // Extract projectId from the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    // Get user session
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, get the project
    const project = await projects.findById(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get the ADO connection to check organization
    let adoConnection = null;
    if (project.adoConnectionId) {
      adoConnection = await adoConnections.findById(project.adoConnectionId);
    }

    // Get the current user with their organization
    const user = await users.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is a project OWNER
    const member = await projectMembers.findByUserAndProject(user.id, projectId);
    const isProjectOwner = member && member.role === "OWNER";

    // Check if user is an organization admin (same organization as the project)
    const isOrgAdmin =
      user.organizationId &&
      adoConnection?.organizationId === user.organizationId;

    // User needs to be either a project OWNER or an org admin
    if (!isProjectOwner && !isOrgAdmin) {
      return NextResponse.json(
        {
          error:
            "You don't have permission to delete this webhook configuration",
        },
        { status: 403 }
      );
    }

    // Delete webhook config
    await projectWebhookConfig.delete(projectId);

    return NextResponse.json({ message: "Webhook configuration deleted" });
  } catch (error) {
    console.error("Error deleting webhook config:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook configuration" },
      { status: 500 }
    );
  }
}
