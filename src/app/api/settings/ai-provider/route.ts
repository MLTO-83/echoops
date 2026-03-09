import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users, organizations, aiProviderSettings } from "@/lib/firebase/db";

// GET /api/settings/ai-provider - fetch current org's AI provider settings
export async function GET(req: NextRequest) {
  const session = await getSession();
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
  const settings = await aiProviderSettings.findByOrganization(orgId);
  // Mask apiKey for UI
  const masked = settings.map((s: any) => ({
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

  const session = await getSession();
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

      const org = await organizations.create({ name: orgName });
      console.log("Created organization:", org.id);

      // Update the user with the new organization ID
      await users.update(session.user.id, { organizationId: org.id });
      console.log("Updated user with organization ID");

      console.log("Creating AI provider settings with new organization");
      await aiProviderSettings.upsert(org.id, provider, {
        apiKey,
        model,
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 1000,
      });

      console.log("Successfully created AI provider settings");
      return NextResponse.json({
        success: true,
        message: "AI provider settings created with new organization",
        provider,
      });
    }

    // User has an organization
    const orgId = session.user.organizationId;
    console.log("Using existing organization:", orgId);

    // Upsert AI provider settings
    await aiProviderSettings.upsert(orgId, provider, {
      apiKey,
      model,
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 1000,
    });

    console.log("Successfully saved AI provider settings");
    return NextResponse.json({
      success: true,
      message: "AI provider settings saved successfully",
      provider,
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
