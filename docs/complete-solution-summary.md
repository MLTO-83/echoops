# Azure DevOps Repository Name Handling - Complete Solution

## Problem Overview

The Portavi AI job processor was experiencing three key issues:

1. **Permission Issue**: Users who were not project members couldn't retry failed AI jobs
2. **Repository Name Handling Issue**: AI jobs failed when repository names contained spaces
3. **Branch Name Detection Issue**: Default branch names reported by the API didn't always exist in repositories

## Solution Implemented

### 1. Permission Fix for AI Job Retry

We modified the API route that handles retrying failed AI jobs to remove the strict project membership check:

```javascript
// Before: Required project membership
const projectMember = await prisma.projectMember.findFirst({
  where: {
    projectId: projectId,
    userId: session.user.id as string,
  },
});

if (!projectMember) {
  return NextResponse.json(
    { error: "You do not have access to this project" },
    { status: 403 }
  );
}

// After: Only check if project exists
const project = await prisma.project.findUnique({
  where: { id: projectId },
  select: { id: true }
});

if (!project) {
  return NextResponse.json(
    { error: "Project not found" },
    { status: 404 }
  );
}
```

We also added `dynamic = "force-dynamic"` to ensure the API route isn't cached.

### 2. Repository Name Handling Fix

The Azure DevOps API integration was failing because:

- Repository names with spaces weren't being URL-encoded
- The API required a project name to be specified in the URL path

We implemented a comprehensive solution:

1. **URL Encoding for Repository Names**:

   ```javascript
   const encodedRepoName = encodeURIComponent(repositoryName);
   ```

2. **Project Name Discovery**:

   ```javascript
   // Get projects list
   const projectsResponse = await adoApi.get(`/_apis/projects?api-version=7.0`);

   // Find matching project using smart selection logic
   const exactMatch = projects.find((p) => p.name === repositoryName);
   if (exactMatch) {
     adoProjectName = exactMatch.name;
   } else {
     // Try substring matches or use first project
     // ...
   }
   ```

3. **Updated API Calls**:

   ```javascript
   // Before
   `/_apis/git/repositories/${repositoryName}/...` // After
   `/${encodedProjectName}/_apis/git/repositories/${encodedRepoName}/...`;
   ```

4. **Enhanced Error Logging**:
   ```javascript
   if (adoError.response) {
     log(`Response status: ${adoError.response.status}`);
     log(`Response data: ${JSON.stringify(adoError.response.data, null, 2)}`);
     if (adoError.response.config && adoError.response.config.url) {
       log(`URL that failed: ${adoError.response.config.url}`);
     }
   }
   ```

### 3. Branch Name Detection Fix

Many repositories are now using `main` instead of `master` as the default branch, or using different branch naming conventions altogether. Our code was failing when it couldn't find the default branch reported by the API.

We implemented a smart branch detection system:

1. **Try Multiple Branch Names**:

   ```javascript
   // Try different branch names in order
   const branchNamesToTry = [
     defaultBranch, // API default (often refs/heads/master)
     "refs/heads/main", // Common alternative
     "refs/heads/master", // Traditional name
     "refs/heads/develop", // GitFlow standard
     "refs/heads/development", // Another common name
     "refs/heads/release", // Sometimes used as base
   ];
   ```

2. **Iterative Branch Testing**:

   ```javascript
   // Try each branch until we find one that works
   for (const branchToTry of branchNamesToTry) {
     try {
       const commitsResponse = await adoApi.get(
         `/${encodedProjectName}/_apis/git/repositories/${encodedRepoName}/commits?searchCriteria.itemVersion.version=${branchToTry}&api-version=7.0`
       );

       if (commitsResponse.data && commitsResponse.data.value.length > 0) {
         latestCommitId = commitsResponse.data.value[0].commitId;
         successfulBranch = branchToTry;
         break;
       }
     } catch (branchError) {
       // Try next branch
     }
   }
   ```

3. **Use Successful Branch for PR**:
   ```javascript
   // Create PR using the branch we found
   const createPrResponse = await adoApi.post(
     `/${encodedProjectName}/_apis/git/repositories/${encodedRepoName}/pullrequests?api-version=7.0`,
     {
       sourceRefName: `refs/heads/${branchName}`,
       targetRefName: successfulBranch,
       // ...
     }
   );
   ```

### 4. Utility Scripts

1. **Test Script for Repositories with Spaces**:

   - Created `test-repo-with-spaces.js` to test the fix with space-containing repository names
   - Added support for testing with custom repository names

2. **Reset Failed Jobs**:
   - Created `reset-failed-jobs-with-spaces.js` to identify and reset previously failed jobs
   - Added filters to specifically target jobs with spaces in repository names

### 4. Deployment Automation

1. **Update Script Enhancement**:

   - Enhanced TypeScript compilation
   - Added better error handling and logging
   - Included file copying for new utility scripts

2. **Dedicated Deployment Script**:
   - Created `deploy-repository-name-fix.sh` to streamline the deployment process
   - Includes steps to test the fix and verify service status

### 5. Documentation

1. **Updated Existing Documentation**:

   - `ai-job-processor-deployment.md`: Added information about recent fixes
   - `README-AI-JOB-PROCESSOR.md`: Added section on repository name handling

2. **New Documentation**:
   - `repository-name-fix.md`: Detailed technical explanation of the fix
   - `repository-name-fix-summary.md`: Summary of implementation decisions

## Verification Process

1. Manually reset failed jobs with repository names containing spaces
2. Test the fix with specific repository names to verify it works
3. Monitor the logs to ensure proper API call formatting and project name selection
4. Verify proper URL encoding of repository names in both API calls and PR URLs

## Future Improvements

1. Store project name alongside repository name in the database for direct mapping
2. Add UI validation for repository names to warn about potential issues
3. Create automated tests for the ADO integration with various repository name formats
4. Enhance logging with structured data for better debugging capabilities
