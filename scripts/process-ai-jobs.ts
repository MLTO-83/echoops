// scripts/process-ai-jobs.ts
const fs = require("fs");
const path = require("path");
const { findMatchingRepository } = require("./ado-repository-matcher.js");
const { encodeRepositoryName } = require("./repository-utils.js");
const {
  createAzureDevOpsIntegration,
  generateBranchName,
  isValidProjectGuid,
} = require("./azure-devops-integration.js");

// Dynamic path detection to handle both dev and production environments
const basePath = fs.existsSync("/var/www/portavi")
  ? "/var/www/portavi"
  : "/root/portavi";
const prismaPath = path.join(basePath, "prisma/app/generated/prisma/client");

const { PrismaClient } = require(prismaPath);
const { OpenAI } = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Anthropic } = require("@anthropic-ai/sdk");
const axios = require("axios");

// Set up logging to file
const logFile = path.join(__dirname, "process-ai-jobs.log");
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
};

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * STEP 1: Prompt AI provider for code generation
 */
async function promptAIProvider(job) {
  log(`Step 1: Prompting AI provider for job ${job.id}`);

  try {
    // Get the project with all related data for AI provider settings
    const project = await prisma.project.findUnique({
      where: { id: job.projectId },
      include: {
        adoConnection: {
          include: {
            organization: {
              include: {
                aiProviderSettings: true,
              },
            },
          },
        },
      },
    });

    log(
      `Project: ${project?.name || "Not found"}, ADO Connection: ${project?.adoConnection ? "Found" : "Not found"}, Organization: ${project?.adoConnection?.organization ? "Found" : "Not found"}`
    );
    log(
      `AI Provider Settings: ${project?.adoConnection?.organization?.aiProviderSettings?.length || 0} found`
    );

    if (!project) {
      throw new Error(`Project not found with ID: ${job.projectId}`);
    }

    if (!project.adoConnection) {
      throw new Error("No ADO connection found for this project");
    }

    if (!project.adoConnection.organization) {
      throw new Error(
        "No organization found for this project's ADO connection"
      );
    }

    if (!project.adoConnection.organization.aiProviderSettings?.length) {
      throw new Error("No AI provider settings found for this organization");
    }

    // Use the first available AI provider (assuming one provider per org for now)
    const aiProviderSetting =
      project.adoConnection.organization.aiProviderSettings[0];
    const provider = aiProviderSetting.provider?.toLowerCase();

    if (!provider) {
      throw new Error("AI provider setting exists but provider field is empty");
    }

    log(
      `Using AI provider: ${provider} with model: ${aiProviderSetting.model || "default"}`
    );

    const prompt = job.prompt;

    // Use includes() to handle provider names like "Google Gemini", "OpenAI", etc.
    if (provider.includes("openai")) {
      return await generateWithOpenAI(prompt, aiProviderSetting);
    } else if (provider.includes("google") || provider.includes("gemini")) {
      return await generateWithGoogle(prompt, aiProviderSetting);
    } else if (provider.includes("anthropic") || provider.includes("claude")) {
      return await generateWithAnthropic(prompt, aiProviderSetting);
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
  } catch (error) {
    log(`Error in Step 1 - AI provider call failed: ${error.message}`);
    throw new Error(`AI provider failed: ${error.message}`);
  }
}

/**
 * STEP 2: Get AI provider response (already handled in step 1, but keeping for clarity)
 */
async function getAIProviderResponse(aiProvider, prompt) {
  log(`Step 2: Getting response from ${aiProvider}`);
  return await promptAIProvider({ aiProvider, prompt });
}

/**
 * STEP 3: Get ADO repository main branch ID using comprehensive Azure DevOps integration
 */
async function getRepositoryMainBranchInfo(job) {
  const repositoryName = job.repositoryName;
  log(
    `Step 3: Getting repository main branch info for ${repositoryName} using comprehensive integration`
  );
  log(
    `DEBUG: Job project info - ${
      job.project
        ? `Project: ${job.project.name} (${job.project.id})`
        : "No project info available"
    }`
  );

  try {
    // Get ADO connection details
    const adoConnection = await prisma.aDOConnection.findFirst();
    if (!adoConnection) {
      throw new Error("No ADO connection found");
    }

    const adoApi = axios.create({
      baseURL: adoConnection.adoOrganizationUrl,
      headers: {
        Authorization: `Basic ${Buffer.from(`:${adoConnection.pat}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    // Get project information from the job - use ADO Project ID instead of display name
    const adoProjectId = job.project?.adoProjectId;
    const projectName = job.project?.name; // Keep for logging and fallback

    if (!adoProjectId) {
      throw new Error(
        "No ADO project ID available in job. Project must be linked to Azure DevOps."
      );
    }

    // Validate project GUID format
    if (!isValidProjectGuid(adoProjectId)) {
      throw new Error(
        `Invalid ADO project ID format: ${adoProjectId}. Expected GUID format.`
      );
    }

    log(`Using Azure DevOps project ID: ${adoProjectId}`);

    // Create Azure DevOps integration instance
    const adoIntegration = createAzureDevOpsIntegration(
      adoApi,
      adoProjectId,
      adoConnection.adoOrganizationUrl
    );

    // Lookup repository using comprehensive integration
    const lookupResult = await adoIntegration.lookupRepository(repositoryName);
    const { repository, defaultBranch, needsInitialization } = lookupResult;

    log(`Repository found: ${repository.name} (ID: ${repository.id})`);
    log(`Default branch: ${defaultBranch?.name || "None"}`);
    log(`Needs initialization: ${needsInitialization}`);

    // Initialize repository if needed
    let currentDefaultBranch = defaultBranch;
    if (needsInitialization) {
      log(`Initializing repository ${repository.name}`);
      currentDefaultBranch = await adoIntegration.initializeRepository(
        repository.id,
        repository.name
      );
      log(`Repository initialized with branch: ${currentDefaultBranch.name}`);
    }

    if (!currentDefaultBranch) {
      throw new Error("Unable to determine or create default branch");
    }

    return {
      adoApi,
      adoIntegration,
      adoProjectId,
      projectName,
      repository,
      repositoryName: repository.name,
      repositoryId: repository.id,
      encodedProjectId: encodeRepositoryName(adoProjectId),
      encodedRepoName: encodeRepositoryName(repository.name),
      mainBranchRef: currentDefaultBranch.name,
      mainBranchObjectId: currentDefaultBranch.objectId,
      defaultBranch: currentDefaultBranch,
    };
  } catch (error) {
    log(`Error in Step 3 - Repository info retrieval failed: ${error.message}`);
    throw new Error(`Repository info retrieval failed: ${error.message}`);
  }
}

/**
 * STEP 4: Create feature branch using comprehensive integration
 */
async function createFeatureBranch(repositoryInfo, branchName) {
  log(
    `Step 4: Creating feature branch ${branchName} using comprehensive integration`
  );

  const { adoIntegration, repository, defaultBranch } = repositoryInfo;

  try {
    // Create feature branch using comprehensive integration
    const branchResult = await adoIntegration.createFeatureBranch(
      repository.id,
      branchName,
      defaultBranch
    );

    log(`Feature branch ${branchName} created successfully`);
    log(`Branch commit ID: ${branchResult.commitId}`);

    return {
      ...repositoryInfo,
      branchName,
      branchResult,
    };
  } catch (error) {
    log(`Error in Step 4 - Branch creation failed: ${error.message}`);
    throw new Error(`Branch creation failed: ${error.message}`);
  }
}

/**
 * STEP 5: Push generated code to feature branch using comprehensive integration
 */
async function pushCodeToFeatureBranch(branchInfo, generatedCode) {
  log(
    `Step 5: Pushing generated code to feature branch ${branchInfo.branchName} using comprehensive integration`
  );

  const { adoIntegration, repository, branchName, branchResult } = branchInfo;

  try {
    // Push code to feature branch
    const fileName = "ai-generated-code.md";
    const newCommitId = await adoIntegration.pushCodeToFeatureBranch(
      repository.id,
      branchName,
      branchResult.commitId,
      generatedCode,
      fileName
    );

    log(`Code pushed to branch ${branchName}, new commit: ${newCommitId}`);

    return {
      ...branchInfo,
      newCommitId,
      fileName,
    };
  } catch (error) {
    log(`Error in Step 5 - Code push failed: ${error.message}`);
    throw new Error(`Code push failed: ${error.message}`);
  }
}

/**
 * STEP 6: Create pull request using comprehensive integration
 */
async function createPullRequest(codeInfo) {
  log(
    `Step 6: Creating pull request for branch ${codeInfo.branchName} using comprehensive integration`
  );

  const { adoIntegration, repository, branchName, mainBranchRef } = codeInfo;

  try {
    const pullRequestResult = await adoIntegration.createPullRequest(
      repository.id,
      repository.name,
      branchName,
      mainBranchRef
    );

    log(`Pull request created successfully: ${pullRequestResult.url}`);
    return pullRequestResult.url;
  } catch (error) {
    log(`Error in Step 6 - Pull request creation failed: ${error.message}`);
    throw new Error(`Pull request creation failed: ${error.message}`);
  }
}

/**
 * Helper function to find valid ref from API response
 */
function findValidRef(refResponse) {
  if (!refResponse?.data?.value || refResponse.data.value.length === 0) {
    return null;
  }

  // Try to find the main branch first
  let mainRef = refResponse.data.value.find(
    (ref) =>
      ref.name === "refs/heads/main" &&
      ref.objectId &&
      ref.objectId !== "0000000000000000000000000000000000000000"
  );

  if (mainRef) {
    return mainRef;
  }

  // Next, try master branch
  let masterRef = refResponse.data.value.find(
    (ref) =>
      ref.name === "refs/heads/master" &&
      ref.objectId &&
      ref.objectId !== "0000000000000000000000000000000000000000"
  );

  if (masterRef) {
    return masterRef;
  }

  // Finally, use any valid branch
  return refResponse.data.value.find(
    (ref) =>
      ref.name.startsWith("refs/heads/") &&
      ref.objectId &&
      ref.objectId !== "0000000000000000000000000000000000000000"
  );
}

/**
 * Initialize an empty repository with a README.md file
 */
async function initializeEmptyRepository(
  adoApi,
  encodedProjectId,
  encodedRepoName,
  repositoryName
) {
  log(`Initializing empty repository: ${repositoryName}`);

  try {
    // Create initial commit with README
    const initialContent = `# ${repositoryName}\n\nThis repository was initialized automatically.\n`;

    const initResponse = await adoApi.post(
      `/${encodedProjectId}/_apis/git/repositories/${encodedRepoName}/pushes?api-version=7.0`,
      {
        refUpdates: [
          {
            name: "refs/heads/main",
            oldObjectId: "0000000000000000000000000000000000000000",
          },
        ],
        commits: [
          {
            comment: "Initial commit",
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

    if (!initResponse.data?.commits?.[0]) {
      throw new Error("Failed to initialize repository");
    }

    log(`Repository ${repositoryName} initialized with initial commit`);
    return initResponse.data.commits[0].commitId;
  } catch (error) {
    log(`Failed to initialize repository: ${error.message}`);
    throw new Error(`Repository initialization failed: ${error.message}`);
  }
}

/**
 * AI Provider implementations - Updated to use database settings
 */
async function generateWithOpenAI(prompt, aiProviderSetting) {
  log(`Calling OpenAI with model: ${aiProviderSetting.model || "gpt-4"}`);

  if (!aiProviderSetting.apiKey) {
    throw new Error("OpenAI API key not found in provider settings");
  }

  try {
    const openai = new OpenAI({ apiKey: aiProviderSetting.apiKey });

    const response = await openai.chat.completions.create({
      model: aiProviderSetting.model || "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: aiProviderSetting.maxTokens || 2000,
      temperature: aiProviderSetting.temperature || 0.7,
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new Error("Invalid response from OpenAI API");
    }

    return response.choices[0].message.content;
  } catch (error) {
    log(`OpenAI API error: ${error.message}`);
    throw new Error(`OpenAI generation failed: ${error.message}`);
  }
}

async function generateWithGoogle(prompt, aiProviderSetting) {
  log(
    `Calling Google Gemini with model: ${aiProviderSetting.model || "gemini-1.5-pro"}`
  );

  if (!aiProviderSetting.apiKey) {
    throw new Error("Google API key not found in provider settings");
  }

  try {
    const genAI = new GoogleGenerativeAI(aiProviderSetting.apiKey);
    const model = genAI.getGenerativeModel({
      model: aiProviderSetting.model || "gemini-1.5-pro",
      generationConfig: {
        temperature: aiProviderSetting.temperature || 0.7,
        maxOutputTokens: aiProviderSetting.maxTokens || 2000,
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Enhanced response parsing for different Google models
    let responseText = "";

    // Method 1: Direct text() call
    try {
      responseText = response.text();
      if (responseText && responseText.trim()) {
        log(`Google API response length: ${responseText.length} characters`);
        return responseText;
      }
    } catch (textError) {
      log(`Direct text() method failed: ${textError.message}`);
    }

    // Method 2: Check candidates array
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            responseText += part.text;
          }
        }
        if (responseText.trim()) {
          log(
            `Google API response from candidates: ${responseText.length} characters`
          );
          return responseText;
        }
      }
    }

    // Method 3: Direct response parsing
    if (response.text && typeof response.text === "string") {
      responseText = response.text;
      if (responseText.trim()) {
        log(
          `Google API response from direct text: ${responseText.length} characters`
        );
        return responseText;
      }
    }

    // Log the full response structure for debugging
    log(
      `Full Google API response structure: ${JSON.stringify(response, null, 2)}`
    );
    throw new Error(
      "Empty response from Google API - no valid text content found"
    );
  } catch (error) {
    log(`Google API error: ${error.message}`);
    throw new Error(`Google generation failed: ${error.message}`);
  }
}

async function generateWithAnthropic(prompt, aiProviderSetting) {
  log(
    `Calling Anthropic with model: ${aiProviderSetting.model || "claude-3-sonnet-20240229"}`
  );

  if (!aiProviderSetting.apiKey) {
    throw new Error("Anthropic API key not found in provider settings");
  }

  try {
    const anthropic = new Anthropic({ apiKey: aiProviderSetting.apiKey });

    const response = await anthropic.messages.create({
      model: aiProviderSetting.model || "claude-3-sonnet-20240229",
      max_tokens: aiProviderSetting.maxTokens || 2000,
      temperature: aiProviderSetting.temperature || 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    if (!response.content?.[0]?.text) {
      throw new Error("Invalid response from Anthropic API");
    }

    return response.content[0].text;
  } catch (error) {
    log(`Anthropic API error: ${error.message}`);
    throw new Error(`Anthropic generation failed: ${error.message}`);
  }
}

/**
 * Main job processing function - follows the 6-step sequence
 */
async function processJob(job) {
  log(`\n=== Processing Job ${job.id} - Repository: ${job.repositoryName} ===`);

  try {
    // Update job status to IN_PROGRESS
    await prisma.aIAgentJob.update({
      where: { id: job.id },
      data: { status: "IN_PROGRESS" },
    });

    // Generate unique branch name using the comprehensive integration helper
    const branchName = generateBranchName("ai-feature");
    log(`Generated branch name: ${branchName}`);

    // STEP 1: Prompt AI provider for code
    log(`\n--- STEP 1: Prompting AI Provider ---`);
    const generatedCode = await promptAIProvider(job);
    log(`Generated code length: ${generatedCode.length} characters`);

    // STEP 2: Get AI provider response (completed in step 1)
    log(`\n--- STEP 2: AI Response Received ---`);

    // STEP 3: Get ADO repository main branch ID using comprehensive integration
    log(`\n--- STEP 3: Getting Repository Info ---`);
    const repositoryInfo = await getRepositoryMainBranchInfo(job);
    log(
      `Repository info retrieved - Main branch: ${repositoryInfo.mainBranchRef}`
    );

    // STEP 4: Create feature branch only (separated from code pushing)
    log(`\n--- STEP 4: Creating Feature Branch ---`);
    const branchInfo = await createFeatureBranch(repositoryInfo, branchName);
    log(`Feature branch created successfully`);

    // STEP 5: Push generated code to feature branch (separated from branch creation)
    log(`\n--- STEP 5: Pushing Code to Feature Branch ---`);
    const codeInfo = await pushCodeToFeatureBranch(branchInfo, generatedCode);
    log(`Code pushed to feature branch successfully`);

    // STEP 6: Create pull request using comprehensive integration
    log(`\n--- STEP 6: Creating Pull Request ---`);
    const prUrl = await createPullRequest(codeInfo);
    log(`Pull request created: ${prUrl}`);

    // Mark job completed
    await prisma.aIAgentJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        pullRequestUrl: prUrl,
      },
    });

    log(`\n=== Job ${job.id} completed successfully ===\n`);
  } catch (error) {
    const errorMsg = `Job ${job.id} failed: ${error.message}`;
    log(`\n=== ${errorMsg} ===\n`);

    // Mark job failed
    await prisma.aIAgentJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: error.message,
      },
    });
  }
}

/**
 * Main worker loop
 */
async function main() {
  log("AI Worker started, polling for jobs...");

  try {
    // Check for failed jobs with spaces in repository names
    const failedJobsWithSpaces = await prisma.aIAgentJob.findMany({
      where: {
        status: "FAILED",
        repositoryName: { contains: " " },
      },
      include: { project: true },
    });

    if (failedJobsWithSpaces.length > 0) {
      log(
        `Found ${failedJobsWithSpaces.length} failed jobs with spaces in repository names`
      );
    }

    while (true) {
      log("Checking for pending jobs...");
      const pendingJobs = await prisma.aIAgentJob.findMany({
        where: { status: "PENDING" },
        include: { project: true },
      });

      log(`Found ${pendingJobs.length} pending jobs`);

      for (const job of pendingJobs) {
        log(
          `Processing job ${job.id} for repository ${job.repositoryName || "unknown"}`
        );
        await processJob(job);
      }

      // Poll interval
      log("Waiting for next polling cycle...");
      await new Promise((r) => setTimeout(r, 5000));
    }
  } catch (error) {
    log(`Fatal worker error: ${error.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  log(`Worker error: ${err.message}`);
  process.exit(1);
});
