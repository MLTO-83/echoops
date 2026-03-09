# Database Schema Change Log

This document tracks significant changes to the database schema and their impacts on the application.

## Add Missing Foreign Key Indexes (April 28, 2025)

**Migration File:** `20250428000000_add_missing_foreign_key_indexes`

### Changes

- Added 7 missing indexes on foreign key columns:
  - `User.organizationId`
  - `Account.userId`
  - `Session.userId`
  - `Authenticator.userId`
  - `Project.adoConnectionId`
  - `AIAgentSettings.userId`
  - `AIAgentJob.projectId`

### Impact

- Improved query performance for relationship lookups
- Faster joins between related tables
- Better performance for ADO integrations and project member operations

### Migration Steps

1. Run migration: `npx prisma migrate deploy`

### Affected Components

- All queries involving user relationships
- Project and ADO integration queries
- AI agent operations

### Notes

- Indexes added based on schema audit recommendations from April 27, 2025
- No application code changes required as this is a performance optimization

---

## Weekly Hours Tracking Migration (April 25, 2025)

**Migration File:** `20250425000000_add_weekly_hours_tracking`

### Changes

- Removed `hoursPerWeek` and `hoursPerMonth` fields from `ProjectMember` table
- Created new `ProjectMemberWeeklyHours` table with `year` and `weekNumber` fields
- Added indexes on `ProjectMemberWeeklyHours` for performance optimization

### Impact

- All code that accessed `ProjectMember.hoursPerWeek` needed to be updated
- Existing project members needed migration to create corresponding weekly hours entries
- APIs and integrations (particularly ADO) needed to be updated to create weekly hours entries

### Migration Steps

1. Run migration: `npx prisma migrate deploy`
2. Run data migration script: `node scripts/migrate-to-weekly-hours.js`
3. Test critical paths: `node scripts/test-weekly-hours-schema.js`

### Affected Components

- Project member creation/update functionality
- ADO team synchronization
- Weekly hours reporting and charts
- Project allocation overview

### Notes

- Some legacy code may still expect `hoursPerWeek` to be available directly on `ProjectMember`
- The new schema allows for more granular tracking of hours on a weekly basis
- Use the `getCurrentWeekAndYear()` utility function from `date-utils.ts` for consistency

---

## Add Max Hours Per Week (April 24, 2025)

**Migration File:** `20250424044148_add_max_hours_per_week`

### Changes

- Added `maxHoursPerWeek` field to `User` table with default value of 40
- This field determines the maximum weekly capacity for a user

### Impact

- Enhanced allocation validation to respect user's weekly capacity
- Added overbooking detection in allocation reports

### Migration Steps

1. Run migration: `npx prisma migrate deploy`

### Affected Components

- Project member allocation validation
- Allocation reports and charts

---

## ADO User ID (April 23, 2025)

**Migration File:** `20250423051958_add_ado_user_id`

### Changes

- Added `adoUserId` field to `User` table
- Created unique constraint on `adoUserId` field

### Impact

- Allows direct mapping between Portavi users and ADO users
- Improves ADO integration reliability

### Migration Steps

1. Run migration: `npx prisma migrate deploy`

### Affected Components

- ADO synchronization functionality
- User management

---

## Add Hours to Project Member (April 22, 2025)

**Migration File:** `20250422083258_add_hours_to_project_member`

### Changes

- Added `hoursPerWeek` and `hoursPerMonth` fields to `ProjectMember` table

### Impact

- Enabled tracking of time allocation per project member
- Added capacity management features

### Migration Steps

1. Run migration: `npx prisma migrate deploy`

### Affected Components

- Project member management
- Resource allocation reports

### Deprecated

- These fields were later removed in favor of the weekly hours tracking system (April 25, 2025)

---

## Add Theme Preference (April 20, 2025)

**Migration File:** `20250420151744_add_theme_preference`

### Changes

- Added `theme` field to `User` table with default value of "dark"

### Impact

- Allowed users to customize their UI theme preferences
- Theme settings are persisted across sessions

### Migration Steps

1. Run migration: `npx prisma migrate deploy`

### Affected Components

- User settings UI
- Application theme management

---

## Initial Schema (April 19, 2025)

**Migration File:** `20250419073147_init`

### Changes

- Initial database schema creation with core tables:
  - User
  - Organization
  - Project
  - Account
  - Session
  - and more...

### Migration Steps

1. Run migration: `npx prisma migrate deploy`

### Notes

- This is the foundation of the database schema
- Review the migration file for complete details of the initial structure
