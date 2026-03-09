/**
 * Comprehensive Azure DevOps Integration Module
 *
 * This module implements the complete Azure DevOps API flow following best practices:
 * - Uses Azure DevOps project GUID for all project-scoped API calls
 * - Implements proper repository lookup via gitApi.getRepositories(adoProjectId)
 * - Uses returned repo.id for all downstream calls
 * - Implements proper default branch commit retrieval
 * - Adds README verification and initialization logic
 * - Implements proper feature branch creation before pushing
 * - Comprehensive error handling and guards
 */

import { AxiosInstance, AxiosResponse } from "axios";

// Types for Azure DevOps API responses
interface AdoRepository {
  id: string;
  name: string;
  url: string;
  project: {
    id: string;
    name: string;
  };
  defaultBranch?: string;
  size: number;
}

interface AdoRef {
  name: string;
  objectId: string;
  creator?: {
    displayName: string;
    id: string;
  };
}

interface AdoCommit {
  commitId: string;
  comment: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
}

interface AdoPushResult {
  commits: AdoCommit[];
  refUpdates: Array<{
    name: string;
    oldObjectId: string;
    newObjectId: string;
  }>;
}

interface AdoPullRequest {
  pullRequestId: number;
  title: string;
  description: string;
  sourceRefName: string;
  targetRefName: string;
  status: string;
  url: string;
}

interface RepositoryLookupResult {
  repository: AdoRepository;
  defaultBranch: AdoRef | null;
  hasReadme: boolean;
  needsInitialization: boolean;
}

interface BranchCreationResult {
  branchName: string;
  branchRef: AdoRef;
  commitId: string;
}

interface PullRequestResult {
  pullRequest: AdoPullRequest;
  url: string;
}

/**
 * Main Azure DevOps Integration Class
 */
export class AzureDevOpsIntegration {
  private adoApi: AxiosInstance;
  private projectId: string;
  private organizationUrl: string;

  constructor(
    adoApi: AxiosInstance,
    projectId: string,
    organizationUrl: string
  ) {
    this.adoApi = adoApi;
    this.projectId = projectId;
    this.organizationUrl = organizationUrl;
  }

  /**
   * Step 1: Lookup repository using proper Azure DevOps API
   * Uses gitApi.getRepositories(adoProjectId) and filters by raw repo.name
   */
  async lookupRepository(
    repositoryName: string
  ): Promise<RepositoryLookupResult> {
    try {
      console.log(
        `Looking up repository "${repositoryName}" in project ${this.projectId}`
      );

      // Get all repositories in the project using project GUID
      const repositoriesResponse: AxiosResponse<{ value: AdoRepository[] }> =
        await this.adoApi.get(
          `/${encodeURIComponent(this.projectId)}/_apis/git/repositories?api-version=7.0`
        );

      if (!repositoriesResponse.data?.value) {
        throw new Error(`No repositories found in project ${this.projectId}`);
      }

      const repositories = repositoriesResponse.data.value;
      console.log(`Found ${repositories.length} repositories in project`);

      // Filter by exact repository name first
      let targetRepository = repositories.find(
        (repo) => repo.name === repositoryName
      );

      // If exact match not found, try case-insensitive match
      if (!targetRepository) {
        targetRepository = repositories.find(
          (repo) => repo.name.toLowerCase() === repositoryName.toLowerCase()
        );
      }

      // If still not found, try partial match
      if (!targetRepository) {
        targetRepository = repositories.find(
          (repo) =>
            repo.name.toLowerCase().includes(repositoryName.toLowerCase()) ||
            repositoryName.toLowerCase().includes(repo.name.toLowerCase())
        );
      }

      if (!targetRepository) {
        const availableRepos = repositories.map((r) => r.name).join(", ");
        throw new Error(
          `Repository "${repositoryName}" not found in project. Available repositories: ${availableRepos}`
        );
      }

      console.log(
        `Found repository: ${targetRepository.name} (ID: ${targetRepository.id})`
      );

      // Get default branch information
      const defaultBranch = await this.getDefaultBranch(targetRepository.id);

      // Check if repository has README
      const hasReadme = await this.checkForReadme(
        targetRepository.id,
        defaultBranch
      );

      // Determine if repository needs initialization
      const needsInitialization = !defaultBranch || !hasReadme;

      return {
        repository: targetRepository,
        defaultBranch,
        hasReadme,
        needsInitialization,
      };
    } catch (error) {
      console.error(`Repository lookup failed: ${error.message}`);
      throw new Error(`Repository lookup failed: ${error.message}`);
    }
  }

