# Azure DevOps Integration Fix Guide

This guide provides instructions for fixing Azure DevOps integration issues with repository names containing spaces and branch detection.

## Issue Description

The current implementation of Azure DevOps integration in the AI job processor has two main issues:

1. Repository names with spaces are not properly URL-encoded in all API calls
2. Branch detection fails when the default branch reported by the API doesn't match actual branches

## How to Deploy the Fix

### Using Git (Recommended)

1. Merge the changes to the `process-ai-jobs.ts` file in your GitHub repository
2. Pull the changes on the production server:

```bash
cd /var/www/echoops
GIT_SSH_COMMAND='ssh -i ~/.ssh/echoops_ed25519 -o IdentitiesOnly=yes' git pull origin main
```

3. Compile the TypeScript file:

```bash
cd /var/www/echoops
npx tsc scripts/process-ai-jobs.ts
```

4. Restart the AI job processor service:

```bash
systemctl restart ai-job-processor.service
```

### Manual Implementation

If you prefer to implement the fix manually on the production server:

1. Replace the current implementation with the fixed version:

```bash
cd /var/www/echoops
cp scripts/process-ai-jobs-fixed-api-flow.js scripts/process-ai-jobs.js
```

2. No compilation needed since we're using JavaScript directly

3. Restart the service:

```bash
systemctl restart ai-job-processor.service
```

## Testing the Fix

1. Create a test job with a repository name containing spaces:

```bash
cd /var/www/echoops
node scripts/test-repo-with-spaces.js "Repository With Spaces"
```

2. Monitor the logs to see the API flow:

```bash
tail -f scripts/process-ai-jobs.log
```

3. Reset failed jobs if needed:

```bash
cd /var/www/echoops
node scripts/reset-failed-jobs-with-spaces.js
```

## Documentation

For more details, see:

- `docs/azure-devops-api-flow.md` - Documents the correct API flow for Azure DevOps
- `docs/empty-repository-handling-updated.md` - Information about handling repositories with unusual branch configurations
