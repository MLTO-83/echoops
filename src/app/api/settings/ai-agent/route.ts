import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/settings/ai-agent - fetch org users and active agent
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );

  const orgId = session.user.organizationId; // organizationId is now part of the user object
  // fetch org users
  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, email: true },
  });
  // fetch active agent setting
  const active = await prisma.aIAgentSettings.findFirst({
    where: { isActive: true, user: { organizationId: orgId } },
    select: { userId: true },
  });

  return NextResponse.json({
    users,
    activeAgentUserId: active?.userId || null,
  });
}

// POST /api/settings/ai-agent - set the active agent user
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true },
    });

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
    await prisma.aIAgentSettings.updateMany({
      where: {
        user: { organizationId: orgId },
      },
      data: { isActive: false },
    });

    // Check if this user already has a settings record
    const existingSettings = await prisma.aIAgentSettings.findFirst({
      where: { userId },
    });

    if (existingSettings) {
      // Update existing settings
      await prisma.aIAgentSettings.update({
        where: { id: existingSettings.id },
        data: { isActive: true },
      });
    } else {
      // Create new settings
      await prisma.aIAgentSettings.create({
        data: { userId, isActive: true },
      });
    }

    // Update the user's license type to AI_AGENT
    await prisma.user.update({
      where: { id: userId },
      data: { licenseType: "AI_AGENT" },
    });

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
