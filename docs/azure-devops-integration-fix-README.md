# Azure DevOps Integration Fix

This fix addresses several issues with Azure DevOps integration in the Portavi application:

1. Repository names with spaces weren't being properly URL-encoded, causing API calls to fail
2. Project name wasn't being specified in API calls
3. Default branch names reported by the API didn't always exist in repositories

## Production-Ready Code

The code in `scripts/process-ai-jobs.ts` is now production-ready with the following enhancements:

1. **Repository name encoding**:

   - All repository names are properly URL-encoded in API calls
   - Project names are also URL-encoded

2. **Project detection**:

   - The code now tries to find the appropriate project for each repository
   - Logic prioritizes exact matches, then substring matches, then falls back to the first project

3. **Smart branch detection**:

   - Tries multiple common branch names in sequence:
     - Default branch reported by API
     - main
     - master
     - develop
     - development
     - release
     - prod
     - production
   - Uses the first successful branch for PR creation

4. **Enhanced error handling**:
   - Detailed error logging for each API call
   - Captures and logs API response data for failed calls
   - Better error messages to help diagnose issues

## Testing the Fix

### 1. Test with a specific repository name

```bash
# Compile the TypeScript code first
tsc /root/portavi/scripts/process-ai-jobs.ts

# Run the test script with a custom repository name
node /root/portavi/scripts/test-repo-with-spaces.js "Your Repository With Spaces"
```

### 2. Reset and retry failed jobs

```bash
# Reset all failed jobs with spaces in repository names
node /root/portavi/scripts/reset-failed-jobs-with-spaces.js

# Reset a specific job by ID
node /root/portavi/scripts/reset-failed-jobs-with-spaces.js YOUR_JOB_ID
```

### 3. Monitor logs

```bash
tail -f /root/portavi/scripts/process-ai-jobs.log
```

## Deploying to Production

1. **Compile the TypeScript code**:

   ```bash
   tsc /root/portavi/scripts/process-ai-jobs.ts
   ```

2. **Restart the job processor service**:

   ```bash
   systemctl restart ai-job-processor.service
   ```

3. **Verify the service is running**:

   ```bash
   systemctl status ai-job-processor.service
   ```

4. **Run a test job** with a repository name containing spaces.

## Implementation Notes

For more detailed information, please refer to:

- `docs/azure-devops-integration-testing.md` - Testing instructions
- `docs/branch-name-detection-enhancement.md` - Branch detection details
- `docs/repository-name-fix.md` - Repository name encoding details

## Support

If you encounter any issues, please check the logs and contact the development team.
