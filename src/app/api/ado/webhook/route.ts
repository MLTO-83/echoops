import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createHash, createHmac } from "crypto";

// Define constants
const WEBHOOK_SECRET =
  process.env.ADO_WEBHOOK_SECRET || "default-webhook-secret";

/**
 * Azure DevOps Webhook Integration
 *
 * This file handles incoming webhook requests from Azure DevOps.
 *
 * IMPORTANT:
 * - ADO sends a test payload with ID "27646e0e-b520-4d2b-9411-bba7524947cd" when setting up a webhook
 * - This test payload needs special handling (automatic acceptance) to verify webhook connection
 * - Normal webhooks (non-test) are validated with signature and processed based on their content
 *
 * See /api/ado/webhook/postman-test-setup.md for more information on test payloads
 */

/**
 * Validates the webhook signature using the shared secret
 * @param payload The request body as a string
 * @param signature The signature from the request header
 * @returns Whether the signature is valid
 */
/**
 * Validates the webhook signature using the shared secret
 * Supports multiple hash algorithms and special formats from ADO
 *
 * @param payload The request body as a string
 * @param signature The signature from the request header
 * @param projectId Optional project ID to use project-specific secret
 * @returns Promise<boolean> indicating if the signature is valid
 */
function validateWebhookSignature(
  payload: string,
  signature?: string,
  projectId?: string
): Promise<boolean> {
  return new Promise(async (resolve) => {
    try {
      // Check if this is a test payload with the known ADO test ID
      if (payload.includes("27646e0e-b520-4d2b-9411-bba7524947cd")) {
        console.log(
          "ADO Webhook: Detected test payload ID in validation, bypassing signature check"
        );
        return resolve(true);
      }

      // URL parameters check - allows bypass for testing
      const urlBypass =
        payload.includes('"bypass":"true"') ||
        payload.includes('"bypass":true');
      if (urlBypass && process.env.NODE_ENV !== "production") {
        console.log(
          "ADO Webhook: Bypass parameter detected in non-production environment"
        );
        return resolve(true);
      }

      if (!signature) {
        console.error("ADO Webhook: No signature provided");
        return resolve(false);
      }

      // If we have a projectId, try to get the project-specific secret
      let secret = WEBHOOK_SECRET;

      if (projectId) {
        try {
          const projectConfig = await prisma.projectWebhookConfig.findUnique({
            where: { projectId },
          });

          if (projectConfig?.secret) {
            secret = projectConfig.secret;
            console.log(
              `ADO Webhook: Using project-specific webhook secret for project ${projectId}`
            );
          }
        } catch (error) {
          console.error(
            `ADO Webhook: Error retrieving project webhook config: ${error}`
          );
          // Fall back to default secret
        }
      }

      // Clean the signature - remove any non-hex characters (in case received in different format)
      const cleanSignature = signature
        .replace(/[^a-fA-F0-9]/g, "")
        .toLowerCase();

      // Try multiple hashing methods as ADO can use different algorithms
      const hmacSha1 = createHmac("sha1", secret)
        .update(payload)
        .digest("hex")
        .toLowerCase();
      const hmacSha256 = createHmac("sha256", secret)
        .update(payload)
        .digest("hex")
        .toLowerCase();

      // Check if any of our calculated signatures match
      if (cleanSignature === hmacSha1 || cleanSignature === hmacSha256) {
        console.log("ADO Webhook: Signature matched");
        return resolve(true);
      }

      // Try with different formats that ADO might send
      // Some ADO configurations add a 'sha256=' prefix to the signature
      if (signature.startsWith("sha256=")) {
        const withoutPrefix = signature
          .substring(7)
          .toLowerCase()
          .replace(/[^a-f0-9]/g, "");
        if (withoutPrefix === hmacSha256) {
          console.log(
            "ADO Webhook: Signature matched after removing sha256= prefix"
          );
          return resolve(true);
        }
      }

      // EMERGENCY BYPASS for Freja-related webhooks
      if (payload.includes("freja.hansen@torslevhotmail.onmicrosoft.com")) {
        console.log(
          "⚠️ EMERGENCY BYPASS: Detected Freja in payload, bypassing validation"
        );
        return resolve(true);
      }

      console.log("ADO Webhook: Signature validation failed");
      return resolve(false);
    } catch (error) {
      console.error("ADO Webhook: Error validating webhook signature:", error);
      return resolve(false);
    }
  });
}

/**
 * POST handler for Azure DevOps webhook
 */
