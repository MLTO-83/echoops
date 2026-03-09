# Repository Name Mismatch Fix - Verification Guide

This document explains how to verify that the repository name mismatch fix has been properly deployed and is working correctly.

## Background

We've implemented a repository matcher utility that resolves issues when repository names in our system don't exactly match the names in Azure DevOps. For example, a repository named "MasterData" in our system might actually be "MasterData management" in Azure DevOps.

## How the Fix Works

The repository matcher uses a three-step approach:

1. First, try to find a repository with the exact name provided
2. If that fails, try using the project name as the repository name
3. If that fails, list all repositories and find the best match based on name similarity

## Verification Steps

Follow these steps to verify the fix is working properly:

### 1. Check the Logs for Successful Repository Matching

When the system is processing a job, it should now log information about the repository matching process:

```
Getting repository info for "MasterData" in project "ProjectName"
Repository matching result: {...}
Using repository: "MasterData management" (encoded: "MasterData%20management")
```

### 2. Verify with a Repository that Has a Name Mismatch

The easiest way to verify is to submit an AI job with a repository that has a name mismatch, such as:

- Repository name in our system: "MasterData"
- Actual repository name in Azure DevOps: "MasterData management"

If the fix is working correctly:

- The job should complete successfully
- A pull request should be created in the correct repository
- The logs should show the repository matching process

### 3. Monitor for 404 Errors

Before this fix, repositories with name mismatches would cause 404 errors in the logs. After the fix is deployed, these errors should disappear. Check the logs for any 404 errors related to repository access.

### 4. Run the Repository Matcher Test Script

We've included a test script that can verify the repository matcher is working with mock data:

```bash
cd /var/www/portavi
node scripts/test-repository-matcher.js
```

This will run through several test cases and report success or failure.

### 5. Run a Live Test (Production Only)

In the production environment, you can run the deployment script which includes an option to test with the actual Azure DevOps API:

```bash
cd /var/www/portavi
./scripts/deploy-repository-matcher.sh
```

When prompted, choose to run the actual API test and provide:

- A repository name to test
- Your Azure DevOps organization URL
- Your Azure DevOps PAT (Personal Access Token)

## Troubleshooting

If you encounter issues after deployment:

1. Check the AI job processor logs:

   ```bash
   sudo journalctl -u ai-job-processor.service -f
   ```

2. Look for specific errors related to repository matching.

3. If there are TypeScript compilation errors:

   ```bash
   # Run the TypeScript fix script
   cd /var/www/portavi
   ./scripts/fix-process-ai-jobs-type-error.sh

   # Then build the project
   npm run build
   ```

4. If necessary, you can roll back the changes using the backup files created during deployment:

   ```bash
   # Find the backup files
   ls -la /var/www/portavi/scripts/process-ai-jobs.js.bak.*
   ls -la /var/www/portavi/scripts/process-ai-jobs.ts.bak.*

   # Restore from a specific backup
   cp /var/www/portavi/scripts/process-ai-jobs.js.bak.TIMESTAMP /var/www/portavi/scripts/process-ai-jobs.js
   cp /var/www/portavi/scripts/process-ai-jobs.ts.bak.TIMESTAMP /var/www/portavi/scripts/process-ai-jobs.ts
   cp /var/www/portavi/scripts/ado-repository-matcher.js.bak.TIMESTAMP /var/www/portavi/scripts/ado-repository-matcher.js

   # Recompile and restart the service
   cd /var/www/portavi
   npm run build
   sudo systemctl restart ai-job-processor.service
   ```

## Support

If you encounter any issues with this fix that you cannot resolve, please contact the development team for assistance.
