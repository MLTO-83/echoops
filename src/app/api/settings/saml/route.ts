import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { organizations, domainMappings } from "@/lib/firebase/db";
import { adminAuth } from "@/lib/firebase/admin";

/**
 * GET /api/settings/saml
 * Returns the current SAML/SSO configuration for the user's organization.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized or no organization" }, { status: 401 });
    }

    const org = await organizations.findById(session.user.organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || "";

    return NextResponse.json({
      domain: org.domain,
      ssoEnabled: org.ssoEnabled,
      samlProviderId: org.samlProviderId,
      firebaseTenantId: org.firebaseTenantId,
      // SP metadata for IdP configuration
      ...(org.ssoEnabled && org.firebaseTenantId && org.samlProviderId
        ? {
            spMetadata: {
              acsUrl: `https://${projectId}.firebaseapp.com/__/auth/handler`,
              entityId: `https://${projectId}.firebaseapp.com`,
            },
          }
        : {}),
    });
  } catch (error) {
    console.error("Error in GET /api/settings/saml:", error);
    return NextResponse.json({ error: "Failed to fetch SAML config" }, { status: 500 });
  }
}

/**
 * POST /api/settings/saml
 * Configure SAML SSO: creates Firebase tenant, SAML provider, and domain mapping.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized or no organization" }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const org = await organizations.findById(orgId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { domain, idpEntityId, ssoUrl, x509Certificate } = await req.json();

    if (!domain || !idpEntityId || !ssoUrl || !x509Certificate) {
      return NextResponse.json(
        { error: "All fields are required: domain, idpEntityId, ssoUrl, x509Certificate" },
        { status: 400 }
      );
    }

    // Validate domain format
    const domainLower = domain.toLowerCase().trim();
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(domainLower)) {
      return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
    }

    // Check domain isn't already claimed by another org
    const existingMapping = await domainMappings.findByDomain(domainLower);
    if (existingMapping && existingMapping.organizationId !== orgId) {
      return NextResponse.json(
        { error: "This domain is already configured by another organization" },
        { status: 409 }
      );
    }

    const tenantManager = adminAuth.tenantManager();
    const providerId = `saml.${orgId}`;
    const projectId = process.env.FIREBASE_PROJECT_ID || "";

    let tenantId = org.firebaseTenantId;

    // 1. Create or reuse Firebase tenant
    if (!tenantId) {
      const tenant = await tenantManager.createTenant({
        displayName: `${org.name} SSO`,
        emailSignInConfig: { enabled: false },
      });
      tenantId = tenant.tenantId;
    }

    // 2. Create SAML provider config on the tenant
    const tenantAuth = tenantManager.authForTenant(tenantId);
    try {
      // Try to update existing provider first
      await tenantAuth.updateProviderConfig(providerId, {
        idpEntityId,
        ssoURL: ssoUrl,
        x509Certificates: [x509Certificate],
        rpEntityId: `https://${projectId}.firebaseapp.com`,
        callbackURL: `https://${projectId}.firebaseapp.com/__/auth/handler`,
        enabled: true,
        displayName: `${org.name} SAML`,
      });
    } catch {
      // Provider doesn't exist, create it
      await tenantAuth.createProviderConfig({
        providerId,
        idpEntityId,
        ssoURL: ssoUrl,
        x509Certificates: [x509Certificate],
        rpEntityId: `https://${projectId}.firebaseapp.com`,
        callbackURL: `https://${projectId}.firebaseapp.com/__/auth/handler`,
        enabled: true,
        displayName: `${org.name} SAML`,
      });
    }

    // 3. Update organization doc
    await organizations.update(orgId, {
      firebaseTenantId: tenantId,
      samlProviderId: providerId,
      domain: domainLower,
      ssoEnabled: true,
    } as Partial<typeof org>);

    // 4. Upsert domain mapping
    await domainMappings.upsert(domainLower, {
      organizationId: orgId,
      firebaseTenantId: tenantId,
      samlProviderId: providerId,
    });

    return NextResponse.json({
      success: true,
      tenantId,
      providerId,
      spMetadata: {
        acsUrl: `https://${projectId}.firebaseapp.com/__/auth/handler`,
        entityId: `https://${projectId}.firebaseapp.com`,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/settings/saml:", error);
    return NextResponse.json(
      { error: "Failed to configure SAML SSO" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/saml
 * Remove SAML SSO configuration.
 */
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized or no organization" }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const org = await organizations.findById(orgId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Remove SAML provider from tenant if it exists
    if (org.firebaseTenantId && org.samlProviderId) {
      try {
        const tenantManager = adminAuth.tenantManager();
        const tenantAuth = tenantManager.authForTenant(org.firebaseTenantId);
        await tenantAuth.deleteProviderConfig(org.samlProviderId);
      } catch (error) {
        console.error("Error deleting SAML provider (may not exist):", error);
      }
    }

    // Clear org SSO fields
    await organizations.update(orgId, {
      firebaseTenantId: null,
      samlProviderId: null,
      domain: null,
      ssoEnabled: false,
    } as Partial<typeof org>);

    // Delete domain mapping
    if (org.domain) {
      await domainMappings.deleteByDomain(org.domain);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/settings/saml:", error);
    return NextResponse.json(
      { error: "Failed to delete SAML SSO configuration" },
      { status: 500 }
    );
  }
}
