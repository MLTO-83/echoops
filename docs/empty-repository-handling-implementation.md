# Empty Repository Automatic Initialization

This document describes the implementation of automatic initialization for empty repositories in the Portavi AI Agent.

## Problem Description

Previously, when the AI job processor encountered an Azure DevOps repository that existed but had no branches with commits (an empty repository), it would fail with 404 errors. This required manual intervention using the `handle-empty-repos.js` script to initialize the repository before the job could be processed.

## Implemented Solution

We've enhanced the AI job processor to automatically detect and initialize empty repositories during job processing. Now, when the system encounters a repository with no branches or commits, it:

1. Automatically creates a new `main` branch
2. Adds a README.md file with basic repository information
3. Proceeds with the normal workflow using the newly initialized repository

### Technical Implementation

The solution consists of two main components:

1. **Empty Repository Detection**: During branch detection, the system now properly identifies when a repository exists but has no branches with commits.

2. **Automatic Initialization Function**: A new `initializeEmptyRepository` function was added that creates an initial commit with a README.md file in the repository.

```typescript
/**
 * Initialize an empty repository with a README.md file
 * This is needed when a repository exists but doesn't have any branches or commits
 */
async function initializeEmptyRepository(
  adoApi,
  encodedProjectName,
  encodedRepoName,
  repositoryName
) {
  try {
    log(`Attempting to initialize empty repository: ${repositoryName}`);

    // Create an initial commit with a README.md file on the main branch
    const initialCommitResponse = await adoApi.post(
      `/${encodedProjectName}/_apis/git/repositories/${encodedRepoName}/pushes?api-version=7.0`,
      {
        refUpdates: [
          {
            name: "refs/heads/main",
            oldObjectId: "0000000000000000000000000000000000000000",
          },
        ],
        commits: [
          {
            comment: "Initial repository setup",
            changes: [
              {
                changeType: "add",
                item: {
                  path: "/README.md",
                },
                newContent: {
                  content: `# ${repositoryName}\n\nThis repository was initialized for use with Portavi AI Agent.`,
                  contentType: "rawtext",
                },
              },
            ],
          },
        ],
      }
    );

    if (
      !initialCommitResponse.data ||
      !initialCommitResponse.data.commits ||
      initialCommitResponse.data.commits.length === 0
    ) {
      log("Failed to create initial commit");
      return null;
    }

    const commitId = initialCommitResponse.data.commits[0].commitId;
    log(`Successfully initialized repository. Commit ID: ${commitId}`);
    return commitId;
  } catch (error) {
    log(`Error initializing repository: ${error.message}`);
    if (error.response) {
      log(`Response status: ${error.response.status}`);
      log(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return null;
  }
}
```

3. **Integration with Branch Detection Flow**: The function is called when all branch attempts fail, and the system detects that the repository might be empty:

```typescript
if (!latestCommitId) {
  log(`Branch detection failed. Tried: ${JSON.stringify(branchErrors)}`);
  log(`Repository appears to be empty. Attempting to initialize it...`);

  // Try to initialize the repository with a README.md file
  const initialCommitId = await initializeEmptyRepository(
    adoApi,
    encodedProjectName,
    actualEncodedRepoName,
    actualRepoName
  );

  if (initialCommitId) {
    log(
      `Successfully initialized repository with commit ID: ${initialCommitId}`
    );
    latestCommitId = initialCommitId;
    successfulBranch = "refs/heads/main"; // We created a main branch
  } else {
    // If initialization fails, throw the original error
    throw new Error(
      `Could not find a valid branch with commits in this repository and initialization failed. Tried: ${branchNamesToTry.join(", ")}`
    );
  }
}
```

## Testing in Production

Since testing locally requires production credentials, follow these steps to verify the implementation in production:

1. **Deploy the updated code**:

   ```bash
   # Deploy the updated AI job processor code
   cd /var/www/portavi
   cp scripts/process-ai-jobs.js /var/www/portavi/scripts/

   # Restart the AI job processor service
   systemctl restart ai-job-processor.service
   ```

2. **Create an empty repository** in Azure DevOps without initializing it with a README

3. **Create a test job targeting the empty repository**:

   ```bash
   cd /var/www/portavi
   node -e "require('./scripts/test-ai-job-processor').createTestJob('EmptyTestRepo')"
   ```

4. **Monitor the AI job processor logs**:

   ```bash
   tail -f /var/www/portavi/scripts/process-ai-jobs.log
   ```

5. **Expected log output** - You should see messages like:

   ```
   Branch detection failed. Tried: [...]
   Repository appears to be empty. Attempting to initialize it...
   Attempting to initialize empty repository: EmptyTestRepo
   Successfully initialized repository. Commit ID: [COMMIT_ID]
   ```

6. **Verify in Azure DevOps** that the repository now has:
   - A main branch
   - A README.md file
   - The AI-generated code file
   - A pull request

## Fallback Process

If issues occur with automatic initialization, the manual process is still available:

```bash
# For handling specific failed jobs that need repository initialization
node scripts/handle-empty-repos.js JOB_ID
```

## Considerations

1. **Permission Requirements**: The service account needs permissions to:

   - Read repository information
   - Create branches
   - Push commits
   - Create pull requests

2. **API Limits**: Azure DevOps has API rate limits; initializing many repositories simultaneously could hit these limits.

3. **Error Handling**: If repository initialization fails, the job will be marked as failed with detailed error information.
