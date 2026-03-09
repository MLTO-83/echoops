import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users, organizations, aiAgentJobs } from "@/lib/firebase/db";

/**
 * POST /api/ai/agent-config - Save AI agent configuration without executing immediately
 * This endpoint stores the repository and prompt to be triggered by a webhook later
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get request data
    const data = await req.json();
    const { projectId, prompt, repositoryName = "default", modelName } = data;

    // Validate inputs
    if (!projectId || !prompt || !repositoryName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the user's organization
    const user = await users.findByEmail(session.user.email as string);

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { error: "User not associated with an organization" },
        { status: 400 }
      );
    }

    const organization = await organizations.findById(user.organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: "User not associated with an organization" },
        { status: 400 }
      );
    }

    // Store model name information if provided
    const adoWorkItemType = modelName ? `${modelName}` : null;

    // Create a record of this configuration with "CONFIGURED" status
    // This indicates it's ready to be picked up by the webhook
    const configEntry = await aiAgentJobs.create({
      projectId,
      prompt,
      repositoryName,
      status: "CONFIGURED", // Special status to indicate waiting for webhook trigger
      adoWorkItemType: adoWorkItemType, // Store the model name for later use
      adoWorkItemTitle: "Waiting for work item assignment", // Descriptive status
    });

    // Return success response with the configuration ID
    return NextResponse.json({
      success: true,
      configId: configEntry.id,
      message: "AI agent configuration saved successfully",
    });
  } catch (error) {
    console.error("Error saving AI agent configuration:", error);
    return NextResponse.json(
      { error: "Failed to save AI agent configuration" },
      { status: 500 }
    );
  }
}
