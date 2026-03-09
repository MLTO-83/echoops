import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/settings/ai-provider - fetch current org's AI provider settings
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );

  // If user has no organization, return empty settings
  if (!session.user.organizationId) {
    console.log("User has no organization, returning empty settings");
    return NextResponse.json({ aiProviderSettings: [] });
  }

  const orgId = session.user.organizationId as string;
  const settings = await prisma.aIProviderSettings.findMany({
    where: { organizationId: orgId },
  });
  // Mask apiKey for UI
  const masked = settings.map((s) => ({
    id: s.id,
    provider: s.provider,
    apiKey: s.apiKey ? "************" : "",
    model: s.model,
    temperature: s.temperature,
    maxTokens: s.maxTokens,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
  return NextResponse.json({ aiProviderSettings: masked });
}

// POST /api/settings/ai-provider - upsert AI provider settings for org
export async function POST(req: NextRequest) {
  console.log("AI Provider POST endpoint called");

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    console.log("No authenticated user found");
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  console.log("User session:", {
    id: session.user.id,
    email: session.user.email,
    organizationId: session.user.organizationId,
  });

  try {
    // Parse request body first
    const requestBody = await req.json();
    console.log("Request body:", { ...requestBody, apiKey: "REDACTED" });

    const { provider, apiKey, model, temperature, maxTokens } = requestBody;

    // Validate required fields
    if (!provider || !apiKey) {
      console.log("Missing required fields");
      return NextResponse.json(
        { error: "Provider and API key are required" },
        { status: 400 }
      );
    }

    // Check if the user has an organization
    if (!session.user.organizationId) {
      console.log("User has no organization, creating one");

      // Create a new organization for this user
      const orgName =
        session.user.name ||
        session.user.email?.split("@")[0] ||
        "My Organization";
      console.log("Creating new organization:", orgName);

      const organization = await prisma.organization.create({
        data: { name: orgName },
      });
      console.log("Created organization:", organization.id);

      // Update the user with the new organization ID
      await prisma.user.update({
        where: { id: session.user.id },
        data: { organizationId: organization.id },
      });
      console.log("Updated user with organization ID");

      // Use the new organization ID
      const orgId = organization.id;

      console.log("Creating AI provider settings with new organization");
      const settings = await prisma.aIProviderSettings.create({
        data: {
          organizationId: orgId,
          provider,
          apiKey,
          model,
          temperature: temperature || 0.7,
          maxTokens: maxTokens || 1000,
        },
      });

      console.log(
        "Successfully created AI provider settings with ID:",
        settings.id
      );
      return NextResponse.json({
        success: true,
        message: "AI provider settings created with new organization",
        provider: settings.provider,
      });
    }

    // User has an organization
    const orgId = session.user.organizationId;
    console.log("Using existing organization:", orgId);

    // First try to find existing settings
    const existing = await prisma.aIProviderSettings.findUnique({
      where: {
        organizationId_provider: {
          organizationId: orgId,
          provider: provider,
        },
      },
    });

    let result;
    if (existing) {
      console.log("Updating existing AI provider settings");
      result = await prisma.aIProviderSettings.update({
        where: { id: existing.id },
        data: {
          apiKey,
          model,
          temperature: temperature || 0.7,
          maxTokens: maxTokens || 1000,
        },
      });
    } else {
      console.log("Creating new AI provider settings");
      result = await prisma.aIProviderSettings.create({
        data: {
          organizationId: orgId,
          provider,
          apiKey,
          model,
          temperature: temperature || 0.7,
          maxTokens: maxTokens || 1000,
        },
      });
    }

    console.log("Successfully saved AI provider settings with ID:", result.id);
    return NextResponse.json({
      success: true,
      message: "AI provider settings saved successfully",
      provider: result.provider,
    });
  } catch (error) {
    console.error("Error processing AI provider settings:", error);
    // Return detailed error information
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to save AI provider settings: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to save AI provider settings" },
      { status: 500 }
    );
  }
}
