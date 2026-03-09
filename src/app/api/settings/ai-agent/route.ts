import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users, aiAgentSettings } from "@/lib/firebase/db";

// GET /api/settings/ai-agent - fetch org users and active agent
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );

  const orgId = session.user.organizationId;

  // fetch org users
  const allUsers = await users.findMany();
  const orgUsers = allUsers
    .filter((u: any) => u.organizationId === orgId)
    .map((u: any) => ({ id: u.id, name: u.name, email: u.email }));

  // fetch active agent setting
  const allAgentSettings = await aiAgentSettings.findAll();
  const active = allAgentSettings.find((s: any) => {
    if (!s.isActive) return false;
    const matchingUser = allUsers.find((u: any) => u.id === s.userId && u.organizationId === orgId);
    return !!matchingUser;
  });

  return NextResponse.json({
    users: orgUsers,
    activeAgentUserId: active?.userId || null,
  });
}

// POST /api/settings/ai-agent - set the active agent user
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );

  // Ensure the user has an organization
  if (!session.user.organizationId) {
    return NextResponse.json(
      { error: "User must be part of an organization" },
      { status: 400 }
    );
  }

  const orgId = session.user.organizationId as string;
  const { userId } = await req.json();

  if (!userId)
    return NextResponse.json({ error: "User ID required" }, { status: 400 });

  try {
    // verify user belongs to org
    const user = await users.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    if (user.organizationId !== orgId) {
      return NextResponse.json(
        { error: "User does not belong to your organization" },
        { status: 400 }
      );
    }

    console.log(
      `Setting user ${userId} as active AI agent and updating license type to AI_AGENT`
    );

    // First, deactivate all agents for this organization
    await aiAgentSettings.deactivateAll();

    // Upsert agent settings for this user
    await aiAgentSettings.upsert(userId, { isActive: true });

    // Update the user's license type to AI_AGENT
    await users.update(userId, { licenseType: "AI_AGENT" });

    return NextResponse.json({
      userId,
      success: true,
      message: "User set as AI agent and license updated to AI_AGENT",
    });
  } catch (error) {
    console.error("Error setting AI agent:", error);
    return NextResponse.json(
      { error: "Failed to set AI agent user" },
      { status: 500 }
    );
  }
}
