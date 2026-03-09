# SAML Firebase Authentication with Multi-Organization Support

## Architecture Overview

Use **Firebase Identity Platform multi-tenancy** where each organization gets its own Firebase **tenant** with an isolated SAML provider configuration. Users enter their email on the sign-in page, the app detects the domain, looks up the matching organization/tenant, and redirects to the appropriate SAML IdP. GitHub OAuth remains available alongside SAML.

### Authentication Flow

```
User enters email → App looks up domain in Firestore →
  If SAML org found:
    Set auth.tenantId → signInWithPopup(auth, SAMLAuthProvider) → IdP login → callback
  If no SAML org:
    Show GitHub OAuth button (existing flow)
```

---

## Step 1: Data Model Changes

### File: `src/lib/firebase/types.ts`

Add new `SamlConfigDoc` interface and extend `OrganizationDoc`:

```typescript
export interface OrganizationDoc {
  id: string;
  name: string;
  // NEW FIELDS:
  domain: string | null;           // e.g., "acme.com" — for email domain lookup
  firebaseTenantId: string | null; // Firebase Identity Platform tenant ID
  samlProviderId: string | null;   // e.g., "saml.okta-acme"
  ssoEnabled: boolean;             // Whether SAML SSO is active for this org
  createdAt: Date;
  updatedAt: Date;
}
```

Add new Firestore collection for domain → org mapping (for fast lookups):

```typescript
export interface DomainMappingDoc {
  id: string;            // doc ID = domain (e.g., "acme.com")
  organizationId: string;
  firebaseTenantId: string;
  samlProviderId: string;
}
```

### File: `src/lib/firebase/db.ts`

Add CRUD operations for:
- `domainMappings` collection (lookup by domain)
- Update `organizations` to include SAML fields
- Helper: `findOrgByDomain(domain: string)` for the sign-in flow

---

## Step 2: Firebase Client Changes

### File: `src/lib/firebase/client.ts`

Add `SAMLAuthProvider` import and a helper to create tenant-scoped SAML auth:

```typescript
import { SAMLAuthProvider } from "firebase/auth";

export { SAMLAuthProvider };

// Helper to set tenant on the auth instance before SAML sign-in
export function setTenantId(tenantId: string) {
  auth.tenantId = tenantId;
}

export function clearTenantId() {
  auth.tenantId = null;
}
```

---

## Step 3: Sign-In Page — Email Domain Detection + SAML

### File: `src/app/auth/signin/page.tsx`

Redesign the sign-in page to support both flows:

1. **Email input field** — user types their email address
2. **"Continue" button** — calls new API `/api/auth/lookup-domain` with the email domain
3. If SAML org found → set `auth.tenantId` and call `signInWithPopup(auth, new SAMLAuthProvider(providerId))`
4. If no SAML org → show the existing GitHub OAuth button
5. Keep a "Sign in with GitHub" link visible at all times as a fallback

### New API: `src/app/api/auth/lookup-domain/route.ts`

```typescript
// POST { domain: "acme.com" }
// Returns: { found: true, tenantId: "...", providerId: "saml.xxx", orgName: "Acme" }
// Or:      { found: false }
```

Looks up the `domainMappings` collection in Firestore. No authentication required (pre-login).

---

## Step 4: FirebaseAuthProvider Updates

### File: `src/app/components/FirebaseAuthProvider.tsx`

- The `onAuthStateChanged` listener already works with tenant-scoped tokens
- Firebase ID tokens from tenant-scoped auth include `firebase.tenant` claim
- `verifyIdToken()` on the server side automatically validates tenant tokens
- No major changes needed — the existing flow handles tenant-scoped users transparently
- Minor: After sign-out, call `clearTenantId()` to reset tenant state

---

## Step 5: Server-Side Session Handling

### File: `src/lib/firebase/auth.ts`

Update `getSession()` to extract tenant info from the decoded token:

```typescript
const decoded = await adminAuth.verifyIdToken(token);
// decoded.firebase.tenant contains the tenant ID if user signed in via tenant
```

Add tenant ID to `AppSession` for downstream use:

```typescript
export interface AppSession {
  user: {
    // ...existing fields
    tenantId?: string | null;  // Firebase tenant ID from SAML auth
  };
}
```

---

## Step 6: Admin API for SAML Configuration

### New File: `src/app/api/settings/saml/route.ts`

