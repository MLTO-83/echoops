import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/settings/organization - fetch the current user's organization details
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // Handle case where user has no organization
  if (!session.user.organizationId) {
    return NextResponse.json({ name: "" });
  }

  const orgId = session.user.organizationId as string;

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    return NextResponse.json(organization || { name: "" });
  } catch (error) {
    console.error("Failed to fetch organization details:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization details" },
      { status: 500 }
    );
  }
}
