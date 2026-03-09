import { NextRequest, NextResponse } from "next/server";
import { domainMappings } from "@/lib/firebase/db";
import { organizations } from "@/lib/firebase/db";

/**
 * POST /api/auth/lookup-domain
 * Unauthenticated — called before sign-in to check if a domain has SSO configured.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const atIndex = email.indexOf("@");
    if (atIndex === -1) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const domain = email.substring(atIndex + 1).toLowerCase();
    if (!domain || domain.includes(" ")) {
      return NextResponse.json({ error: "Invalid email domain" }, { status: 400 });
    }

    const mapping = await domainMappings.findByDomain(domain);
    if (!mapping) {
      return NextResponse.json({ ssoEnabled: false });
    }

    // Fetch org name for display
    const org = await organizations.findById(mapping.organizationId);

    return NextResponse.json({
      ssoEnabled: true,
      tenantId: mapping.firebaseTenantId,
      providerId: mapping.samlProviderId,
      organizationName: org?.name || "Your Organization",
    });
  } catch (error) {
    console.error("Error in lookup-domain:", error);
    return NextResponse.json(
      { error: "Failed to look up domain" },
      { status: 500 }
    );
  }
}
