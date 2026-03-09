# Azure DevOps Repository Name Fix

This document details the fix for handling repository names with spaces in Azure DevOps API calls.

## Problem Summary

The AI job processor was failing to create branches and pull requests in Azure DevOps repositories that had spaces in their names (e.g., "MasterData management"). This occurred because of two main issues:

1. The repository name was not being URL-encoded when used in API calls
2. Azure DevOps API requires a project name to be specified when referencing repositories by name

This resulted in 400 Bad Request errors with the message: "A project name is required in order to reference a Git repository by name."

## Fix Implementation

1. **URL Encoding for Repository Names**:
   - Modified `process-ai-jobs.ts` to URL-encode repository names in all Azure DevOps API calls
   - Added detailed error logging to capture specific API response details

2. **Project Name Resolution**:
   - Added code to retrieve available projects from the Azure DevOps organization
   - Implemented logic to find the appropriate project for the repository:
     - First try exact project name matches
     - Then try substring matches between repository and project names
     - Fallback to using the first available project
   - Updated all API calls to include the project name in the path

3. **Testing and Validation**:
   - Created a test script `test-repo-with-spaces.js` to specifically test repositories with spaces in names
   - Added utility `reset-failed-jobs-with-spaces.js` to easily reset failed jobs with spaces in repository names

4. **Deployment Script**:
   - Enhanced `update-pr-url-format.sh` to include new testing capabilities and better error handling
   - Added TypeScript compilation support with fallbacks

## How to Deploy

1. Run the deployment script:

   ```bash
   cd /root/portavi
   ./scripts/update-pr-url-format.sh
   ```

2. Test the fix:

   ```bash
   cd /var/www/portavi
   node scripts/test-repo-with-spaces.js
   ```

3. If there are previously failed jobs with spaces in repository names, reset them:
   ```bash
   cd /var/www/portavi
   node scripts/reset-failed-jobs-with-spaces.js
   ```

## Troubleshooting

If issues persist:

1. Check the AI job processor logs:

   ```bash
   tail -f /var/www/portavi/scripts/process-ai-jobs.log
   ```

2. Verify the service is running:

   ```bash
   systemctl status ai-job-processor.service
   ```

3. If needed, restart the service:
   ```bash
   systemctl restart ai-job-processor.service
   ```

## Technical Details

The key changes were:

1. URL encoding repository names:

```javascript
const encodedRepoName = encodeURIComponent(repositoryName);
```

2. Finding the appropriate project for the repository:

```javascript
// Get projects list to find the matching project
const projectsResponse = await adoApi.get(
  `/_apis/projects?api-version=7.0`
);

// Find the project that contains or matches the repository name
let adoProjectName = null;
const projects = projectsResponse.data.value;

// Look for an exact match first
const exactMatch = projects.find(p => p.name === repositoryName);
if (exactMatch) {
  adoProjectName = exactMatch.name;
} else {
  // Try to find a matching project or use the first project
  const potentialMatches = projects.filter(p => 
    repositoryName.includes(p.name) || p.name.includes(repositoryName)
  );
  
  if (potentialMatches.length > 0) {
    adoProjectName = potentialMatches[0].name;
  } else if (projects.length > 0) {
    adoProjectName = projects[0].name;
  }
}
```

3. Using the project name in API calls:

```javascript
const encodedProjectName = encodeURIComponent(adoProjectName);
const repoResponse = await adoApi.get(
  `/${encodedProjectName}/_apis/git/repositories/${encodedRepoName}?api-version=7.0`
);
```

These fixes ensure that repositories with spaces in their names will work correctly with the Azure DevOps API.