  /**
   * Step 2: Get default branch using proper refs API
   * Implements proper default branch commit retrieval via gitApi.getRefs(projectId, repo.id, "heads/")
   */
  private async getDefaultBranch(repositoryId: string): Promise<AdoRef | null> {
    try {
      console.log(`Getting default branch for repository ${repositoryId}`);

      // Get all branch refs using repository ID
      const refsResponse: AxiosResponse<{ value: AdoRef[] }> =
        await this.adoApi.get(
          `/${encodeURIComponent(this.projectId)}/_apis/git/repositories/${repositoryId}/refs?filter=heads/&api-version=7.0`
        );

      if (!refsResponse.data?.value || refsResponse.data.value.length === 0) {
        console.log("No branches found - repository is empty");
        return null;
      }

      const branches = refsResponse.data.value;
      console.log(`Found ${branches.length} branches`);

      // Look for main branch first
      let defaultBranch = branches.find(
        (ref) => ref.name === "refs/heads/main"
      );

      // Fall back to master
      if (!defaultBranch) {
        defaultBranch = branches.find(
          (ref) => ref.name === "refs/heads/master"
        );
      }

      // Fall back to any branch
      if (!defaultBranch) {
        defaultBranch = branches.find(
          (ref) =>
            ref.name.startsWith("refs/heads/") &&
            ref.objectId !== "0000000000000000000000000000000000000000"
        );
      }

      if (defaultBranch) {
        console.log(
          `Default branch: ${defaultBranch.name} (${defaultBranch.objectId})`
        );
      } else {
        console.log("No valid default branch found");
      }

      return defaultBranch || null;
    } catch (error) {
      console.error(`Failed to get default branch: ${error.message}`);
      return null;
    }
  }

  /**
   * Step 3: Check for README file existence
   */
  private async checkForReadme(
    repositoryId: string,
    defaultBranch: AdoRef | null
  ): Promise<boolean> {
    if (!defaultBranch) {
      return false;
    }

    try {
      console.log(`Checking for README in repository ${repositoryId}`);

      // Check for README.md file in the root
      const itemsResponse = await this.adoApi.get(
        `/${encodeURIComponent(this.projectId)}/_apis/git/repositories/${repositoryId}/items?path=/README.md&api-version=7.0`
      );

      if (itemsResponse.status === 200 && itemsResponse.data) {
        console.log("README.md found");
        return true;
      }
    } catch (error) {
      // README not found - this is expected for empty repositories
      console.log("README.md not found");
    }

    return false;
  }

  /**
   * Step 4: Initialize repository if needed
   */
  async initializeRepository(
    repositoryId: string,
    repositoryName: string
  ): Promise<AdoRef> {
    try {
      console.log(
        `Initializing repository ${repositoryName} (${repositoryId})`
      );

      const initialContent = `# ${repositoryName}

This repository was initialized automatically by Portavi AI.

## Getting Started

This repository is ready for your AI-generated code.
`;

      // Create initial commit with README
      const pushResponse: AxiosResponse<AdoPushResult> = await this.adoApi.post(
        `/${encodeURIComponent(this.projectId)}/_apis/git/repositories/${repositoryId}/pushes?api-version=7.0`,
        {
          refUpdates: [
            {
              name: "refs/heads/main",
              oldObjectId: "0000000000000000000000000000000000000000",
            },
          ],
          commits: [
            {
              comment: "Initial commit - Repository initialization",
              changes: [
                {
                  changeType: "add",
                  item: {
                    path: "/README.md",
                  },
                  newContent: {
                    content: initialContent,
                    contentType: "rawtext",
                  },
                },
              ],
            },
          ],
        }
      );

      if (!pushResponse.data?.commits?.[0]) {
        throw new Error("Failed to create initial commit");
      }

      const commitId = pushResponse.data.commits[0].commitId;
      console.log(`Repository initialized with commit ${commitId}`);

      // Return the new main branch ref
      return {
        name: "refs/heads/main",
        objectId: commitId,
      };
    } catch (error) {
      console.error(`Repository initialization failed: ${error.message}`);
      throw new Error(`Repository initialization failed: ${error.message}`);
    }
  }

