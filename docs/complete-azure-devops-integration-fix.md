# Complete Azure DevOps Integration Fix

This document summarizes all the fixes implemented to ensure smooth Azure DevOps integration in the Portavi application.

## Issues Fixed

1. **Permission Issue**

   - Non-project members couldn't retry failed AI jobs
   - Fixed by removing strict project membership check in retry API

2. **Repository Name Handling**

   - Repositories with spaces in names failed with 400 Bad Request errors
   - Fixed by proper URL encoding of repository names
   - Added project name discovery and specification in API calls

3. **Branch Name Detection**
   - Default branch (typically `master`) didn't exist in some repositories
   - Fixed by implementing smart branch detection that tries multiple common branch names
   - Now supports repositories using `main`, `develop`, or other branch naming conventions

## Technical Implementation Details

### 1. Permission Fix

```javascript
// Before: Required project membership
const projectMember = await prisma.projectMember.findFirst({
  where: {
    projectId: projectId,
    userId: session.user.id,
  },
});

// After: Only check if project exists
const project = await prisma.project.findUnique({
  where: { id: projectId },
  select: { id: true },
});
```

### 2. Repository Name Handling

```javascript
// Before
const repoResponse = await adoApi.get(
  `/_apis/git/repositories/${repositoryName}?api-version=7.0`
);

// After
const encodedRepoName = encodeURIComponent(repositoryName);
const projectsResponse = await adoApi.get(`/_apis/projects?api-version=7.0`);
// Find appropriate project with smart matching
const encodedProjectName = encodeURIComponent(adoProjectName);
const repoResponse = await adoApi.get(
  `/${encodedProjectName}/_apis/git/repositories/${encodedRepoName}?api-version=7.0`
);
```

### 3. Branch Name Detection

```javascript
// Try multiple branch names in order
const branchNamesToTry = [
  defaultBranch, // API default
  "refs/heads/main", // Common alternative
  "refs/heads/master", // Traditional name
  "refs/heads/develop", // GitFlow standard
  // Additional fallbacks...
];

// Try each branch until we find one that works
for (const branchToTry of branchNamesToTry) {
  // Try to get commits from this branch
  // Use the first successful branch
}
```

## Testing and Verification

### Test Commands

```bash
# Test basic functionality
node scripts/test-ai-job-processor.js

# Test with repository name containing spaces
node scripts/test-repo-with-spaces.js

# Test with specific repository name
node -e "require('./scripts/test-repo-with-spaces.js').testWithCustomRepo('Your Repository Name')"
```

### Monitoring

```bash
# View logs to confirm API calls are working
tail -f /var/www/portavi/scripts/process-ai-jobs.log

# Check service status
systemctl status ai-job-processor.service
```

## Deployment

Deploy all fixes with a single command:

```bash
sudo bash /root/portavi/deploy-repository-name-fix.sh
```

## Future Improvements

1. Store project name alongside repository name in the database
2. Add UI validation for repository names
3. Create automated tests for ADO integration
4. Add a mechanism to specify target branch in the UI
