# Azure DevOps Integration Fix Testing Guide

This document provides instructions for testing the Azure DevOps integration fixes on the production server. These fixes address issues with repository names containing spaces and branch name detection.

## Fix Summary

1. **Repository Name URL Encoding**

   - Repository names with spaces are now properly URL-encoded in all Azure DevOps API calls
   - Example: "MasterData management" is encoded as "MasterData%20management"

2. **Project Name Discovery**

   - Added logic to find the correct project for repositories
   - Uses exact match, substring match, or falls back to first project

3. **Smart Branch Name Detection**
   - Tries multiple common branch names (main, master, develop, etc.)
   - Falls back to alternative branches if the default branch doesn't exist
   - Uses the successful branch as the target for PR creation

## Testing the Fix

### Method 1: Create a Test Job

Run the following command to create a test AI job with a specific repository name:

```bash
node /root/echoops/scripts/test-repo-with-spaces.js "Repository Name With Spaces"
```

Replace "Repository Name With Spaces" with the actual repository name you want to test. The script will:

1. Create a test job with the specified repository name
2. Wait 15 seconds to see if the job is processed
3. Report the job status (success/failure)

### Method 2: Reset Failed Jobs

If you have existing failed jobs with spaces in repository names, you can reset them to be reprocessed:

```bash
node /root/echoops/scripts/reset-failed-jobs-with-spaces.js
```

This will:

1. Find all failed jobs with spaces in repository names
2. Display them and ask for confirmation
3. Reset them to "PENDING" status so they'll be processed in the next cycle

## Monitoring

Check the AI job processor logs for detailed information:

```bash
tail -f /root/echoops/scripts/process-ai-jobs.log
```

## Verification

A successful test will show:

1. Repository name being properly encoded
2. Project name being correctly identified
3. Branch name detection working through the fallback options
4. PR creation with the correct URL

## Troubleshooting

If the test fails, check:

1. AI job processor service is running: `systemctl status ai-job-processor.service`
2. The logs for specific errors: `tail -f /root/echoops/scripts/process-ai-jobs.log`
3. Azure DevOps PAT token validity
4. Repository and project existence in the ADO organization

## Deploying to Production

1. Copy the updated `scripts/process-ai-jobs.ts` file to the production server
2. Compile the TypeScript: `tsc /root/echoops/scripts/process-ai-jobs.ts`
3. Restart the AI job processor service: `systemctl restart ai-job-processor.service`
4. Run a test job to verify the fixes are working

## Support

If you encounter any issues, please check the logs and contact the development team with the specific error messages.
