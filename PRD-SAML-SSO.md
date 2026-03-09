# PRD: SAML SSO Authentication with Multi-Organization Support

**Product**: EchoOps
**Feature**: SAML Single Sign-On (SSO) with Multi-Organization Tenancy
**Status**: Draft
**Date**: 2026-03-09

---

## 1. Problem Statement

EchoOps currently only supports GitHub OAuth for authentication. Enterprise customers require SAML-based Single Sign-On (SSO) to integrate with their corporate identity providers (Okta, Azure AD, OneLogin, etc.). Each organization needs its own isolated SAML configuration so employees authenticate through their company's identity provider and are automatically placed into the correct organization.

### Current State

- Authentication is limited to GitHub OAuth
- Organizations exist but have no identity federation
- No mechanism for enterprise customers to enforce SSO policies
- Users must be manually associated with organizations

### Desired State

- Organizations can configure their own SAML identity provider
- Users sign in via their corporate IdP by entering their work email
- Users are auto-provisioned into the correct organization on first login
- GitHub OAuth continues to work alongside SAML for non-SSO users

---

## 2. Goals & Success Metrics

### Goals

| Goal | Description |
|------|-------------|
| Enterprise SSO | Enable organizations to authenticate users via their corporate SAML 2.0 identity provider |
| Multi-org isolation | Each organization has its own tenant with isolated auth configuration |
| Self-service setup | Org admins can configure SAML from the settings page without EchoOps support intervention |
| Zero-friction onboarding | SAML users are auto-provisioned into their organization on first sign-in |
| Backward compatibility | Existing GitHub OAuth flow continues to work unchanged |

### Success Metrics

| Metric | Target |
|--------|--------|
| SAML configuration completion rate | > 80% of org admins who start setup complete it |
| SSO sign-in success rate | > 99% of SAML sign-in attempts succeed |
| Time to configure SSO | < 15 minutes for an org admin with IdP access |
| Zero regression | Existing GitHub OAuth users are unaffected |

---

## 3. User Personas

### 3.1 Organization Admin

- Manages their company's EchoOps organization
- Has admin access to their corporate IdP (Okta, Azure AD, etc.)
- Wants to enable SSO so employees authenticate through the company IdP
- Needs SP metadata (Entity ID, ACS URL) to configure on the IdP side

### 3.2 Enterprise Employee (SAML User)

- Works at a company that has configured SAML SSO
- Signs in using their corporate email (e.g., `jane@acme.com`)
- Expects to be redirected to their company's login page
- Should land in the correct organization without manual setup

### 3.3 Individual User (GitHub OAuth)

- Uses EchoOps without an enterprise SSO setup
- Continues to sign in with GitHub
- Experience is unchanged

---

## 4. User Stories

### Authentication

| ID | Story | Priority |
|----|-------|----------|
| US-1 | As an enterprise employee, I can enter my work email on the sign-in page and be redirected to my company's SSO login | P0 |
| US-2 | As a SAML user signing in for the first time, I am automatically provisioned and placed into my organization | P0 |
| US-3 | As a GitHub OAuth user, I can still sign in with GitHub without any changes to my experience | P0 |
| US-4 | As a user whose email domain has no SAML configured, I see the standard GitHub sign-in option | P0 |
| US-5 | As a SAML user, my session works the same as any other user (cookie-based, auto-refresh) | P0 |

### Administration

| ID | Story | Priority |
|----|-------|----------|
| US-6 | As an org admin, I can configure SAML SSO from the settings page by entering my IdP's Entity ID, SSO URL, and certificate | P0 |
| US-7 | As an org admin, after saving SAML config, I can see the SP metadata (Entity ID, ACS URL) that I need to enter in my IdP | P0 |
| US-8 | As an org admin, I can test the SSO connection before rolling it out to my team | P1 |
| US-9 | As an org admin, I can disable SSO if needed, reverting my org to standard auth | P1 |
| US-10 | As an org admin, I can see the SSO status (enabled/disabled/error) on the settings page | P1 |

---

## 5. Functional Requirements

### 5.1 Email Domain Detection (Sign-In Flow)

**FR-1**: The sign-in page must include an email input field with a "Continue" button.

