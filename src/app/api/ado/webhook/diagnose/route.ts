import { NextRequest, NextResponse } from "next/server";
import { createHash, createHmac } from "crypto";

const WEBHOOK_SECRET =
  process.env.ADO_WEBHOOK_SECRET || "default-webhook-secret";

/**
 * GET handler for the diagnostic endpoint - provides information on how to use the endpoint
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "ready",
    message: "ADO Webhook Diagnostic Endpoint",
    instructions:
      "This endpoint is for testing Azure DevOps webhook integration. Use POST method with the same payload and headers that ADO will send.",
    usage: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ado-signature": "Your webhook signature here",
      },
      body: "Your webhook JSON payload",
    },
    tips: [
      "Use Postman to send test requests to this endpoint",
      "Include a valid signature in the x-ado-signature header",
      "The endpoint will show diagnostic information without processing the webhook",
    ],
    postmanGuide: "/api/ado/webhook/postman-test-setup.md",
  });
}

/**
 * POST handler for diagnosing Azure DevOps webhook issues
 * This endpoint does not modify any data, just validates the request
 */
export async function POST(req: NextRequest) {
  console.log("ADO Webhook Diagnostics: Received webhook test");

  try {
    // Get the signature from the request header
    const signature = req.headers.get("x-ado-signature");

    // Get the raw request body for signature validation
    const rawBody = await req.text();

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

    // Detect ADO test payload (check will be done later)

    // Calculate various signatures for debugging
    const sha1Signature = createHmac("sha1", WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");
    const sha256Signature = createHmac("sha256", WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    // Validate the signature
    const cleanSignature = signature
      ? signature.replace(/[^a-fA-F0-9]/g, "")
      : "";
    const isValidSha1 = cleanSignature === sha1Signature;
    const isValidSha256 = cleanSignature === sha256Signature;
    const isValidSignature = isValidSha1 || isValidSha256;

    // Determine if this is a test payload from ADO
    const isAdoTestPayload =
      payload.id === "27646e0e-b520-4d2b-9411-bba7524947cd";

    // Return diagnostic information
    return NextResponse.json({
      status: "success",
      diagnostics: {
        receivedAt: new Date().toISOString(),
        headersParsed: Object.fromEntries(req.headers.entries()),
        signaturePresent: !!signature,
        signatureValid: isValidSignature || isAdoTestPayload, // Test payloads are always considered valid
        isAdoTestPayload: isAdoTestPayload,
        validationMethod: isAdoTestPayload
          ? "ADO Test Payload (auto-validated)"
          : isValidSha1
            ? "SHA-1"
            : isValidSha256
              ? "SHA-256"
              : "None",
        calculatedSignatures: {
          sha1: sha1Signature,
          sha256: sha256Signature,
        },
        payloadSummary: {
          id: payload.id,
          eventType: payload.eventType,
          workItemId: payload.resource?.id,
          workItemTitle: payload.resource?.fields?.["System.Title"],
          projectName: payload.resource?.fields?.["System.TeamProject"],
          assignedTo:
            payload.resource?.fields?.["System.AssignedTo"]?.displayName,
        },
      },
      message: isAdoTestPayload
        ? "ADO test webhook received and automatically validated"
        : isValidSignature
          ? "Webhook received and signature validated successfully"
          : "Webhook received but signature validation failed",
    });
  } catch (error) {
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
