# AI Agent Active State Control

## Overview

The AI Agent functionality is now exclusively controlled by the `projectWebhookConfig.active` field in the database. This change simplifies the logic for determining whether the AI Agent is available and ready to use.

## Changes

1. **Removed reliance on webhook verification status**

   - Previously, the AI Agent required both:
     - `active` field to be set to true in the database
     - Webhook verification to be completed
   - Now, the AI Agent only requires the `active` field to be true

2. **Updated UI logic**

   - The component now displays as "Ready" based on the `isWebhookActive` state
   - Banner messages have been simplified to focus on active/inactive status
   - Button states and form controls are enabled/disabled based on the active state

3. **Simplified configuration workflow**
   - Users can:
     1. Configure webhook secret
     2. Toggle active state
     3. Save configuration
   - If active state is true, AI Agent becomes immediately available
   - New webhooks are inactive by default
   - Testing the webhook connection preserves the current active state

## Technical Implementation

The `AIAgentPanel` component was modified to:

- Fetch and use the `active` field from `projectWebhookConfig` as the primary control
- Set `isWebhookActive` state which controls visibility and functionality
- Update `isConfigured` when active state changes to toggle AI Agent controls
- Always assume the webhook is "verified" when it exists in the database

## Testing

When testing this feature, verify that:

1. When the webhook is marked as active in the database, the AI Agent controls are enabled
2. When the webhook is marked as inactive, the controls are disabled
3. Toggling the active state and saving the configuration updates the UI accordingly
4. Testing the webhook connection does not change the active state
5. New webhook configurations are created with active=false by default
6. Only webhooks with active=true will process incoming Azure DevOps events and create AI jobs

## Related Components

- `/src/app/components/AIAgent/AIAgentPanel.tsx` - Primary component modified
- `/src/app/api/projects/[projectId]/webhook-config/route.ts` - API for webhook configuration
- `/src/app/api/ado/webhook/test/route.ts` - Modified to preserve active state during webhook testing
- `/src/app/api/ado/webhook/route.ts` - Respects the active field when processing webhooks

## Database Fields

The component is controlled by the following fields in the `projectWebhookConfig` table:

- `active` - Boolean that determines if the AI Agent is enabled
- `secret` - Secret key for webhook validation
- `repositoryName` - Repository to use for AI Agent
- `agentInstructions` - Instructions for the AI Agent
