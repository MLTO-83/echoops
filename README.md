# Next.js + NextAuth + Prisma Starter

## Table of Contents

- [Getting Started](#getting-started)
- [UI Development](#ui-development)
- [Function Development](#function-development)
- [Backend Proxy for Azure DevOps API](#backend-proxy-for-azure-devops-api)
  - [Usage](#usage)
  - [Example Response](#example-response)
  - [AI Agent Webhook Integration](#ai-agent-webhook-integration)
    - [Setting Up Azure DevOps Service Hook](#setting-up-azure-devops-service-hook)
    - [Webhook Security](#webhook-security)
    - [How It Works](#how-it-works)
- [Development Environment Documentation](#development-environment-documentation)
  - [Project Architecture](#project-architecture)
    - [Key Components](#key-components)
  - [Prisma Configuration and Usage](#prisma-configuration-and-usage)
    - [Prisma Setup](#prisma-setup)
    - [Important Prisma Files](#important-prisma-files)
    - [How Prisma is Used in the Project](#how-prisma-is-used-in-the-project)
    - [Critical Implementation Details](#critical-implementation-details)
    - [Development Workflow with Prisma](#development-workflow-with-prisma)
  - [Database Schema Maintenance](#database-schema-maintenance)
    - [Regular Schema Audits](#regular-schema-audits)
    - [Implementing Audit Recommendations](#implementing-audit-recommendations)
    - [Schema Migration Best Practices](#schema-migration-best-practices)
    - [Managing Schema Changes Across Environments](#managing-schema-changes-across-environments)
    - [Common Schema Maintenance Tasks](#common-schema-maintenance-tasks)
- [Azure DevOps Integration](#azure-devops-integration)
- [ADO Connection Troubleshooting](#ado-connection-troubleshooting)
- [Development Method](#development-method)
- [Folder Structure](#folder-structure)
- [Postgresql](#postgresql)

This is a Next.js project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) and configured with NextAuth for authentication and Prisma for database access.

## Getting Started

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/MLTO-83/portavi.git
    cd portavi
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

3.  **Use environment variables:**

In the `.env.local` file in the root directory and the following environment variables:

    ```
    DATABASE_URL
    AUTH_GITHUB_ID
    AUTH_GITHUB_SECRET
    NEXTAUTH_SECRET
    ```

    Replace the placeholder values with your actual credentials. You'll need to set up a PostgreSQL database and obtain GitHub OAuth credentials.

4.  **Run database migrations:**

    ```bash
    npx prisma migrate dev
    ```

5.  **Start the development server:**

    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    # or
    bun dev
    ```

6.  **Open the application:**

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## UI Development

- **Framework:** This project uses [Next.js](https://nextjs.org) with the app directory for building the user interface.
- **Components:** React components are located in the `src/app/components` directory.
- **Styling:** Global styles are defined in `src/app/globals.css`. You can use CSS modules or any other styling solution you prefer.
- **Key files:**
  - `src/app/page.tsx`: The main page of the application.
  - `src/app/components/sign-in-button.tsx`: Component for signing in with GitHub.
  - `src/app/components/sign-out-button.tsx`: Component for signing out.

## Function Development

- **Authentication:** [NextAuth.js](https://next-auth.js.org/) is used for authentication. The configuration is in `src/auth.ts`.
- **Database:** [Prisma](https://www.prisma.io/) is used as the ORM to interact with the database. The database schema is defined in `prisma/schema.prisma`.
- **Actions:** Server Actions are used for handling form submissions and data mutations. See `src/lib/actions/auth.ts` for examples.
- **Key files:**
  - `src/auth.ts`: NextAuth configuration.
  - `src/lib/actions/auth.ts`: Server Actions for authentication.
  - `prisma/schema.prisma`: Prisma database schema.

## Backend Proxy for Azure DevOps API

A backend proxy has been implemented to handle requests to the Azure DevOps API and avoid CORS issues. This proxy is located in the `app/api/set-env/route.ts` file.

### Usage

To fetch Azure DevOps projects, make a POST request to the `/api/set-env` endpoint with the following JSON payload:

```json
{
  "adoPat": "<your_personal_access_token>"
}
```

### Example Response

On success, the response will contain the list of Azure DevOps projects:

```json
{
  "value": [
    {
      "id": "project-id",
      "name": "Project Name",
      "description": "Project Description"
    }
  ]
}
```

On failure, the response will contain an error message:

```json
{
  "error": "Failed to fetch ADO projects."
}
```

### AI Agent Webhook Integration

Portavi supports automatic triggering of the AI agent (Freja) through Azure DevOps Service Hooks. When a work item is assigned to Freja, the system will automatically start the AI agent process.

#### Setting Up Azure DevOps Service Hook

- **Navigate to Settings in Portavi:**
  - In the Portavi application, go to the sidebar and select **Settings**.
  - Under **Azure DevOps Integration**, locate the **Service Hook** configuration panel.
- **Navigate to Project Settings in Azure DevOps**:

  - Go to your Azure DevOps project
  - Click on Project Settings (bottom left)
  - Select "Service hooks"

- **Create a new Service Hook**:
  - Click "+ Create subscription"
  - Select "Web Hooks" as the service
  - Click "Next"

3. **Configure the trigger**:

   - Select "Work item updated" as the event
   - Under filters, add:
     - Field: "Assigned To"
     - Condition: "Changed"
     - Value: leave this blank to catch all assignments

4. **Configure the action**:

   - URL: `https://your-portavi-instance.com/api/ado/webhook`
   - HTTP headers:
     - Add a header: `x-ado-signature: [your_webhook_secret]`
     - The secret should match the `ADO_WEBHOOK_SECRET` environment variable
   - Basic authentication: None (unless your server requires it)
   - Click "Test" to verify the connection
   - Click "Finish" to save the subscription

5. **Environment Variables**:
   - Add to your `.env.local` file:
   ```
   ADO_WEBHOOK_SECRET=your_webhook_secret_here
   ```

#### Webhook Security

The webhook endpoint validates requests using a shared secret:

1. Azure DevOps includes this secret in the `x-ado-signature` header
2. The server verifies this signature using a timing-safe comparison
3. Invalid signatures are rejected with a 401 Unauthorized response

> **Important Note**: When setting up a webhook in Azure DevOps, ADO sends a test payload with the ID `27646e0e-b520-4d2b-9411-bba7524947cd`. This special test payload is automatically accepted without signature validation to facilitate the setup process.

#### How It Works

1. When a work item is assigned to Freja in Azure DevOps, the system sends a webhook event to Portavi
2. The webhook handler validates the request and extracts the work item details
3. If the assignee is Freja, the system creates an AI agent job
4. The AI agent processes the job and creates a pull request with the implementation
5. The status of the job can be monitored in the AI Agent panel in the project page

## Development Environment Documentation

### Project Architecture

Portavi is built using modern web technologies with a clear separation of concerns:

1. **Frontend**: Next.js 15 with React Server Components (App Router)
2. **Authentication**: NextAuth.js with GitHub provider
3. **Database ORM**: Prisma with PostgreSQL
4. **API Integrations**: Azure DevOps REST API

#### Key Components

- **UI Layer**: React components with Tailwind CSS
- **Server Components**: Next.js App Router for server-rendered pages
- **API Layer**: Next.js API Routes for backend functionality
- **Data Access Layer**: Prisma ORM for type-safe database access
- **Authentication Layer**: NextAuth.js for handling user sessions

### Prisma Configuration and Usage

Prisma is used as the ORM for this project with a custom configuration. Understanding this setup is crucial for development.

#### Prisma Setup

The project uses a custom Prisma client configuration:

- **Schema Location**: `prisma/schema.prisma`
- **Custom Client Output**: The Prisma client is generated to `prisma/app/generated/prisma/client` (non-standard location)
- **Database**: PostgreSQL (in development, accessible via Docker)

#### Important Prisma Files

1. **Schema Definition**: `prisma/schema.prisma` - Defines all database models and relationships
2. **Client Import**: `src/lib/prisma.ts` - Singleton instance of the Prisma client that should be used throughout the application
3. **Migrations**: `prisma/migrations/` - Contains all database migrations

#### How Prisma is Used in the Project

1. **Model Access**:

   ```typescript
   import prisma from "@/lib/prisma";

   // Example: Fetching a user
   const user = await prisma.user.findUnique({
     where: { email: "example@example.com" },
   });
   ```

2. **Database Migrations**:

   - Creating a migration: `npx prisma migrate dev --name migration_name`
   - Applying migrations: `npx prisma migrate deploy`
   - Reset database: `npx prisma migrate reset`

3. **Client Generation**:
   Always regenerate the client after schema changes:
   ```bash
   npx prisma generate
   ```

#### Critical Implementation Details

1. **Custom Client Import**:
   The application must import Prisma from the custom location:

   ```typescript
   // CORRECT - Use this in all files
   import { PrismaClient } from "../../prisma/app/generated/prisma/client";

   // INCORRECT - Do not use this
   import { PrismaClient } from "@prisma/client";
   ```

2. **Theme Preference**:
   The User model includes a theme field that stores the user's preference:

   ```prisma
   model User {
     // ...other fields
     theme String @default("dark") // Theme preference: "dark" or "light"
     // ...other fields
   }
   ```

3. **Related API Routes**:
   - `src/app/api/user/theme/route.ts` - GET/POST endpoints for theme preferences

#### Development Workflow with Prisma

1. **Making Schema Changes**:

   - Edit `prisma/schema.prisma`
   - Run `npx prisma migrate dev --name descriptive_name`
   - Run `npx prisma generate`
   - Restart development server if needed

2. **Troubleshooting**:

   - If you encounter "Unknown field" errors:
     - Verify the Prisma client is imported from the custom path
     - Regenerate the Prisma client with `npx prisma generate`
     - Clear the `.next` folder if needed (`rm -rf .next`)

3. **Database Inspection**:
   - Use Prisma Studio: `npx prisma studio`
   - Direct database access: `docker exec -it portavi-db-alt psql -U postgres`

## Database Schema Maintenance

To ensure optimal database performance and schema health over time, follow these maintenance procedures:

### Regular Schema Audits

Run the schema audit script monthly to identify potential issues:

```bash
node scripts/audit-schema.js
```

The audit script checks for:

- Missing indexes on foreign keys
- Empty tables that might indicate unused features
- Fields with all NULL values
- Other database optimization opportunities

### Implementing Audit Recommendations

1. **High Priority** - Implement immediately:

   - Missing indexes on foreign keys
   - Critical constraint issues

2. **Medium Priority** - Review during the next sprint:

   - Fields with all NULL values
   - Tables without secondary indexes

3. **Low Priority** - Consider during refactoring:
   - Empty tables
   - Minor optimization opportunities

### Schema Migration Best Practices

When making schema changes:

1. **Document Changes**: Update `/prisma/SCHEMA_CHANGES.md` with details about:

   - Purpose of the change
   - Impact on existing features
   - Required code updates

2. **Create Migration**: Use descriptive names for migrations:

   ```bash
   npx prisma migrate dev --name descriptive_name
   ```

3. **Test Critical Paths**: Run test scripts after migrations:

   ```bash
   node scripts/test-weekly-hours-schema.js
   ```

4. **Data Migration**: Use migration scripts for existing data:

   ```bash
   node scripts/migrate-to-weekly-hours.js
   ```

5. **Verify Indexes**: Ensure proper indexes exist after schema changes:
   ```bash
   node scripts/audit-schema.js
   ```

### Managing Schema Changes Across Environments

1. **Development**: Test migrations thoroughly in the dev environment
2. **Staging**: Verify migrations with production-like data
3. **Production**: Deploy with zero-downtime strategy:
   ```bash
   npx prisma migrate deploy
   ```

### Common Schema Maintenance Tasks

- **Analyze NULL Fields**: Investigate fields with all NULL values:

  ```bash
  node scripts/analyze-null-fields.js
  ```

- **Check Foreign Key Indexes**: Ensure all foreign keys have indexes:

  ```bash
  # Check the latest schema audit report
  cat prisma/schema-audit-$(date +%Y-%m-%d).json
  ```

- **Monitor Table Growth**: Watch for tables with excessive growth
  ```bash
  # Check database statistics in the latest audit report
  cat prisma/schema-audit-$(date +%Y-%m-%d).json
  ```

For detailed information about the database schema and relationships, refer to the ER diagram in this README and the complete schema definition in `/prisma/schema.prisma`.

### Azure DevOps Integration

A backend proxy has been implemented to handle requests to the Azure DevOps API and avoid CORS issues. This proxy is located in the `app/api/set-env/route.ts` file.

### ADO Connection Troubleshooting

When working with Azure DevOps integrations in this project, pay attention to the following common issues:

1. **Case-Sensitive Model Names**:
   The Prisma model for ADO connections is named `ADOConnection` with capital "ADO". Always use the exact case when referencing it:

   ```typescript
   // CORRECT
   await prisma.ADOConnection.findUnique({ where: { id: connectionId } });

   // INCORRECT - will cause errors
   await prisma.aDOConnection.findUnique({ where: { id: connectionId } });
   ```

2. **PAT Token Issues**:
   - Verify your PAT token has the correct scopes for the Azure DevOps API
   - Common required scopes: `vso.work_write`, `vso.project`, `vso.code`
   - If teams are not loading, check that your PAT includes `vso.project` scope
3. **Connection Debugging**:
   The project includes a debug script to verify ADO connections:
   ```bash
   # Install node-fetch first
   npm install node-fetch
   # Run the debugging script
   node scripts/check-ado-connection.js
   ```
4. **Common ADO API Errors**:

   - 401 Unauthorized: Check your PAT token is valid and not expired
   - 403 Forbidden: Check if the PAT has sufficient permissions
   - 404 Not Found: Verify the project ID and organization URL are correct

5. **Project Reference Issues**:
   - Ensure your project record has the correct `adoConnectionId` field
   - The `adoProjectId` field must match an existing project in your Azure DevOps account

### Development Method

The recommended development workflow for ADO integrations is:

1. **Set Up ADO Connection**:

   - Navigate to Settings page
   - Enter your Azure DevOps Organization URL (e.g., `https://dev.azure.com/your-org/`)
   - Add your Personal Access Token (PAT)
   - Save the connection

2. **Verify Connection**:

   - Use the debug script: `node scripts/check-ado-connection.js`
   - Check the console output to confirm the connection works
   - Verify that you can fetch teams and members

3. **Working with Projects**:

   - When creating new projects, the app will automatically sync them with ADO
   - For existing projects, ensure the `adoProjectId` and `adoConnectionId` fields are correctly set
   - Access the project at `/projects/[projectId]` to manage team members

4. **Troubleshooting**:
   - If you encounter connection issues, restart your Next.js server
   - Check the browser console and server logs for errors
   - Verify database records using Prisma Studio: `npx prisma studio`

## Folder Structure

```
Source/
├── prisma/                # Prisma schema and migrations
├── public/                # Static assets
├── src/
│   ├── app/             # Next.js app directory
│   │   ├── api/         # API routes
│   │   ├── components/  # React components
│   │   ├── fonts/       # Custom fonts
│   │   ├── page.tsx     # Main page
│   │   └── layout.tsx   # Root layout
│   ├── auth.ts          # NextAuth configuration
│   ├── lib/           # Utility functions and actions
│   │   └── actions/   # Server Actions
│   └── middleware.ts    # Middleware configuration
├── next.config.js       # Next.js configuration
├── tsconfig.json        # TypeScript configuration
└── README.md            # This file
```

## Postgresql

CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMES
d80dcca915be postgres "docker-entrypoint.s…" About a minute ago Up About a minute 0.0.0.0:5433->5432/tcp, :::5433->5432/tcp portavi-db-alt

1. run docker
   docker start portavi-db-alt

Schema: /root/Portavi/Source/prisma/schema.prisma

ER-diagram:
erDiagram
User ||--|| Organization : has one
User ||--o{ ProjectMember : has many
User ||--o{ Account : has many
User ||--o{ Session : has many
User ||--o{ Authenticator : has many
ADOConnection ||--|| Organization : has one
ADOConnection ||--o{ Project : has many
ADOConnection ||--|| adoOrganizationUrl]) : has one
ProgramType ||--|| Organization : has one
ProgramType ||--o{ Project : has many
ProgramType ||--|| name]) : has one
ProjectMember ||--|| Project : has one
ProjectMember ||--|| User : has one
ADOSprint ||--|| Project : has one
ADOSprint ||--o{ ADOWorkItem : has many
ADOSprint ||--|| adoIterationId]) : has one
ADOSprint ||--|| endDate]) : has one
Account ||--|| User : has one
Account ||--|| providerAccountId]) : has one
Session ||--|| User : has one
VerificationToken ||--|| token]) : has one
Authenticator ||--|| User : has one
Authenticator ||--|| credentialID]) : has one

# Design

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

const temperatureData = [
{ day: 19, temp: 18 },
{ day: 20, temp: 20 },
{ day: 21, temp: 22 },
{ day: 22, temp: 30 },
{ day: 23, temp: 24 },
{ day: 24, temp: 30 },
{ day: 25, temp: 26 },
];

export default function Dashboard() {
return (

<div className="min-h-screen bg-[#0F1A2B] text-white p-4 md:p-6 flex flex-col lg:flex-row gap-4">
<div className="flex-1">
<Card className="w-full bg-white text-black rounded-2xl shadow-lg p-6">
<h2 className="text-xl font-semibold mb-4">Global Temperature</h2>
<div className="flex flex-col md:flex-row items-center justify-between gap-4">
<Slider min={10} max={40} defaultValue={[30]} step={1} className="w-full md:w-auto" />
<div className="text-lg font-medium">Goal: 30°C</div>
</div>
<div className="mt-6 h-52">
<ResponsiveContainer width="100%" height="100%">
<BarChart data={temperatureData}>
<XAxis dataKey="day" />
<Tooltip />
<Bar dataKey="temp" radius={[4, 4, 0, 0]} fill="#A28BFE" />
</BarChart>
</ResponsiveContainer>
</div>
</Card>
</div>

      <div className="w-full lg:w-80">
        <Card className="bg-white text-black rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Shortcuts</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Temperature</span>
              <span className="font-medium">24°C</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Internet</span>
              <span className="font-medium">78.22</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Lights</span>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>
      </div>
    </div>

);
}

## Settings Page

The settings page provides a centralized location for configuring various aspects of the application:

### Organization Settings

- **Organization Name Management**: The settings page displays the actual organization name from the database, ensuring consistency across the application.
- **Database Management**: A cleanup script (`scripts/cleanup/fix-duplicate-organizations.js`) is provided to consolidate duplicate organization records.

### Azure DevOps Integration

- **Configuration**: Set up and manage your Azure DevOps connection with organization URL and PAT token.
- **Verification**: Test your ADO connection directly from the settings page.
- **Status Display**: Visual indicators show whether your ADO connection is properly configured and verified.

### AI Provider Integration

- **Multiple Provider Support**: Configure any of the following AI providers:
  - OpenAI (GPT models)
  - Google Gemini
  - Anthropic Claude
- **Real API Connections**: All AI provider testing uses real API connections with your chosen provider.
- **Configuration Options**:
  - Provider name
  - API key
  - Model selection
  - Temperature and token control
- **Live Testing**: Test your AI provider with custom prompts directly from the settings page.
- **Status Display**: Visual indicators show configuration status with database-stored settings.

### AI Agent User Selection

- **User Assignment**: Designate specific users as AI agents within your organization.
- **License Management**: When a user is selected as an AI agent, their license type is automatically updated to `AI_AGENT`.
- **UI Integration**: Simple dropdown selection of available users in your organization.

### Implementation Details

- **Organization Management**: Avoids fallback naming logic, using only database-stored organization names.
- **AI Provider Testing**: Uses provider-specific SDKs for accurate testing:
  - OpenAI SDK for GPT models
  - Google Generative AI SDK for Gemini
  - Anthropic SDK for Claude
- **State Management**: React state hooks with proper loading indicators for all asynchronous operations.
- **Error Handling**: Comprehensive error reporting for API connections and configuration issues.

Accessing the Settings Page: Navigate to `/settings` in the application to access all configuration options.
