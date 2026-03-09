# Empty Repository Initialization Branch Creation Fix

## Problem Description

After implementing the automatic empty repository initialization feature, an issue was discovered in the branch creation process.

When the system initializes an empty repository, it creates a README.md file with a commit to the main branch. However, when subsequently trying to create a feature branch for the AI-generated code, the API call fails with a 400 error:

```
Error creating branch: Request failed with status code 400
Response status: 400
Response data: {
  "$id": "1",
  "innerException": null,
  "message": "Value cannot be null.\r\nParameter name: refUpdates",
  "typeName": "System.ArgumentNullException, mscorlib",
  "typeKey": "ArgumentNullException",
  "errorCode": 0,
  "eventId": 0
}
```

## Root Cause

The issue is in the structure of the API request when creating a new branch. The Azure DevOps API expects a `refUpdates` array containing branch information, but the code was sending a flat object structure instead.

Current code (incorrect):

```javascript
{
  name: `refs/heads/${branchName}`,
  oldObjectId: "0000000000000000000000000000000000000000",
  newObjectId: latestCommitId,
}
```

This format doesn't match the expected API structure, causing the `refUpdates` parameter to be null when processed by Azure DevOps.

## Fix Implemented

The branch creation API call has been updated to use the correct parameter structure:

```javascript
{
  refUpdates: [
    {
      name: `refs/heads/${branchName}`,
      oldObjectId: "0000000000000000000000000000000000000000",
      newObjectId: latestCommitId,
    },
  ];
}
```

This matches the expected format for the Azure DevOps API and properly wraps the branch parameters in a `refUpdates` array.

## Testing in Production

Since testing requires interaction with Azure DevOps repositories, follow these steps to verify the fix:

1. Deploy the updated code using the `deploy-empty-repo-fix-updated.sh` script:

   ```bash
   /root/portavi/scripts/deploy-empty-repo-fix-updated.sh
   ```

2. Create an empty repository in Azure DevOps (without initialization)

3. Run the test script:

   ```bash
   node /var/www/portavi/scripts/test-empty-repo-initialization.js "YourEmptyRepoName"
   ```

4. Monitor the logs to verify the expected flow:

   ```bash
   tail -f /var/www/portavi/scripts/process-ai-jobs.log
   ```

5. Verify in Azure DevOps that:
   - The empty repository was initialized with a README.md file
   - A feature branch was successfully created
   - The AI-generated code was added to the feature branch
   - A pull request was created from the feature branch to the main branch

## Rollback Plan

If issues arise, you can rollback to the previous version using the backup files created during deployment:

```bash
# Replace TIMESTAMP with the actual timestamp from your backup files
cp /var/www/portavi/scripts/process-ai-jobs.js.bak.TIMESTAMP /var/www/portavi/scripts/process-ai-jobs.js
cp /var/www/portavi/scripts/process-ai-jobs.ts.bak.TIMESTAMP /var/www/portavi/scripts/process-ai-jobs.ts
systemctl restart ai-job-processor.service
```
