# Azure DevOps API Flow for Pull Request Creation

The proper flow for working with Azure DevOps repositories and creating pull requests should follow these steps:

## 1. Get Repository Information

```javascript
// Get repository info with project name specified
const repoResponse = await adoApi.get(
  `/${encodedProjectName}/_apis/git/repositories/${encodedRepoName}?api-version=7.0`
);

// Extract repository ID for future API calls
const repositoryId = repoResponse.data.id;
```

## 2. Get Default Branch Reference

Instead of trying to get commits immediately, first check if the branch exists:

```javascript
// Get refs (branches) directly
const refsResponse = await adoApi.get(
  `/${encodedProjectName}/_apis/git/repositories/${repositoryId}/refs?api-version=7.0`
);

// Find the default branch ref
const defaultBranchRef = refsResponse.data.value.find(
  (ref) => ref.name === defaultBranch
);
```

## 3. Create a New Branch

Use the branch object ID directly:

```javascript
// Create a new branch from the default branch
const createBranchResponse = await adoApi.post(
  `/${encodedProjectName}/_apis/git/repositories/${repositoryId}/refs?api-version=7.0`,
  {
    name: `refs/heads/${branchName}`,
    oldObjectId: "0000000000000000000000000000000000000000",
    newObjectId: defaultBranchRef.objectId,
  }
);
```

## 4. Push Content to New Branch

After creating the branch, push content to it:

```javascript
// Create a file with the generated code
const createFileResponse = await adoApi.post(
  `/${encodedProjectName}/_apis/git/repositories/${repositoryId}/pushes?api-version=7.0`,
  {
    refUpdates: [
      {
        name: `refs/heads/${branchName}`,
        oldObjectId: branchRef.objectId,
      },
    ],
    commits: [
      {
        comment: "AI generated code",
        changes: [
          {
            changeType: "add",
            item: {
              path: "/ai-generated-code.md",
            },
            newContent: {
              content: generatedCode,
              contentType: "rawtext",
            },
          },
        ],
      },
    ],
  }
);
```

## 5. Create PR Between Branches

Finally, create a PR from the new branch to the default branch:

```javascript
// Create a PR
const createPrResponse = await adoApi.post(
  `/${encodedProjectName}/_apis/git/repositories/${repositoryId}/pullrequests?api-version=7.0`,
  {
    sourceRefName: `refs/heads/${branchName}`,
    targetRefName: defaultBranch,
    title: `AI generated code for ${branchName}`,
    description:
      "This pull request contains AI generated code based on the provided instructions.",
  }
);
```

## Key Differences from Current Implementation

1. Use repository ID from repository response in subsequent calls
2. Get branch references directly instead of trying to get commits
3. Work with the branch objectId rather than commit IDs
4. Ensure proper sequence of API calls following Azure DevOps REST API requirements

This approach is more aligned with how Azure DevOps expects API interactions for repository operations.
