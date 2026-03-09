# Migration Plan: Prisma/PostgreSQL → Firebase/Firestore

## Status: IN PROGRESS

---

## Priority 1: Migrate `process-ai-jobs.js` (Production-Critical Script)

### Status: DONE

### What was done

- [x] Created `scripts/firebase-admin-init.js` — shared Firebase Admin SDK initializer for standalone scripts (loads `.env.local`, initializes Firestore)
- [x] Created `scripts/process-ai-jobs-firebase.js` — full rewrite of `process-ai-jobs.js` using Firestore instead of Prisma
- [x] Syntax validated both files

### Key changes in the rewrite

| Prisma (old) | Firestore (new) |
|---|---|
| `new PrismaClient()` | `require("./firebase-admin-init.js").adminDb` |
| `prisma.project.findUnique({ include: { adoConnection: { include: ... } } })` | Manual chain: `getProjectById()` → `getAdoConnectionByOrgId()` → `getAiProviderSettingsByOrg()` via `resolveProjectChain()` |
| `prisma.aDOConnection.findFirst()` | `adoConnectionsCol.limit(1).get()` |
| `prisma.aIAgentJob.update()` | `aiAgentJobsCol.doc(id).update()` |
| `prisma.aIAgentJob.findMany({ where: { status: "PENDING" } })` | `aiAgentJobsCol.where("status", "==", "PENDING").orderBy("createdAt").get()` |
| `prisma.aIAgentJob.findMany({ where: { repositoryName: { contains: " " } } })` | Query + in-memory filter (Firestore has no substring search) |

### What was preserved (no changes needed)

- All 6-step ADO workflow (AI prompt → get repo → create branch → push code → create PR)
- All 3 AI providers (OpenAI, Google Gemini, Anthropic)
- `ado-repository-matcher.js` and `repository-utils.js` (unchanged, no DB dependency)
- Logging format and 5s poll loop
- Error handling per step

### Deployment steps

1. Test: `node scripts/process-ai-jobs-firebase.js` (ensure it connects to Firestore and polls)
2. Once validated, rename:
   - `process-ai-jobs.js` → `process-ai-jobs.prisma-backup.js`
   - `process-ai-jobs-firebase.js` → `process-ai-jobs.js`
3. Also rename/remove `process-ai-jobs.ts` (Prisma-based TypeScript version)

---

## Priority 2: Migrate or Remove Remaining Scripts

### Status: DONE

### What was done

#### Scripts MIGRATED to Firebase

- [x] Created `scripts/reset-failed-jobs-firebase.js` — queries `aiAgentJobs` where status=FAILED, batch-updates all to PENDING
- [x] Created `scripts/reset-specific-job-firebase.js` — gets single doc by ID from `aiAgentJobs`, updates to PENDING (accepts jobId as CLI arg)
- [x] Created `scripts/sync-project-members-firebase.js` — full rewrite using Firestore subcollections (`projects/{id}/members/{userId}/weeklyHours/{year_week}`), batch writes for member+weeklyHours creation
- [x] Created `scripts/add-user-to-project-firebase.js` — uses `users` collection + `members` subcollection, now accepts projectId and email as CLI args (instead of hardcoded values)
- [x] Deleted `seeds/seed-states.js` — already has Firebase API version at `/api/seed/states`

#### Key migration patterns used

| Prisma (old) | Firestore (new) |
|---|---|
| `prisma.aIAgentJob.findMany({ where: { status: "FAILED" } })` | `aiAgentJobsCol.where("status", "==", "FAILED").get()` |
| `prisma.aIAgentJob.findUnique({ where: { id } })` | `aiAgentJobsCol.doc(id).get()` |
| `prisma.aIAgentJob.update()` | `batch.update(doc.ref, { ... })` or `aiAgentJobsCol.doc(id).update()` |
| `prisma.user.findFirst({ where: { OR: [...] } })` | Two sequential queries: `usersCol.where("email",...).limit(1)` then `usersCol.where("adoUserId",...).limit(1)` |
| `prisma.user.create()` | `usersCol.add(docData)` |
| `prisma.projectMember.findUnique({ where: { userId_projectId } })` | `membersCol(projectId).doc(userId).get()` (subcollection) |
| `prisma.projectMember.create()` + `prisma.projectMemberWeeklyHours.create()` | `adminDb.batch()` with `batch.set()` for both member and weeklyHours subcollection docs |
| `prisma.projectMember.count()` | `membersCol(projectId).count().get()` |
| Raw SQL `INSERT INTO "ProjectMember"` via `pg.Pool` | Replaced with Firestore `batch.set()` — no more raw SQL needed |

#### Scripts DELETED (35 dead Prisma test/debug files)

- 18 test scripts: `test-weekly-hours-schema.js`, `test-end-to-end-ai-job.js`, `test-end-to-end-ai-job-for-production.js`, `test-team-sync.js`, `test-team-sync-direct.js`, `test-fixed-team-sync.js`, `test-masterdata-team-sync.js`, `test-ado-sync-response.js`, `test-ai-job-processor.js`, `test-ai-job-processing.js`, `test-ai-api-logic.js`, `test-comprehensive-ado-integration.js`, `test-empty-repo-initialization.js`, `test-repo-with-spaces.js`, `test-repository-matcher-fixes.js`, `test-real-pat.js`, `test-prisma-production.js`, `test-ado-authentication.js`
- 6 check scripts: `check-ado-connection.js`, `check-ado-database.js`, `check-ado-settings.js`, `check-prod-ai-settings.js`, `check-session.js`, `check-webhook-projects.js`
- 5 debug scripts: `debug-ado-repositories.js`, `debug-ado-repository-exact.js`, `debug-ai-provider.js`, `debug-project-repositories.js`, `debug-real-ado-api-calls.js`
- 6 misc scripts: `audit-schema.js`, `fix-ai-provider-model.js`, `update-ai-provider-model.js`, `link-users-to-projects.js`, `regenerate-prisma-client.sh`, `process-ai-jobs.ts`

