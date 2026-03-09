# Azure DevOps Repository Name Mismatch Fix

## Issue

When creating a pull request, the AI job processor fails with a 404 error because it can't find the repository. The logs show:

```
Found potential project match: MasterData management
Using project: MasterData management (encoded: MasterData%20management)
Getting repository info for MasterData in project MasterData management
Error during ADO API operations: Request failed with status code 404
```

The issue is that the repository name stored in our system (`MasterData`) doesn't match the actual repository name in Azure DevOps (`MasterData management`).

## Root Cause

1. When the AI job processor finds a project that partially matches the repository name, it correctly identifies `MasterData management` as the project
2. However, it then looks for a repository called `MasterData` within that project
3. This fails with a 404 error because the repository is actually named `MasterData management` (same as the project)

## Solution

I've created a repository matcher utility that will:

1. First try to find the repository using the original name
2. If that fails, try using the project name as the repository name
3. If that fails, list all repositories in the project and find the best match
4. Return the correctly matched repository information for all subsequent API calls

This approach handles several scenarios:

- Repository name matches the project name
- Repository name is different from project name
- Repository name is a partial match with the project name

## Implementation Files

1. `scripts/ado-repository-matcher.js` - The repository matching utility
2. `scripts/update-repository-matcher.js` - Instructions for updating `process-ai-jobs.ts`

## How to Implement

To fix the issue, modify your `process-ai-jobs.ts` file to use the new repository matcher:

1. Add this require at the top of your file:

   ```javascript
   const { findMatchingRepository } = require("./ado-repository-matcher.js");
   ```

2. Replace the repository lookup code with:

   ```javascript
   // Get repository info with project name specified
   log(
     `Getting repository info for ${repositoryName} in project ${adoProjectName}`
   );

   const repoInfo = await findMatchingRepository(
     adoApi,
     adoProjectName,
     repositoryName,
     encodedProjectName,
     encodedRepoName
   );

   // Update variables with the matched repository information
   const actualRepoName = repoInfo.repositoryName;
   const actualEncodedRepoName = repoInfo.encodedRepoName;
   const repositoryId = repoInfo.repositoryId;
   const defaultBranch = repoInfo.defaultBranch;
   const projectName = repoInfo.projectName;
   ```

3. Update all subsequent API calls to use `actualEncodedRepoName` instead of `encodedRepoName`

4. After deployment, test with:
   ```bash
   cd /var/www/echoops
   node scripts/test-repo-with-spaces.js "MasterData"
   ```

This will ensure that we find the correct repository regardless of naming discrepancies between our system and Azure DevOps.
