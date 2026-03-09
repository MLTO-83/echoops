# Branch Name Detection Enhancement

## Problem Summary

When creating pull requests in Azure DevOps repositories, we encountered an issue where the default branch name reported by the API (typically `refs/heads/master`) doesn't always exist in the actual repository.

This led to errors like:

```
TF401175: The version descriptor <Branch: refs/heads/master> could not be resolved to a version in the repository MasterData management
```

This occurs because many repositories have moved to using `main` instead of `master` as their default branch, or use other branch naming conventions entirely.

## Solution Implementation

We've enhanced the branch detection logic to try multiple common branch names when the default branch doesn't work:

1. **Smart Branch Detection**:

   - First try the default branch reported by the API
   - Then try common alternatives in order: `main`, `master`, `develop`, `development`, `release`
   - Use the first branch that successfully returns commits

2. **Error Handling**:

   - Catch errors for each branch attempt instead of failing immediately
   - Log detailed information about which branches were tried
   - Only throw an error if all branch options are exhausted

3. **Pull Request Creation**:
   - Use the successful branch as the target for the pull request
   - This ensures we always create PRs against a valid branch

## Code Implementation

```javascript
// Try different branch names if the default branch doesn't work
const branchNamesToTry = [
  defaultBranch, // Try the default branch first
  "refs/heads/main", // Many repos use main instead of master
  "refs/heads/master", // Traditional default branch name
  "refs/heads/develop", // Common for GitFlow
  "refs/heads/development", // Another common name
  "refs/heads/release", // Sometimes used as base
];

let latestCommitId = null;
let successfulBranch = null;

// Try each branch name until we find one that works
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
    // Continue to the next branch in the list
  }
}
```

## Testing

To test this enhancement, run:

```bash
node -e "require('./scripts/test-repo-with-spaces.js').testWithCustomRepo('MasterData management')"
```

The script will now try multiple branches and should succeed as long as at least one valid branch with commits exists in the repository.