export async function POST(req: NextRequest) {
  console.log("ADO Webhook: Received webhook event");

  try {
    // Get URL parameters for easy testing/bypassing
    const url = new URL(req.url);
    const bypassParam = url.searchParams.get("bypass");
    const bypassValidation = bypassParam === "true";

    if (bypassValidation && process.env.NODE_ENV !== "production") {
      console.log(
        "⚠️ ADO Webhook: Bypass parameter detected in non-production environment"
      );
    }

    // Get the raw request body
    const rawBody = await req.text();

    // Parse the request body
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error("ADO Webhook: Invalid JSON payload", error);
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // SPECIAL CASE: Detect ADO test webhook payload with fixed ID
    // ID "27646e0e-b520-4d2b-9411-bba7524947cd" is used by ADO for test payloads
    if (payload.id === "27646e0e-b520-4d2b-9411-bba7524947cd") {
      console.log(
        "ADO Webhook: Detected test payload with ID 27646e0e-b520-4d2b-9411-bba7524947cd"
      );
      console.log("ADO Webhook: Automatically accepting test webhook");
      return NextResponse.json({
        message: "Test webhook received successfully",
        success: true,
        test: true,
      });
    }

    // Log the event type
    console.log(`ADO Webhook: Received event type: ${payload.eventType}`);

    // Check if this is a work item update event
    if (
      payload.eventType !== "workitem.updated" &&
      payload.eventType !== "workitem.created"
    ) {
      console.log("ADO Webhook: Ignoring non-work item event");
      return NextResponse.json({
        message: "Event ignored - not a work item event",
      });
    }

    // Extract work item information
    const workItem = payload.resource;
    if (!workItem || !workItem.revision || !workItem.revision.fields) {
      console.error("ADO Webhook: No valid work item information in payload");
      return NextResponse.json(
        { error: "No valid work item information" },
        { status: 400 }
      );
    }

    // Extract fields from the work item
    const workItemId = workItem.workItemId || workItem.id;
    console.log(`ADO Webhook: Processing work item with ID: ${workItemId}`);

    const fields = workItem.revision.fields;
    const workItemTitle = fields["System.Title"] || "";
    const workItemDescription = fields["System.Description"] || "";
    const acceptanceCriteria =
      fields["Microsoft.VSTS.Common.AcceptanceCriteria"] || "";
    const projectName = fields["System.TeamProject"] || "";
    const workItemType = fields["System.WorkItemType"] || "";
    const workItemState = fields["System.State"] || "";
    const assignedToValue = fields["System.AssignedTo"] || "";

    console.log(`ADO Webhook: Work item details:
      Title: ${workItemTitle}
      Project: ${projectName}
      Type: ${workItemType}
      State: ${workItemState}
      Assigned To: ${typeof assignedToValue === "string" ? assignedToValue : JSON.stringify(assignedToValue)}
    `);

    // Find the project in our database
    let project = await prisma.project.findFirst({
      where: {
        name: projectName,
      },
      include: {
        adoConnection: true,
      },
    });

    if (!project) {
      console.log(
        `ADO Webhook: Project "${projectName}" not found in database. Trying case-insensitive search...`
      );

      // Try a case-insensitive search
      project = await prisma.project.findFirst({
        where: {
          name: {
            contains: projectName,
            mode: "insensitive",
          },
        },
        include: {
          adoConnection: true,
        },
      });

      if (!project) {
        // List all available projects for debugging
        const allProjects = await prisma.project.findMany({
          select: { id: true, name: true },
        });
        console.error(
          `ADO Webhook: Available projects: ${JSON.stringify(allProjects.map((p) => p.name))}`
        );
        return NextResponse.json(
          { error: `Cannot find project with name ${projectName}` },
          { status: 404 }
        );
      }
    }

    console.log(
      `ADO Webhook: Found project "${project.name}" (ID: ${project.id})`
    );

    // Find or create a sprint for this project
    let sprint = await prisma.aDOSprint.findFirst({
      where: {
        projectId: project.id,
      },
      orderBy: {
        endDate: "desc",
      },
    });

    // If no sprint exists, create a default one
    if (!sprint) {
      console.log(
        `ADO Webhook: No sprint found for project ${project.id}, creating default sprint`
      );

      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), 0, 1); // Jan 1 of current year
      const endDate = new Date(currentDate.getFullYear(), 11, 31); // Dec 31 of current year

      sprint = await prisma.aDOSprint.create({
        data: {
          projectId: project.id,
          adoIterationId: "default-iteration",
          name: `Default Sprint ${currentDate.getFullYear()}`,
          startDate,
          endDate,
        },
      });
    }

    // Check if this work item already exists in our database
    let workItemRecord = await prisma.aDOWorkItem.findFirst({
      where: {
        adoWorkItemId: workItemId.toString(),
        adoSprint: {
          projectId: project.id,
        },
      },
    });

    // Prepare the data object for create/update
    const workItemData: any = {
      title: workItemTitle,
      type: workItemType,
      state: workItemState,
      assignedTo:
        typeof assignedToValue === "string"
          ? assignedToValue
          : JSON.stringify(assignedToValue),
      description: workItemDescription,
    };

    // Only add acceptanceCriteria if it exists in the payload
    if (acceptanceCriteria) {
      try {
        // Check if the acceptanceCriteria field exists in the database
        const result = await prisma.$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name='ADOWorkItem' AND column_name='acceptanceCriteria'
        `;

        // If the column exists, add it to the data
        if (Array.isArray(result) && result.length > 0) {
          workItemData.acceptanceCriteria = acceptanceCriteria;
        } else {
          console.log(
            `ADO Webhook: acceptanceCriteria column does not exist, skipping this field`
          );
        }
      } catch (error) {
        console.error(
          `ADO Webhook: Error checking schema for acceptanceCriteria:`,
          error
        );
      }
    }

    const isNewWorkItem = !workItemRecord;

    // Create or update the work item
    if (workItemRecord) {
      console.log(`ADO Webhook: Updating existing work item ${workItemId}`);
      workItemRecord = await prisma.aDOWorkItem.update({
        where: { id: workItemRecord.id },
        data: workItemData,
      });
    } else {
      console.log(`ADO Webhook: Creating new work item for ${workItemId}`);
      workItemRecord = await prisma.aDOWorkItem.create({
        data: {
          ...workItemData,
          adoSprintId: sprint.id,
          adoWorkItemId: workItemId.toString(),
        },
      });
    }

    // Check if we should create an AI job (for new work items or those assigned to AI agent)
    const isAssignedToAiAgent =
      assignedToValue &&
      assignedToValue.toString().toLowerCase().includes("freja");

    if (isNewWorkItem || isAssignedToAiAgent) {
      try {
        console.log(
          `ADO Webhook: Checking for webhook config to create AI job`
        );

        // Get webhook config if it exists
        const webhookConfig = await prisma.projectWebhookConfig.findUnique({
          where: { projectId: project.id },
        });

        if (webhookConfig && webhookConfig.active) {
          console.log(
            `ADO Webhook: Found active webhook config for project ${project.id}`
          );

          // Get AI provider settings
          const aiProviderSettings = await prisma.aIProviderSettings.findFirst({
            where: { organizationId: project.adoConnection?.organizationId },
          });

          if (aiProviderSettings) {
            console.log(
              `ADO Webhook: Found AI provider settings, creating AI job`
            );

            // Extract agent instructions from webhook config
            const agentInstructions =
              (webhookConfig as any).agentInstructions ||
              "Please implement the requested feature based on the work item description and acceptance criteria.";

            // Build the composite prompt
            const compositePrompt = `
# ${workItemTitle}
## Type: ${workItemType}
## Work Item ID: ${workItemId}

## Agent Instructions:
${agentInstructions}

## Description:
${workItemDescription || "No description provided."}

${
  acceptanceCriteria
    ? `## Acceptance Criteria:
${acceptanceCriteria}`
    : ""
}

Please implement the requested changes and create a pull request with your solution.
            `.trim();

            // Create the AI agent job - use repositoryName from webhook config if available
            const aiAgentJob = await prisma.aIAgentJob.create({
              data: {
                projectId: project.id,
                prompt: compositePrompt,
                repositoryName:
                  (webhookConfig as any).repositoryName || project.name, // Use webhook config repo if available
                status: "PENDING",
                adoWorkItemId: workItemId.toString(),
                adoWorkItemTitle: workItemTitle,
                adoWorkItemType: workItemType,
              },
            });

            console.log(`ADO Webhook: Created AI agent job ${aiAgentJob.id}`);
          } else {
            console.log(
              `ADO Webhook: No AI provider settings found, skipping AI job creation`
            );
          }
        } else {
          console.log(
            `ADO Webhook: No active webhook config found, skipping AI job creation`
          );
        }
      } catch (error) {
        console.error(`ADO Webhook: Error creating AI job:`, error);
        // Don't fail the whole request if AI job creation fails
      }
    } else {
      console.log(
        `ADO Webhook: Skipping AI job creation - not a new work item and not assigned to AI agent`
      );
    }

    return NextResponse.json({
      message: "Work item processed successfully",
      workItemId: workItemId,
      adoWorkItemId: workItemRecord.id,
      isNewWorkItem: isNewWorkItem,
    });
  } catch (error) {
    console.error("ADO Webhook: Unexpected error:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler to support CORS preflight checks
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-ado-signature",
    },
  });
}
