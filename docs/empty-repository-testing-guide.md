# Empty Repository PR Flow Fix - Testing Guide

This document explains how to test the enhanced empty repository initialization flow.

## What the Fix Does

The fix addresses issues when creating pull requests in Azure DevOps repositories that:

1. Exist but have no commits (empty repositories)
2. Have branches that exist but contain no commits
3. Experience 409 conflict errors during initialization

## Testing Steps

### Preparation

1. Log into Azure DevOps and create a new repository
   - **Important**: Do NOT initialize the repository with a README or .gitignore
   - The repository should exist but be completely empty

### Test Process

1. SSH into the EchoOps server
2. Run the test script with your empty repository name:

   ```bash
   /root/echoops/scripts/test-empty-repo-fix.sh "YourEmptyRepoName"
   ```

3. The script will:

   - Create a test job targeting your empty repository
   - Wait for the AI job processor to handle it
   - Display the results (success or failure)

4. Monitor the process by viewing the logs:
   ```bash
   tail -f /root/echoops/scripts/process-ai-jobs.log
   ```

### Expected Results

- The AI job processor should successfully initialize the empty repository
- A commit should be created with a README.md file
- A new branch should be created
- The generated code should be committed to that branch
- A pull request should be created successfully

### Verification

1. Check the log messages for:

   - Successful branch detection
   - Repository initialization
   - Branch creation
   - File commits
   - PR creation

2. Verify in Azure DevOps that:
   - The repository now has a main branch with a README
   - A feature branch exists with the generated code
   - A pull request exists from the feature branch to main

If all of these elements are present, the fix was successful!

## Troubleshooting

If issues persist, check:

1. The Azure DevOps API permissions (PAT token might need regeneration)
2. Network connectivity between the server and Azure DevOps
3. The logs for specific errors around the 409 conflict handling

## Further Testing

For thorough testing, try with:

- An empty repository
- A repository with a main branch but no commits
- A repository with some other branches but no main branch
- A repository with a main branch that has at least one commit
