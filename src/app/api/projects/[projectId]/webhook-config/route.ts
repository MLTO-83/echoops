import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, get the project with the related organization (via adoConnection)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        adoConnection: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get the current user with their organization
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has access to this project as a member
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
      },
    });

    // Check if user is an organization admin (same organization as the project)
    const isOrgAdmin =
      user.organizationId &&
      project.adoConnection?.organizationId === user.organizationId;

    // User needs to be either a project member or an org admin
    if (!projectMember && !isOrgAdmin) {
      return NextResponse.json(
        {
          error:
            "You don't have access to this project's webhook configuration",
        },
        { status: 403 }
      );
    }

    // Get webhook config
    const webhookConfig = await prisma.projectWebhookConfig.findUnique({
      where: {
        projectId,
      },
      select: {
        id: true,
        active: true,
        repositoryName: true,
        agentInstructions: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        // Only return the secret if explicitly requested
        secret: includeSecret ? true : false,
      },
    });

    // If no config exists yet, return an empty object with defaults
    if (!webhookConfig) {
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

    // Ensure active is always returned as a boolean
    return NextResponse.json({
      ...webhookConfig,
      active: Boolean(webhookConfig.active), // Explicit boolean conversion
    });
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

    // Check if secret should be included in response
    const includeSecret = url.searchParams.get("includeSecret") === "true";

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, get the project with the related organization (via adoConnection)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        adoConnection: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get the current user with their organization
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has access to this project as a member
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
      },
    });

    // Check if user is an organization admin (same organization as the project)
    const isOrgAdmin =
      user.organizationId &&
      project.adoConnection?.organizationId === user.organizationId;

    // User needs to be either a project member or an org admin
    if (!projectMember && !isOrgAdmin) {
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

    // Create or update webhook config
    const webhookConfig = await prisma.projectWebhookConfig.upsert({
      where: {
        projectId,
      },
      update: {
        active: normalizedActive,
        repositoryName: data.repositoryName,
        agentInstructions: data.agentInstructions,
        description: data.description,
      },
      create: {
        projectId,
        active: normalizedActive,
        repositoryName: data.repositoryName,
        agentInstructions: data.agentInstructions,
        description: data.description,
        secret: generateWebhookSecret(),
      },
    });

    // Create response with explicit boolean conversion for active state
    return NextResponse.json({
      id: webhookConfig.id,
      active: Boolean(webhookConfig.active), // Ensure active is always a boolean in the response
      repositoryName: webhookConfig.repositoryName,
      agentInstructions: webhookConfig.agentInstructions,
      description: webhookConfig.description,
      createdAt: webhookConfig.createdAt,
      updatedAt: webhookConfig.updatedAt,
      // Always include the secret in the POST response to ensure it's preserved across edits
      secret: webhookConfig.secret,
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, get the project with the related organization (via adoConnection)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        adoConnection: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get the current user with their organization
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is a project OWNER
    const isProjectOwner = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
        role: "OWNER", // Only owners can delete webhook config
      },
    });

    // Check if user is an organization admin (same organization as the project)
    const isOrgAdmin =
      user.organizationId &&
      project.adoConnection?.organizationId === user.organizationId;

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
    await prisma.projectWebhookConfig.delete({
      where: {
        projectId,
      },
    });

    return NextResponse.json({ message: "Webhook configuration deleted" });
  } catch (error) {
    console.error("Error deleting webhook config:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook configuration" },
      { status: 500 }
    );
  }
}
