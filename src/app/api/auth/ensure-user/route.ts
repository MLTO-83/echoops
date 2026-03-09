import { NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users, organizations } from "@/lib/firebase/db";

/**
 * POST /api/auth/ensure-user
 * Called by FirebaseAuthProvider after first successful auth.
 * Creates a Firestore user doc if one doesn't exist for this Firebase Auth UID.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, email, name, image, tenantId } = session.user;

    // Resolve organization for SAML users via tenantId
    let samlOrgId: string | null = null;
    if (tenantId) {
      const org = await organizations.findByTenantId(tenantId);
      if (org) {
        samlOrgId = org.id;
      }
    }

    // Check if user doc already exists
    const existing = await users.findById(id);
    if (existing) {
      // If SAML user has no org yet, assign them
      if (samlOrgId && !existing.organizationId) {
        const updated = await users.update(id, { organizationId: samlOrgId });
        return NextResponse.json({ user: updated });
      }
      return NextResponse.json({ user: existing });
    }

    // Create new user doc with Firebase Auth UID as the doc ID
    const newUser = await users.create(
      {
        email: email || null,
        name: name || null,
        image: image || null,
        organizationId: samlOrgId,
        theme: "dark",
        maxHoursPerWeek: 40,
        licenseType: "FREE",
      },
      id // Use Firebase UID as doc ID
    );

    return NextResponse.json({ user: newUser });
  } catch (error) {
    console.error("Error in ensure-user:", error);
    return NextResponse.json(
      { error: "Failed to ensure user" },
      { status: 500 }
    );
  }
}
