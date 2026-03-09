# Repository Name Mismatch Fix Implementation

## Overview

This document describes the implementation of the fix for handling repository name mismatches between Azure DevOps (ADO) and the EchoOps system.

## Implementation Details

### Files Modified

1. `/root/echoops/scripts/process-ai-jobs.js`
   - Added the repository matcher utility import
   - Replaced the direct repository lookup with the matcher function
   - Updated all API calls to use the matched repository name

### Files Created/Used

1. `/root/echoops/scripts/ado-repository-matcher.js`

   - Contains the core repository matching logic
   - Tries multiple fallback approaches to find the correct repository

2. `/root/echoops/scripts/test-repository-matcher.js`

   - Test script to verify the repository matcher functionality
   - Includes multiple test cases for different matching scenarios

3. `/root/echoops/scripts/deploy-repository-name-fix-v2.sh`
   - Deployment script for the repository name mismatch fix

## How It Works

The repository matcher uses the following strategy to find the correct repository:

1. First, it tries to find a repository with the exact name provided
2. If that fails, it tries using the project name as the repository name
3. If that fails, it lists all repositories and finds the best match based on name similarity

For each API call in the `process-ai-jobs.js` file, we now use the matched repository name and ID instead of assuming the repository name matches exactly what's stored in our system.

## Key Changes

The key change is in the repository lookup code:

```javascript
// Before:
repoResponse = await adoApi.get(
  `/${encodedProjectName}/_apis/git/repositories/${encodedRepoName}?api-version=7.0`
);

// After:
const repoInfo = await findMatchingRepository(
  adoApi,
  adoProjectName,
  repositoryName,
  encodedProjectName,
  encodedRepoName
);

const actualEncodedRepoName = repoInfo.encodedRepoName;
```

All subsequent API calls now use `actualEncodedRepoName` instead of `encodedRepoName`.

## Testing

To test the implementation, run:

```bash
node /root/echoops/scripts/test-repository-matcher.js
```

This will validate the repository matcher utility with various test cases.

## Deployment

To deploy the fix, run:

```bash
/root/echoops/scripts/deploy-repository-name-fix-v2.sh
```

## Rollback

If needed, you can restore the backup file created during deployment:

```bash
cp /root/echoops/scripts/process-ai-jobs.js.bak-TIMESTAMP /root/echoops/scripts/process-ai-jobs.js
```

Replace `TIMESTAMP` with the appropriate backup timestamp.
