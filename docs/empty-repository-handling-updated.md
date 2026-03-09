# Azure DevOps Empty Repository Handling

This documentation explains how our enhanced Azure DevOps integration now handles repositories, including those with few or no branches.

## The Problem

Our previous implementation tried to get commits from a branch directly, which would fail with a 404 error if:

1. The repository exists but is empty
2. The branch exists but has no commits
3. The branch name returned by the API doesn't match what's actually in the repository

## The Solution

We've completely revamped the API flow to better align with Azure DevOps REST API best practices:

1. **Get Repository Info First**

   - Get the repository by name and extract the repository ID
   - This ID is used in all subsequent API calls

2. **Get All Branch References**

   - Instead of assuming branches based on name, we get the complete list of refs
   - This lets us see what branches actually exist regardless of naming

3. **Smart Branch Selection**

   - Try the default branch from the API first
   - If that fails, check other common branch names: main, master, develop, etc.
   - Use the first branch we find that exists

4. **Automatic Empty Repository Initialization**

   - If no branches with commits are found, the system detects the repository is empty
   - The system automatically initializes the repository with a README.md file
   - Creates a main branch with the initial commit
   - Proceeds with the workflow using the newly created branch

5. **Create Branch with Reference**

   - Create new branches using branch object IDs instead of commit IDs
   - This is more reliable and matches the Azure DevOps API expectations

6. **Enhanced Error Handling**
   - Detailed error logging with response data when API calls fail
   - Clear error messages about which part of the process failed

## API Flow

The correct flow for working with Azure DevOps repositories:

1. Get repository info and extract repository ID
2. Get all refs (branches) for the repository
3. Find an existing branch to use as the source
4. Create a new branch based on that source branch
5. Push content to the new branch
6. Create a PR from the new branch to the source branch

## Testing

To test with repositories that have spaces in their names or unusual branch configurations:

```bash
cd /var/www/portavi
node scripts/test-repo-with-spaces.js "Your Repository Name"
```

To test the automatic empty repository initialization:

```bash
cd /var/www/portavi
node scripts/test-empty-repo-initialization.js "EmptyTestRepo"
```

## Error Recovery

If you encounter jobs that failed due to these issues, you can reset them:

```bash
# Reset all failed jobs with spaces in repository names
cd /var/www/portavi
node scripts/reset-failed-jobs-with-spaces.js

# Reset a specific job by ID
cd /var/www/portavi
node scripts/reset-failed-jobs-with-spaces.js YOUR_JOB_ID
```

For empty repositories specifically, you can also use the handle-empty-repos.js script:

```bash
# Initialize an empty repository and reset a failed job
cd /var/www/portavi
node scripts/handle-empty-repos.js YOUR_JOB_ID
```

This will:

1. Initialize the empty repository with a README.md file
2. Reset the job to PENDING status for reprocessing
