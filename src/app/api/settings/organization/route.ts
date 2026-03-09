import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { organizations } from "@/lib/firebase/db";

// GET /api/settings/organization - fetch the current user's organization details
export async function GET(req: NextRequest) {
  const session = await getSession();
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
    const organization = await organizations.findById(orgId);

    return NextResponse.json(organization || { name: "" });
  } catch (error) {
    console.error("Failed to fetch organization details:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization details" },
      { status: 500 }
    );
  }
}