  /**
   * Step 5: Create feature branch with proper API flow
   */
  async createFeatureBranch(
    repositoryId: string,
    branchName: string,
    baseBranch: AdoRef
  ): Promise<BranchCreationResult> {
    try {
      console.log(
        `Creating feature branch ${branchName} from ${baseBranch.name}`
      );

      // Create new branch reference
      const createBranchResponse = await this.adoApi.post(
        `/${encodeURIComponent(this.projectId)}/_apis/git/repositories/${repositoryId}/refs?api-version=7.0`,
        {
          refUpdates: [
            {
              name: `refs/heads/${branchName}`,
              oldObjectId: "0000000000000000000000000000000000000000",
              newObjectId: baseBranch.objectId,
            },
          ],
        }
      );

      if (!createBranchResponse.data?.value?.[0]) {
        throw new Error("Failed to create feature branch");
      }

      const branchRef: AdoRef = {
        name: `refs/heads/${branchName}`,
        objectId: baseBranch.objectId,
      };

      console.log(`Feature branch ${branchName} created successfully`);

      return {
        branchName,
        branchRef,
        commitId: baseBranch.objectId,
      };
    } catch (error) {
      console.error(`Feature branch creation failed: ${error.message}`);
      throw new Error(`Feature branch creation failed: ${error.message}`);
    }
  }

