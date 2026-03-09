# Handling Empty Repositories in Azure DevOps

## Issue

The error log shows that the AI job processor fails with repositories that exist in Azure DevOps but don't have any branches with commits. The system tries multiple branch names (master, main, develop, etc.) but all return 404 errors because the repository is empty.

## Root Cause Analysis

When a repository is first created in Azure DevOps, it might be completely empty without any branches. The Azure DevOps API reports a default branch (usually `refs/heads/master`), but this branch doesn't actually exist yet until a first commit is made.

The original code assumes that at least one of the standard branch names exists and has commits, but this isn't always the case with newly created repositories.

## Solution: Repository Initialization Script

A new script has been created to handle empty repositories:

1. **Script Location**: `/root/portavi/scripts/handle-empty-repos.js`

2. **Purpose**: This script:

   - Identifies empty repositories
   - Creates an initial commit with a README.md file
   - Creates a 'main' branch
   - Resets the failed job to PENDING status so it can be processed again

3. **Usage**:
   ```bash
   # From project root directory
   node scripts/handle-empty-repos.js JOB_ID
   ```
   Where `JOB_ID` is the ID of the failed job (e.g., "cmav7nkuw00016ca9wcvv7f7r")

## Example

If you see an error like:

```
Branch detection failed. Tried: ["refs/heads/master: Request failed with status code 404"..."refs/heads/production: Request failed with status code 404"]
Error during ADO API operations: Could not find a valid branch with commits in this repository. Tried: refs/heads/master, refs/heads/main...
```

Run:

```bash
node scripts/handle-empty-repos.js cmav7nkuw00016ca9wcvv7f7r
```

The script will:

1. Create an initial commit in the repository
2. Reset the job status from FAILED to PENDING
3. The job processor will pick up the job in the next polling cycle

## Long-term Solution

For a more permanent solution, the core job processor code should be updated to:

1. Detect when a repository exists but is empty
2. Automatically create an initial commit and branch
3. Continue with the PR creation process

This would eliminate the need for manual intervention when empty repositories are encountered.

## Testing

After running the script, you should:

1. Monitor the job processor logs:

   ```bash
   tail -f /root/portavi/scripts/process-ai-jobs.log
   ```

2. Verify that the job is picked up and processed successfully
   ```bash
   node scripts/test-repo-with-spaces.js "Repository Name"
   ```
