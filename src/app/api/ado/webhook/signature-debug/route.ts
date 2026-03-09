import { NextRequest, NextResponse } from "next/server";
import { createHash, createHmac } from "crypto";
import prisma from "../../../../../lib/prisma";

/**
 * Advanced diagnostic endpoint for webhook signature debugging
 * This is particularly useful for troubleshooting Azure DevOps webhook integration issues
 */
export async function POST(request: NextRequest) {
  try {
    console.log("ADO Webhook Signature Debug: Request received");

    // Get the signature from the request header
    const signature = request.headers.get("x-ado-signature");
    console.log("ADO Webhook Signature Debug: Raw header value:", signature);

    // Get URL parameters (for testing via direct URL with ?secret=xyz)
    const url = new URL(request.url);
    const secretFromUrl = url.searchParams.get("secret");

    // Get the raw request body for signature validation
    const rawBody = await request.text();

    // Parse the request body
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      return NextResponse.json(
        {
          status: "error",
          error: "Invalid JSON payload",
          rawBodyPreview: rawBody.substring(0, 100) + "...",
        },
        { status: 400 }
      );
    }

    // Try to identify the project
    let projectId: string | undefined;
    let secret = process.env.ADO_WEBHOOK_SECRET || "default-webhook-secret";
    let projectName = "";

    // If secret is provided in the URL, use it first (highest priority for testing)
    if (secretFromUrl) {
      secret = secretFromUrl;
      console.log("Using secret from URL parameter for testing");
    }

    if (payload.resource?.fields?.["System.TeamProject"]) {
      projectName = payload.resource.fields["System.TeamProject"];

      // Try to find the project by name
      try {
        const project = await prisma.project.findFirst({
          where: { name: projectName },
          include: { webhookConfig: true },
        });

        if (project) {
          projectId = project.id;

          // Use project-specific secret if available
          if (project.webhookConfig?.secret) {
            secret = project.webhookConfig.secret;
            console.log(
              `Using project-specific webhook secret for project ${projectName}`
            );
          }
        }
      } catch (error) {
        console.error(`Error finding project: ${error}`);
      }
    }

    // Also try to get projectId from body if provided directly
    if (payload.projectId && !projectId) {
      try {
        const project = await prisma.project.findUnique({
          where: { id: payload.projectId },
          include: { webhookConfig: true },
        });

        if (project) {
          projectId = project.id;
          projectName = project.name;

          if (project.webhookConfig?.secret) {
            secret = project.webhookConfig.secret;
            console.log(
              `Using project-specific webhook secret for project ID ${projectId}`
            );
          }
        }
      } catch (error) {
        console.error(`Error finding project by ID: ${error}`);
      }
    }

    // If secret is provided in the request body, use it (for direct testing)
    if (payload.secret && process.env.NODE_ENV !== "production") {
      secret = payload.secret;
      console.log("Using secret from request body for testing");
    }

    // Calculate signatures using different algorithms
    const sha1Signature = createHmac("sha1", secret)
      .update(rawBody)
      .digest("hex");
    const sha256Signature = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    const sha256SignatureWithPrefix = "sha256=" + sha256Signature;

    // When using the ADO webhook UI, sometimes they add a prefix
    const signatureWithoutPrefix =
      signature && signature.startsWith("sha256=")
        ? signature.substring(7)
        : signature;

    // Clean the provided signature (if any)
    const cleanedSignature = signature
      ? signature.replace(/[^a-fA-F0-9]/g, "").toLowerCase()
      : "";

    // Check if any signatures match
    const matchesSha1 =
      cleanedSignature.toLowerCase() === sha1Signature.toLowerCase();
    const matchesSha256 =
      cleanedSignature.toLowerCase() === sha256Signature.toLowerCase();
    const matchesSha256WithoutPrefix =
      signatureWithoutPrefix &&
      signatureWithoutPrefix.replace(/[^a-fA-F0-9]/g, "").toLowerCase() ===
        sha256Signature.toLowerCase();

    // Return diagnostic information
    return NextResponse.json({
      status: "success",
      diagnostics: {
        timestamp: new Date().toISOString(),
        projectFound: !!projectId,
        projectInfo: projectId
          ? {
              id: projectId,
              name: projectName,
              webhookConfigExists: !!secret,
            }
          : "No matching project found",
        signatureInfo: {
          headerPresent: !!signature,
          rawHeader: signature,
          cleanedSignature: cleanedSignature,
        },
        signatureMatching: {
          matchesAnySupportedFormat:
            matchesSha1 || matchesSha256 || matchesSha256WithoutPrefix,
          matchesSha1: matchesSha1,
          matchesSha256: matchesSha256,
          matchesSha256WithoutPrefix: matchesSha256WithoutPrefix,
        },
        calculatedSignatures: {
          sha1: sha1Signature,
          sha256: sha256Signature,
          sha256WithPrefix: sha256SignatureWithPrefix,
        },
        payloadInfo: {
          eventType: payload.eventType,
          id: payload.id,
          teamProject:
            payload.resource?.fields?.["System.TeamProject"] || "Not found",
          workItemId:
            payload.resource?.workItemId || payload.resource?.id || "Not found",
        },
      },
      recommendations: !signature
        ? [
            "The x-ado-signature header is missing. Make sure it's included in your webhook configuration.",
            "Check the Azure DevOps webhook configuration to ensure the secret is properly set.",
          ]
        : !matchesSha1 && !matchesSha256 && !matchesSha256WithoutPrefix
          ? [
              "The signature doesn't match any supported format.",
              "Verify the webhook secret matches between Azure DevOps and your Portavi project settings.",
              "Try copying and pasting the secret again to avoid hidden characters.",
            ]
          : [
              "Signature validation successful! Your webhook is correctly configured.",
            ],
      message:
        matchesSha1 || matchesSha256 || matchesSha256WithoutPrefix
          ? "Webhook signature validation was successful"
          : "Webhook signature validation failed",
    });
  } catch (error) {
    console.error("Error in signature debug endpoint:", error);
    return NextResponse.json(
      {
        status: "error",
        error: "Diagnostic endpoint error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler to support CORS preflight checks from Azure DevOps
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-ado-signature",
    },
  });
}

// GET handler provides usage instructions for this endpoint
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "ready",
    message: "ADO Webhook Signature Debug Endpoint",
    instructions:
      "This endpoint helps diagnose signature validation issues with Azure DevOps webhooks.",
    usage: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ado-signature": "Your webhook signature",
      },
      body: "Send the exact same payload that Azure DevOps is sending",
      optionalBodyParameters: {
        secret:
          "For testing, you can include a 'secret' field with your webhook secret",
        projectId:
          "You can also specify a projectId directly to test with a specific project's settings",
      },
    },
    note: "This endpoint is intended for debugging only and doesn't process the webhook",
  });
}