  /**
   * Step 6: Push code to feature branch
   */
  async pushCodeToFeatureBranch(
    repositoryId: string,
    branchName: string,
    baseCommitId: string,
    generatedCode: string,
    fileName: string = "ai-generated-code.md"
  ): Promise<string> {
    try {
      console.log(`Pushing code to feature branch ${branchName}`);

      const pushResponse: AxiosResponse<AdoPushResult> = await this.adoApi.post(
        `/${encodeURIComponent(this.projectId)}/_apis/git/repositories/${repositoryId}/pushes?api-version=7.0`,
        {
          refUpdates: [
            {
              name: `refs/heads/${branchName}`,
              oldObjectId: baseCommitId,
            },
          ],
          commits: [
            {
              comment: `Add AI generated code - ${fileName}`,
              changes: [
                {
                  changeType: "add",
                  item: {
                    path: `/${fileName}`,
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

      if (!pushResponse.data?.commits?.[0]) {
        throw new Error("Failed to push code to feature branch");
      }

      const newCommitId = pushResponse.data.commits[0].commitId;
      console.log(`Code pushed to ${branchName}, new commit: ${newCommitId}`);

      return newCommitId;
    } catch (error) {
      console.error(`Code push failed: ${error.message}`);
      throw new Error(`Code push failed: ${error.message}`);
    }
  }

  /**
   * Step 7: Create pull request
   */
  async createPullRequest(
    repositoryId: string,
    repositoryName: string,
    sourceBranch: string,
    targetBranch: string,
    title?: string,
    description?: string
  ): Promise<PullRequestResult> {
    try {
      console.log(
        `Creating pull request from ${sourceBranch} to ${targetBranch}`
      );

      const prTitle = title || `AI Generated Code - ${sourceBranch}`;
      const prDescription =
        description ||
        `This pull request contains AI-generated code based on the provided requirements.

**Branch:** ${sourceBranch}
**Target:** ${targetBranch}

Please review the generated code before merging.`;

      const pullRequestResponse: AxiosResponse<AdoPullRequest> =
        await this.adoApi.post(
          `/${encodeURIComponent(this.projectId)}/_apis/git/repositories/${repositoryId}/pullrequests?api-version=7.0`,
          {
            sourceRefName: `refs/heads/${sourceBranch}`,
            targetRefName: targetBranch,
            title: prTitle,
            description: prDescription,
          }
        );

      if (!pullRequestResponse.data?.pullRequestId) {
        throw new Error("Failed to create pull request");
      }

      const pullRequest = pullRequestResponse.data;

      // Construct PR URL following correct Azure DevOps format
      // Extract organization name from organizationUrl
      // organizationUrl format: https://dev.azure.com/orgname/ or https://dev.azure.com/orgname
      let orgName: string;
      try {
        const url = new URL(this.organizationUrl);
        const pathParts = url.pathname
          .split("/")
          .filter((part) => part.length > 0);
        orgName = pathParts[0]; // Get 'torslev' from '/torslev/' or '/torslev'

        if (!orgName) {
          // Fallback: extract from hostname if it's a custom domain
          orgName = url.hostname.split(".")[0];
        }
      } catch (error) {
        console.error(`Error parsing organization URL: ${error.message}`);
        orgName = "unknown-org";
      }

      // URL encode repository name to handle spaces and special characters
      const encodedRepoName = encodeURIComponent(repositoryName);

      // Azure DevOps repository URL format: https://dev.azure.com/org/_git/reponame/pullrequest/id
      const prUrl = `https://dev.azure.com/${orgName}/_git/${encodedRepoName}/pullrequest/${pullRequest.pullRequestId}`;

      console.log(`Pull request created: ${prUrl}`);

      return {
        pullRequest,
        url: prUrl,
      };
    } catch (error) {
      console.error(`Pull request creation failed: ${error.message}`);
      throw new Error(`Pull request creation failed: ${error.message}`);
    }
  }

  /**
   * Complete workflow: Execute full Azure DevOps integration flow
   */
  async executeCompleteWorkflow(
    repositoryName: string,
    generatedCode: string,
    branchName: string,
    fileName?: string
  ): Promise<{
    repository: AdoRepository;
    branchName: string;
    commitId: string;
    pullRequestUrl: string;
  }> {
    try {
      console.log(
        `Starting complete Azure DevOps workflow for ${repositoryName}`
      );

      // Step 1: Lookup repository
      const lookupResult = await this.lookupRepository(repositoryName);
      const { repository, defaultBranch, needsInitialization } = lookupResult;

      // Step 2: Initialize repository if needed
      let currentDefaultBranch = defaultBranch;
      if (needsInitialization) {
        console.log("Repository needs initialization");
        currentDefaultBranch = await this.initializeRepository(
          repository.id,
          repository.name
        );
      }

      if (!currentDefaultBranch) {
        throw new Error("Unable to determine or create default branch");
      }

      // Step 3: Create feature branch
      const branchResult = await this.createFeatureBranch(
        repository.id,
        branchName,
        currentDefaultBranch
      );

      // Step 4: Push code to feature branch
      const newCommitId = await this.pushCodeToFeatureBranch(
        repository.id,
        branchName,
        branchResult.commitId,
        generatedCode,
        fileName
      );

      // Step 5: Create pull request
      const pullRequestResult = await this.createPullRequest(
        repository.id,
        repository.name,
        branchName,
        currentDefaultBranch.name
      );

      console.log(`Complete workflow finished successfully`);

      return {
        repository,
        branchName,
        commitId: newCommitId,
        pullRequestUrl: pullRequestResult.url,
      };
    } catch (error) {
      console.error(`Complete workflow failed: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Factory function to create AzureDevOpsIntegration instance
 */
export function createAzureDevOpsIntegration(
  adoApi: AxiosInstance,
  projectId: string,
  organizationUrl: string
): AzureDevOpsIntegration {
  return new AzureDevOpsIntegration(adoApi, projectId, organizationUrl);
}

/**
 * Utility function to validate project GUID format
 */
export function isValidProjectGuid(projectId: string): boolean {
  if (!projectId || typeof projectId !== "string") {
    return false;
  }
  const guidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidRegex.test(projectId);
}

/**
 * Utility function to generate unique branch names
 */
export function generateBranchName(prefix: string = "ai-feature"): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${randomSuffix}`;
}