**FR-2**: When the user submits their email, the app must extract the domain (e.g., `acme.com` from `user@acme.com`) and look it up against configured organizations.

**FR-3**: If a matching SAML-enabled organization is found:
- Display the organization name for confirmation (e.g., "Sign in to Acme Corp via SSO")
- Set the Firebase auth tenant to the organization's tenant ID
- Initiate SAML sign-in via `signInWithPopup` with the org's `SAMLAuthProvider`

**FR-4**: If no matching organization is found:
- Display the standard GitHub OAuth sign-in button
- Optionally display a message: "No SSO configured for this domain"

**FR-5**: A "Sign in with GitHub" fallback link must always be visible on the sign-in page.

### 5.2 Firebase Multi-Tenancy

**FR-6**: Each organization that enables SAML SSO gets a dedicated Firebase Identity Platform tenant.

**FR-7**: The tenant is created programmatically via the Firebase Admin SDK when the org admin saves their SAML configuration.

**FR-8**: SAML provider configuration is scoped to the organization's tenant, ensuring isolation between organizations.

**FR-9**: Firebase ID tokens issued to tenant-scoped users include the `firebase.tenant` claim, which the server uses to identify the user's tenant/organization.

### 5.3 SAML Configuration (Admin Settings)

**FR-10**: The settings page must include an "SSO / SAML" section with the following fields:
- Email domain (e.g., `acme.com`)
- IdP Entity ID
- SSO URL (IdP's single sign-on endpoint)
- X.509 Certificate (IdP's public signing certificate)

**FR-11**: On save, the API must:
1. Create a Firebase tenant (if one doesn't exist for the org)
2. Create/update the SAML provider config within that tenant
3. Store the tenant ID, provider ID, domain, and SSO-enabled flag on the organization document
4. Create a domain mapping document for fast email-domain lookups

**FR-12**: After successful configuration, display the Service Provider (SP) metadata:
- SP Entity ID: `echoops-{orgId}`
- ACS URL: `https://{firebase-auth-domain}/__/auth/handler`

**FR-13**: The admin must be able to delete/disable the SAML configuration, which removes the provider from the tenant and clears the domain mapping.

### 5.4 User Auto-Provisioning

**FR-14**: When a SAML-authenticated user signs in for the first time (no Firestore user doc exists):
- The `ensure-user` endpoint must detect the tenant ID from the session
- Look up which organization owns that tenant
- Automatically set the user's `organizationId` to that organization
- Create the user document with profile info from the SAML assertion (name, email)

**FR-15**: Existing users who later sign in via SAML must have their `organizationId` updated if it's not already set.

### 5.5 Session Management

**FR-16**: Server-side `getSession()` must extract the `firebase.tenant` claim from verified ID tokens and include it in the `AppSession`.

**FR-17**: Sign-out must clear the Firebase tenant ID on the client auth instance to prevent stale tenant state.

**FR-18**: Token refresh (existing 50-minute interval) must continue to work for tenant-scoped tokens without modification.

---

## 6. Non-Functional Requirements

| Requirement | Specification |
|-------------|--------------|
| **Security** | SAML certificates must be validated server-side; domain mapping lookups must not leak organization details beyond name |
| **Performance** | Domain lookup must respond in < 200ms (single Firestore read by document ID) |
| **Availability** | SAML auth depends on the external IdP; the app must handle IdP timeouts gracefully with user-friendly error messages |
| **Scalability** | Domain mapping collection scales to thousands of organizations (one doc per domain, O(1) lookup) |
| **Compatibility** | Must work with major SAML 2.0 IdPs: Okta, Azure AD, OneLogin, Google Workspace, ADFS |
| **Data isolation** | Each org's tenant is fully isolated; users in one tenant cannot access another tenant's resources |

---

## 7. Technical Architecture

### 7.1 System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Sign-In Page                          │
│  ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │  Email Input      │    │  GitHub OAuth (fallback)      │   │
│  │  user@acme.com    │    │  [Sign in with GitHub]        │   │
│  │  [Continue]       │    │                                │   │
│  └────────┬─────────┘    └──────────────────────────────┘   │
└───────────┼──────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────┐
│ POST /api/auth/       │
│   lookup-domain       │
│ { domain: "acme.com" }│
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐     ┌───────────────────────┐
│  Firestore:           │     │  If not found:         │
│  domainMappings/      │────▶│  Show GitHub OAuth     │
│  "acme.com"           │     └───────────────────────┘
└───────────┬───────────┘
            │ found
            ▼
┌───────────────────────────────────────────┐
│  Client:                                   │
│  auth.tenantId = tenantId                  │
│  signInWithPopup(auth, SAMLAuthProvider)   │
└───────────────────┬───────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────┐
│  Corporate IdP (Okta / Azure AD / etc.)   │
│  User authenticates with corporate creds   │
└───────────────────┬───────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────┐
│  Firebase Auth callback                    │
│  → ID token issued with tenant claim       │
│  → onAuthStateChanged fires                │
│  → __session cookie set                    │
│  → POST /api/auth/ensure-user              │
│    (auto-provisions user into org)         │
└───────────────────────────────────────────┘
```

### 7.2 Data Model

**Extended `OrganizationDoc`** (Firestore: `organizations/{orgId}`):

| Field | Type | Description |
|-------|------|-------------|
| id | string | Document ID |
| name | string | Organization display name |
| domain | string \| null | Email domain for SSO (e.g., "acme.com") |
| firebaseTenantId | string \| null | Firebase Identity Platform tenant ID |
| samlProviderId | string \| null | SAML provider ID (e.g., "saml.acme") |
| ssoEnabled | boolean | Whether SAML SSO is active |
| createdAt | Date | - |
| updatedAt | Date | - |

**New `DomainMappingDoc`** (Firestore: `domainMappings/{domain}`):

| Field | Type | Description |
|-------|------|-------------|
| id | string | Document ID = email domain |
| organizationId | string | Owning organization ID |
| firebaseTenantId | string | Firebase tenant ID |
| samlProviderId | string | SAML provider ID |

### 7.3 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/lookup-domain` | None (public) | Lookup domain → tenant/provider mapping |
| GET | `/api/settings/saml` | Required | Get current org's SAML configuration |
| POST | `/api/settings/saml` | Required | Create/update SAML config for org |
| DELETE | `/api/settings/saml` | Required | Remove SAML config for org |

### 7.4 Files Changed

| File | Change Type |
|------|-------------|
| `src/lib/firebase/types.ts` | Modify — add `DomainMappingDoc`, extend `OrganizationDoc`, extend `AppSession` |
| `src/lib/firebase/client.ts` | Modify — add `SAMLAuthProvider`, tenant helpers |
| `src/lib/firebase/db.ts` | Modify — add `domainMappings` CRUD operations |
| `src/lib/firebase/auth.ts` | Modify — extract tenant from token, add to session |
| `src/app/auth/signin/page.tsx` | Modify — add email input + SAML flow |
| `src/app/components/FirebaseAuthProvider.tsx` | Modify — clear tenant on sign-out |
| `src/app/api/auth/ensure-user/route.ts` | Modify — auto-assign org for SAML users |
| `src/app/api/auth/lookup-domain/route.ts` | **New** — public domain lookup endpoint |
| `src/app/api/settings/saml/route.ts` | **New** — SAML admin configuration API |
| `src/app/settings/page.tsx` | Modify — add SSO/SAML settings section |

---

## 8. UI/UX Specifications

### 8.1 Sign-In Page (Updated)

```
┌──────────────────────────────────────┐
│          [EchoOps Logo]              │
│                                      │
│      Sign In to EchoOps              │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Enter your work email         │  │
│  │  user@company.com              │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │         Continue →              │  │
│  └────────────────────────────────┘  │
│                                      │
│  ── or ──────────────────────────── │
│                                      │
│  ┌────────────────────────────────┐  │
│  │   🔑  Sign in with GitHub      │  │
│  └────────────────────────────────┘  │
│                                      │
│  Don't have an account? Sign up      │
└──────────────────────────────────────┘
```

**After domain lookup succeeds (SAML org found):**

```
┌──────────────────────────────────────┐
│          [EchoOps Logo]              │
│                                      │
│   Sign in to Acme Corp via SSO       │
│                                      │
│  ┌────────────────────────────────┐  │
│  │   🔒  Continue with SSO        │  │
│  └────────────────────────────────┘  │
│                                      │
│  ← Use a different email             │
└──────────────────────────────────────┘
```

### 8.2 Settings Page — SSO/SAML Section

```
┌──────────────────────────────────────────────┐
│  SSO / SAML Configuration                     │
│  ● Enabled  (or ○ Not configured)            │
│                                               │
│  Email Domain                                 │
│  ┌──────────────────────────────────────┐    │
│  │  acme.com                             │    │
│  └──────────────────────────────────────┘    │
│                                               │
│  IdP Entity ID                                │
│  ┌──────────────────────────────────────┐    │
│  │  https://idp.acme.com/entity         │    │
│  └──────────────────────────────────────┘    │
│                                               │
│  SSO URL                                      │
│  ┌──────────────────────────────────────┐    │
│  │  https://idp.acme.com/sso/saml       │    │
│  └──────────────────────────────────────┘    │
│                                               │
│  X.509 Certificate                            │
│  ┌──────────────────────────────────────┐    │
│  │  -----BEGIN CERTIFICATE-----         │    │
│  │  MIIDpTCCAo2gAwIBAgIGAX...           │    │
│  │  -----END CERTIFICATE-----           │    │
│  └──────────────────────────────────────┘    │
│                                               │
│  [Save Configuration]   [Test SSO]            │
│                                               │
│  ─── Service Provider Metadata ───────────── │
│  SP Entity ID:  echoops-abc123               │
│  ACS URL:       https://echoops-65d4b.       │
│                 firebaseapp.com/__/auth/      │
│                 handler                        │
│  (Copy these into your IdP configuration)     │
│                                               │
│  [Disable SSO]                                │
└──────────────────────────────────────────────┘
```

---

## 9. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Domain spoofing | Domain mapping is created server-side by authenticated org admins only; cannot be set by unauthenticated users |
| Certificate validation | X.509 certificates are validated by Firebase Identity Platform during SAML assertion verification |
| Tenant isolation | Firebase multi-tenancy ensures users in one tenant cannot access another tenant's auth state |
| Domain lookup information leakage | The `/api/auth/lookup-domain` endpoint only returns `found: true/false`, tenant ID, and provider ID — no sensitive org data |
| SAML replay attacks | Firebase handles SAML assertion validation including timestamp and replay prevention |
| Org admin authorization | Only authenticated users with an `organizationId` can access SAML settings endpoints |

---

## 10. Dependencies & Prerequisites

| Dependency | Description | Owner |
|------------|-------------|-------|
| Firebase Identity Platform upgrade | Must upgrade from Firebase Auth to Identity Platform in Firebase Console (free tier available) | DevOps / Admin |
| IdP configuration | Customer's IT team must configure EchoOps as a Service Provider in their IdP | Customer |
| No new npm packages | `SAMLAuthProvider` and `tenantManager()` are included in existing `firebase` and `firebase-admin` SDKs | — |

---

## 11. Rollout Plan

### Phase 1: Core SAML Infrastructure (MVP)

- Data model changes (types, db layer)
- Firebase client SAML helpers
- Domain lookup API
- Server-side tenant-aware session handling
- Updated sign-in page with email domain detection
- SAML sign-in flow (popup-based)
- Auto-provisioning of SAML users into organizations

### Phase 2: Admin Configuration UI

- SAML settings API (GET/POST/DELETE)
- SSO/SAML section on settings page
- SP metadata display
- Enable/disable SSO toggle

### Phase 3: Polish & Hardening

- SSO test button for admins
- Error handling for IdP unavailability
- Support for multiple domains per organization
- Audit logging for SSO events
- Documentation / setup guide for org admins

---

## 12. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Should we support multiple email domains per organization? (e.g., `acme.com` + `acme.co.uk`) | Deferred to Phase 3 |
| 2 | Should SAML be enforceable (disable GitHub OAuth for SSO orgs)? | Decided: Keep both for now |
| 3 | Do we need SCIM provisioning for user lifecycle management (create/disable/delete)? | Out of scope |
| 4 | Should we support OIDC in addition to SAML? | Future consideration |
| 5 | Do we need admin role checks (not all org members should configure SSO)? | Future consideration — currently any org member can access settings |
