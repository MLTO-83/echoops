# EchoOps

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
- [Project Architecture](#project-architecture)
- [Firebase Configuration](#firebase-configuration)
- [Azure DevOps Integration](#azure-devops-integration)
- [ADO Connection Troubleshooting](#ado-connection-troubleshooting)
- [Development Method](#development-method)
- [Folder Structure](#folder-structure)
- [Settings Page](#settings-page)

EchoOps is a Next.js project with NextAuth for authentication and Firebase/Firestore as the database backend.

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone https://github.com/MLTO-83/echoops.git
   cd echoops
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   Create a `.env.local` file with the following:

   ```
   # NextAuth
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000

   # GitHub OAuth
   AUTH_GITHUB_ID=your_github_client_id
   AUTH_GITHUB_SECRET=your_github_client_secret

   # Firebase Client (public)
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...

   # Firebase Admin (server-side)
   FIREBASE_PROJECT_ID=...
   FIREBASE_CLIENT_EMAIL=...
   FIREBASE_PRIVATE_KEY=...

   # Azure DevOps Webhook
   ADO_WEBHOOK_SECRET=your_webhook_secret_here
   ```

4. **Start the development server:**

   ```bash
   npm run dev
   ```

5. **Open the application:**

   Open [http://localhost:3000](http://localhost:3000) with your browser.

## UI Development

- **Framework:** Next.js with the App Router
- **Components:** React components in `src/app/components`
- **Styling:** Tailwind CSS, global styles in `src/app/globals.css`
- **Key files:**
  - `src/app/page.tsx` — Main page
  - `src/app/components/sign-in-button.tsx` — GitHub sign-in
  - `src/app/components/sign-out-button.tsx` — Sign-out

## Function Development

- **Authentication:** NextAuth.js with GitHub provider (`src/auth.ts`)
- **Database:** Firebase/Firestore for all data storage
- **Actions:** Server Actions for form submissions and mutations (see `src/lib/actions/auth.ts`)
- **Key files:**
  - `src/lib/firebase/client.ts` — Firebase client SDK (browser)
  - `src/lib/firebase/admin.ts` — Firebase Admin SDK (server)
  - `src/auth.ts` — NextAuth configuration

## Backend Proxy for Azure DevOps API

A backend proxy handles requests to the Azure DevOps API to avoid CORS issues. Located in `app/api/set-env/route.ts`.

### Usage

POST to `/api/set-env` with:

```json
{
  "adoPat": "<your_personal_access_token>"
}
```

### Example Response

Success:

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

Failure:

```json
{
  "error": "Failed to fetch ADO projects."
}
```

### AI Agent Webhook Integration

EchoOps supports automatic triggering of the AI agent (Freja) through Azure DevOps Service Hooks. When a work item is assigned to Freja, the system automatically starts the AI agent process.

#### Setting Up Azure DevOps Service Hook

- **Navigate to Settings in EchoOps:**
  - Go to the sidebar and select **Settings**
  - Under **Azure DevOps Integration**, locate the **Service Hook** configuration panel

- **Navigate to Project Settings in Azure DevOps:**
  - Go to your Azure DevOps project
  - Click on Project Settings (bottom left)
  - Select "Service hooks"

- **Create a new Service Hook:**
  - Click "+ Create subscription"
  - Select "Web Hooks" as the service
  - Click "Next"

- **Configure the trigger:**
  - Select "Work item updated" as the event
  - Under filters, add:
    - Field: "Assigned To"
    - Condition: "Changed"
    - Value: leave blank to catch all assignments

- **Configure the action:**
  - URL: `https://your-echoops-instance.com/api/ado/webhook`
  - HTTP headers: `x-ado-signature: [your_webhook_secret]`
  - The secret should match the `ADO_WEBHOOK_SECRET` environment variable
  - Click "Test" to verify, then "Finish" to save

#### Webhook Security

The webhook endpoint validates requests using a shared secret:

1. Azure DevOps includes the secret in the `x-ado-signature` header
2. The server verifies using a timing-safe comparison
3. Invalid signatures are rejected with 401 Unauthorized

> **Note**: Azure DevOps sends a test payload with ID `27646e0e-b520-4d2b-9411-bba7524947cd` during setup. This test payload is automatically accepted without signature validation.

#### How It Works

1. When a work item is assigned to Freja in Azure DevOps, a webhook event is sent to EchoOps
2. The webhook handler validates the request and extracts work item details
3. If the assignee is Freja, an AI agent job is created in Firestore
4. The AI agent processes the job and creates a pull request with the implementation
5. Job status can be monitored in the AI Agent panel on the project page

## Project Architecture

EchoOps is built with:

1. **Frontend**: Next.js 15 with React Server Components (App Router)
2. **Authentication**: NextAuth.js with GitHub provider
3. **Database**: Firebase/Firestore
4. **API Integrations**: Azure DevOps REST API

### Key Components

- **UI Layer**: React components with Tailwind CSS
- **Server Components**: Next.js App Router for server-rendered pages
- **API Layer**: Next.js API Routes for backend functionality
- **Data Access Layer**: Firebase Admin SDK for server-side Firestore access
- **Authentication Layer**: NextAuth.js for handling user sessions

## Firebase Configuration

### Client SDK (`src/lib/firebase/client.ts`)

Used in browser components for Firebase Auth:

```typescript
import { auth, githubProvider } from "@/lib/firebase/client";
```

### Admin SDK (`src/lib/firebase/admin.ts`)

Used in API routes and server components for Firestore access:

```typescript
import { adminDb, adminAuth } from "@/lib/firebase/admin";

// Example: Fetch a user
const userDoc = await adminDb.collection("users").doc(userId).get();
```

### Standalone Scripts (`scripts/firebase-admin-init.js`)

Used by standalone scripts (job processors, maintenance):

```javascript
const { adminDb } = require("./firebase-admin-init.js");
```

### Firestore Collections

Key collections used in the application:

- `users` — User accounts
- `organizations` — Organizations
- `projects` — Projects (with subcollections: `members`, `members/{id}/weeklyHours`)
- `adoConnections` — Azure DevOps connections
- `aiAgentJobs` — AI agent job queue
- `aiProviderSettings` — AI provider configurations
- `states` — Project status definitions

## Azure DevOps Integration

A backend proxy handles requests to the Azure DevOps API. Located in `app/api/set-env/route.ts`.

## ADO Connection Troubleshooting

1. **PAT Token Issues**:
   - Verify your PAT token has the correct scopes
   - Common required scopes: `vso.work_write`, `vso.project`, `vso.code`
   - If teams are not loading, check that your PAT includes `vso.project` scope

2. **Common ADO API Errors**:
   - 401 Unauthorized: Check your PAT token is valid and not expired
   - 403 Forbidden: Check if the PAT has sufficient permissions
   - 404 Not Found: Verify the project ID and organization URL are correct

3. **Project Reference Issues**:
   - Ensure your project document has the correct `adoConnectionId` field
   - The `adoProjectId` field must match an existing project in your Azure DevOps account

## Development Method

1. **Set Up ADO Connection:**
   - Navigate to Settings page
   - Enter your Azure DevOps Organization URL (e.g., `https://dev.azure.com/your-org/`)
   - Add your Personal Access Token (PAT)
   - Save the connection

2. **Verify Connection:**
   - Check the console output to confirm the connection works
   - Verify that you can fetch teams and members

3. **Working with Projects:**
   - When creating new projects, the app will automatically sync them with ADO
   - For existing projects, ensure `adoProjectId` and `adoConnectionId` fields are correctly set
   - Access the project at `/projects/[projectId]` to manage team members

4. **Troubleshooting:**
   - If you encounter connection issues, restart your Next.js server
   - Check the browser console and server logs for errors

## Folder Structure

```
echoops/
├── public/                # Static assets
├── scripts/               # Standalone scripts (job processor, maintenance)
├── src/
│   ├── app/               # Next.js app directory
│   │   ├── api/           # API routes
│   │   ├── components/    # React components
│   │   ├── fonts/         # Custom fonts
│   │   ├── page.tsx       # Main page
│   │   └── layout.tsx     # Root layout
│   ├── lib/
│   │   ├── firebase/      # Firebase client & admin SDK setup
│   │   └── actions/       # Server Actions
│   ├── auth.ts            # NextAuth configuration
│   └── middleware.ts       # Middleware configuration
├── next.config.js         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## Settings Page

The settings page provides a centralized location for configuring various aspects of the application:

### Organization Settings

- **Organization Name Management**: Displays the organization name from Firestore.

### Azure DevOps Integration

- **Configuration**: Set up and manage your Azure DevOps connection with organization URL and PAT token.
- **Verification**: Test your ADO connection directly from the settings page.
- **Status Display**: Visual indicators show connection status.

### AI Provider Integration

- **Multiple Provider Support**: Configure any of the following AI providers:
  - OpenAI (GPT models)
  - Google Gemini
  - Anthropic Claude
- **Configuration Options**: Provider name, API key, model selection, temperature and token control.
- **Live Testing**: Test your AI provider with custom prompts directly from settings.

### AI Agent User Selection

- **User Assignment**: Designate specific users as AI agents within your organization.
- **License Management**: When selected as an AI agent, the user's license type is updated to `AI_AGENT`.
