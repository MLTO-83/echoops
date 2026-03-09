# Azure DevOps Branch Creation Test Server

This standalone HTTP server isolates and tests **Step 3** of the Azure DevOps integration: repository lookup and branch creation. It helps debug whether issues are in project/repository lookup or branch creation specifically.

## What This Tests

The server performs these exact steps:

1. **Project Lookup**: Find the specified project by name using the ADO REST API
2. **Repository Lookup**: Find the specified repository within that project
3. **Default Branch Detection**: Get the default branch and its latest commit ID
4. **Feature Branch Creation**: Create a new feature branch off the default branch

## Prerequisites

- Node.js installed
- Access to an Azure DevOps organization
- A Personal Access Token (PAT) with appropriate permissions
- An existing project and repository in Azure DevOps

## Required PAT Permissions

Your Personal Access Token needs these permissions:

- **Code (read & write)**: To access repositories and create branches
- **Project and team (read)**: To list projects

## Quick Start

### 1. Start the Server

```bash
cd /root/portavi/scripts
node test-ado-branch-creation-server.js
```

The server will start on `http://localhost:3001` and display usage instructions.

### 2. Test with curl

```bash
curl -X POST http://localhost:3001/test-branch-creation \
  -H "Content-Type: application/json" \
  -d '{
    "pat": "your-personal-access-token",
    "organizationUrl": "https://dev.azure.com/yourorg",
    "projectName": "Your Project Name",
    "repositoryName": "your-repo-name",
    "featureBranchName": "feature/test-branch-123"
  }'
```

### 3. Use the Interactive Script

For easier testing, use the provided interactive script:

```bash
./test-ado-branch-creation.sh
```

This script will:

- Check if the server is running
- Prompt you for all required parameters
- Make the test request
- Display formatted results

## API Reference

### POST /test-branch-creation

Creates a feature branch in the specified Azure DevOps repository.

**Request Body:**

```json
{
  "pat": "string", // Personal Access Token
  "organizationUrl": "string", // e.g., "https://dev.azure.com/yourorg"
  "projectName": "string", // Project name (not GUID)
  "repositoryName": "string", // Repository name
  "featureBranchName": "string" // New branch name (with or without refs/heads/)
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Branch creation test completed successfully",
  "results": {
    "steps": {
      "projectLookup": {
        "success": true,
        "projectId": "12345678-1234-5678-9012-123456789012",
        "projectName": "Your Project",
        "projectDescription": "Project description"
      },
      "repositoryLookup": {
        "success": true,
        "repositoryId": "abcd1234-5678-90ef-ghij-klmnopqrstuv",
        "repositoryName": "your-repo",
        "repositoryUrl": "https://dev.azure.com/yourorg/project/_git/repo",
        "defaultBranch": "refs/heads/main"
      },
      "defaultBranchDetection": {
        "success": true,
        "branchName": "main",
        "branchRef": "refs/heads/main",
        "commitId": "abc123def456..."
      },
      "branchCreation": {
        "success": true,
        "branchName": "feature/test-branch-123",
        "branchRef": "refs/heads/feature/test-branch-123",
        "commitId": "abc123def456...",
        "baseCommitId": "abc123def456..."
      }
    },
    "timing": {
      "projectLookup": 250,
      "repositoryLookup": 180,
      "defaultBranchDetection": 120,
      "branchCreation": 300,
      "total": 850
    },
    "success": true
  }
}
```

**Error Response (400/500):**

```json
{
  "success": false,
  "error": "Error description",
  "details": {
    "steps": {
      // Results of completed steps before failure
    },
    "timing": {
      // Timing data for completed steps
    }
  }
}
```

### GET /health

Health check endpoint.

**Response (200):**

```json
{
  "status": "healthy",
  "timestamp": "2025-05-31T12:00:00.000Z",
  "service": "ADO Branch Creation Test Server"
}
```

## Common Issues and Solutions

### 1. Project Not Found

**Error**: `Project 'ProjectName' not found`
**Solution**:

- Verify the project name is exact (case-sensitive)
- Check that your PAT has access to the project
- List available projects in the error response

### 2. Repository Not Found

**Error**: `Repository 'repo-name' not found`
**Solution**:

- Verify the repository name is exact
- Check the list of available repositories in the error response
- Ensure the repository exists in the specified project

### 3. Authentication Failed

**Error**: HTTP 401 or 403
**Solution**:

- Verify your PAT is valid and not expired
- Check PAT permissions include "Code (read & write)"
- Ensure the organization URL is correct

### 4. Branch Already Exists

**Error**: HTTP 409 `Branch already exists`
**Solution**:

- Use a different branch name
- This is expected behavior if testing repeatedly
- The test shows the API is working correctly

### 5. No Default Branch

**Error**: `Repository has no branches`
**Solution**:

- The repository might be empty (no commits)
- Initialize the repository with at least one commit
- Check if the repository was recently created

## Example Test Session

```bash
# Start the server
$ node test-ado-branch-creation-server.js
[2025-05-31T12:00:00.000Z] [INFO] 🚀 ADO Branch Creation Test Server running on http://localhost:3001

# In another terminal, run the test
$ ./test-ado-branch-creation.sh
=== Azure DevOps Branch Creation Test Script ===

✅ Server is running

Please provide the following information:
Personal Access Token (PAT): [hidden]
Organization URL: https://dev.azure.com/myorg
Project Name: MyProject
Repository Name: my-repo
Feature Branch Name: feature/test-isolation-123

Making test request...

=== Test Results ===
HTTP Status: 200

✅ SUCCESS: Branch creation test passed!

Response:
{
  "success": true,
  "message": "Branch creation test completed successfully",
  "results": {
    "steps": {
      "projectLookup": {
        "success": true,
        "projectId": "12345678-1234-5678-9012-123456789012",
        "projectName": "MyProject"
      },
      "repositoryLookup": {
        "success": true,
        "repositoryId": "abcd1234-5678-90ef-ghij-klmnopqrstuv",
        "repositoryName": "my-repo"
      },
      "defaultBranchDetection": {
        "success": true,
        "branchName": "main",
        "commitId": "abc123def456..."
      },
      "branchCreation": {
        "success": true,
        "branchName": "feature/test-isolation-123",
        "branchRef": "refs/heads/feature/test-isolation-123"
      }
    },
    "timing": {
      "total": 850
    },
    "success": true
  }
}

=== Test Complete ===
```

## Integration with Main Codebase

Once this test server confirms that branch creation works correctly, you can:

1. **Compare API calls**: The server shows exactly which API endpoints and payloads work
2. **Verify authentication**: Confirm your PAT and organization setup is correct
3. **Debug specific steps**: See which step fails in your main integration
4. **Validate parameters**: Ensure project names, repo names, and branch names are formatted correctly

The server uses the same Azure DevOps REST API calls that your main integration should use, so successful tests here indicate the API approach is correct.

## Troubleshooting

### Server Won't Start

- Check if port 3001 is already in use: `lsof -i :3001`
- Try a different port by modifying the `PORT` constant in the server file

### curl Command Issues

- Ensure JSON is properly escaped in your shell
- Use the interactive script instead of manual curl
- Check that the server is running with `curl http://localhost:3001/health`

### API Timeout

- The server has a 30-second timeout for ADO API calls
- Check your network connection to Azure DevOps
- Verify the organization URL is accessible

This test server provides isolated testing of the critical Azure DevOps branch creation functionality, helping you identify exactly where issues occur in the integration process.