**GET** — Fetch current org's SAML configuration
**POST** — Create/update SAML provider for the org:

1. Validate user is authenticated and has an organization
2. Accept: `entityId`, `ssoUrl`, `certificate`, `domain` from the request body
3. Use Firebase Admin SDK to:
   a. Create a tenant (if org doesn't have one yet): `adminAuth.tenantManager().createTenant()`
   b. Create SAML provider in the tenant: `tenantAuth.createProviderConfig()`
   c. Store `firebaseTenantId`, `samlProviderId`, `domain`, `ssoEnabled` on the `OrganizationDoc`
   d. Create/update `DomainMappingDoc`
4. Return success with the SP (Service Provider) metadata (Entity ID, ACS URL) for the org admin to configure in their IdP

**DELETE** — Remove SAML configuration:
1. Delete SAML provider from tenant
2. Clear SAML fields on `OrganizationDoc`
3. Remove `DomainMappingDoc`

### Firebase Admin SDK Tenant Management:

```typescript
import { getAuth } from "firebase-admin/auth";

const tenantManager = adminAuth.tenantManager();

// Create tenant
const tenant = await tenantManager.createTenant({
  displayName: orgName,
  emailSignInConfig: { enabled: false },
});

// Create SAML provider within tenant
const tenantAuth = tenantManager.authForTenant(tenant.tenantId);
await tenantAuth.createProviderConfig({
  providerId: `saml.${orgId}`,
  displayName: `${orgName} SSO`,
  enabled: true,
  idpEntityId: entityId,
  ssoURL: ssoUrl,
  x509Certificates: [certificate],
  rpEntityId: `echoops-${orgId}`,
  callbackURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}/__/auth/handler`,
});
```

---

## Step 7: SAML Settings UI

### File: `src/app/settings/page.tsx`

Add a new **"SSO / SAML"** section to the existing settings page (alongside ADO, AI Provider sections):

- **Domain** field — the email domain for this org (e.g., `acme.com`)
- **IdP Entity ID** field
- **SSO URL** field
- **X.509 Certificate** textarea
- **Save** button → calls `POST /api/settings/saml`
- **Status indicator** — shows if SSO is enabled/configured
- **SP Metadata display** — after configuration, show the SP Entity ID and ACS URL that the org admin needs to enter in their IdP (Okta, Azure AD, etc.)
- **Test SSO** button — opens a popup to test the SAML flow
- **Disable SSO** button → calls `DELETE /api/settings/saml`

---

## Step 8: Ensure-User Updates

### File: `src/app/api/auth/ensure-user/route.ts`

When a SAML-authenticated user signs in for the first time:
- Extract tenant ID from the session
- Look up which organization this tenant belongs to
- Auto-assign the user's `organizationId` based on the tenant mapping
- This way SAML users are automatically placed in the correct organization

---

## Files to Create/Modify Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/firebase/types.ts` | Modify | Add `DomainMappingDoc`, extend `OrganizationDoc` with SAML fields, add `tenantId` to `AppSession` |
| `src/lib/firebase/client.ts` | Modify | Add `SAMLAuthProvider` export, `setTenantId`/`clearTenantId` helpers |
| `src/lib/firebase/db.ts` | Modify | Add `domainMappings` CRUD, update org operations for new fields |
| `src/lib/firebase/auth.ts` | Modify | Extract tenant from decoded token, add to session |
| `src/app/auth/signin/page.tsx` | Modify | Add email input, domain lookup, SAML sign-in flow |
| `src/app/components/FirebaseAuthProvider.tsx` | Modify | Clear tenant on sign-out |
| `src/app/api/auth/ensure-user/route.ts` | Modify | Auto-assign org for SAML users |
| `src/app/api/auth/lookup-domain/route.ts` | **Create** | Domain → tenant/provider lookup (public endpoint) |
| `src/app/api/settings/saml/route.ts` | **Create** | SAML config CRUD with Firebase Admin tenant management |
| `src/app/settings/page.tsx` | Modify | Add SSO/SAML configuration section |

## Prerequisites

1. **Upgrade to Firebase Identity Platform** — Required for multi-tenancy and SAML. This is done in the Firebase Console under Authentication → Settings → "Upgrade to Identity Platform"
2. No new npm dependencies needed — `SAMLAuthProvider` and `tenantManager()` are part of the existing `firebase` and `firebase-admin` packages