### Deployment steps

1. Test each migrated script:
   - `node scripts/reset-failed-jobs-firebase.js`
   - `node scripts/reset-specific-job-firebase.js <jobId>`
   - `node scripts/sync-project-members-firebase.js`
   - `node scripts/add-user-to-project-firebase.js <projectId> <email>`
2. Once validated, rename to replace originals:
   - `reset-failed-jobs.js` → `reset-failed-jobs.prisma-backup.js`, then `reset-failed-jobs-firebase.js` → `reset-failed-jobs.js`
   - `reset-specific-job.js` → `reset-specific-job.prisma-backup.js`, then `reset-specific-job-firebase.js` → `reset-specific-job.js`
   - `sync-project-members.js` → `sync-project-members.prisma-backup.js`, then `sync-project-members-firebase.js` → `sync-project-members.js`
   - `add-user-to-project.js` → `add-user-to-project.prisma-backup.js`, then `add-user-to-project-firebase.js` → `add-user-to-project.js`

---

## Priority 2.5: Rebrand Portavi → EchoOps

### Status: DONE

### What was done

Renamed all references from "Portavi" to "EchoOps" across the entire codebase.

#### Source code (21 files)

- [x] UI pages: `page.tsx`, `about/page.tsx`, `how-to/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`, `signin/page.tsx`, `signup/page.tsx`, `dashboard/page.tsx`
- [x] Components: `AppHeader.tsx`, `WelcomeModal.tsx`
- [x] App metadata: `metadata.ts` — title "Portavi" → "EchoOps"
- [x] Email templates: `send-verification/route.ts`, `resend-verify/route.ts`, `send/route.ts`, `test/email/route.ts`, `test-email/page.tsx`
- [x] Webhook: `signature-debug/route.ts`, `SETUP_GUIDE.md`, `postman-test-setup.md`
- [x] Project page: `projects/[projectId]/page.tsx`

#### Scripts (11 files)

- [x] `azure-devops-integration.js` / `.ts` — "Portavi AI" → "EchoOps AI"
- [x] `reset-failed-jobs.js`, `reset-specific-job.js` — removed `/var/www/portavi` path detection
- [x] `test-ado-signature.js`, `test-api-endpoint.js`, `test-fixed-ai-api.js`, `test-webhook.js` — `portavi.eu` → `echoops.org`
- [x] `run-repository-name-tests.js` — filepath comment updated
- [x] `update-pr-url-format.sh` — all paths updated
- [x] `README-ado-branch-test-server.md` — paths updated

#### Docs & config (28 files)

- [x] All 25 files in `docs/` folder — paths, brand name, domains updated
- [x] Root markdown: `README.md`, `README-AI-JOB-PROCESSOR.md`, `prd.md`, `DEPLOYMENT-SUMMARY-RESTRUCTURED-AI-JOBS.md`
- [x] `package.json` — `"name": "portavi"` → `"echoops"`
- [x] `ai-job-processor.service` — description and working directory updated

#### Replacements applied

| Old | New |
|---|---|
| Portavi / PORTAVI | EchoOps / ECHOOPS |
| portavi.eu / portavi.com | echoops.org |
| legal@portavi.eu, privacy@portavi.com, support@portavi.com | support@echoops.org |
| onboarding@update.portavi.eu | onboarding@update.echoops.org |
| /Portavi logo.png | /EchoOps logo.png |
| portavi-welcomed- (localStorage) | echoops-welcomed- |
| portavi-email-verification-secret | echoops-email-verification-secret |
| /var/www/portavi, /root/portavi | /var/www/echoops, /root/echoops |

#### Remaining (not changed — expected)

- `.env.studio` — old PostgreSQL creds, slated for deletion in Priority 3
- `package-lock.json` — auto-syncs on next `npm install`
- `build-output.log` — build artifact, can be deleted

---

## Priority 3: Clean Up Documentation & Config

### Status: DONE

- [x] Update `README.md` — rewrote to remove all Prisma/PostgreSQL references, documented Firebase setup, env vars, Firestore collections, updated architecture
- [x] Delete `.env.studio` (contained PostgreSQL connection string)
- [x] Update `project_state.md` — replaced Prisma schema block with Firestore data model
- [x] Review `docs/` folder — deleted 3 stale docs with Prisma references (`complete-solution-summary.md`, `ai-job-processor-deployment.md`, `complete-azure-devops-integration-fix.md`)
- [x] Rename `/public/Portavi logo.png` → `/public/EchoOps logo.png`
- [x] Deploy the app on Firebase — live at https://echoops-65d4b.web.app
  - Upgraded Next.js 15.3.2 → 15.3.6 (CVE-2025-66478 fix)
  - Enabled Cloud Functions, Cloud Build, Artifact Registry, Cloud Run APIs
  - SSR Cloud Function deployed to europe-west1

---

## Files Created During Migration

| File | Purpose |
|---|---|
| `scripts/firebase-admin-init.js` | Shared Firebase Admin SDK init for standalone scripts |
| `scripts/process-ai-jobs-firebase.js` | Firebase-based AI job processor (replaces Prisma version) |
| `scripts/reset-failed-jobs-firebase.js` | Reset all FAILED jobs to PENDING (Firebase version) |
| `scripts/reset-specific-job-firebase.js` | Reset a specific job by ID to PENDING (Firebase version) |
| `scripts/sync-project-members-firebase.js` | Sync ADO team members into Firestore (Firebase version) |
| `scripts/add-user-to-project-firebase.js` | Add user to project with OWNER role (Firebase version) |
