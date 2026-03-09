// scripts/process-ai-jobs.js
const fs = require("fs");
const path = require("path");
const { findMatchingRepository } = require("./ado-repository-matcher.js");
const { encodeRepositoryName } = require("./repository-utils.js");

// Use the correct Prisma client path for production environment
const { PrismaClient } = require("../prisma/app/generated/prisma/client");
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

  const { prompt } = job;

  try {
    // Get the project with organization info to find AI provider settings
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

    log(`Project found: ${project ? "Yes" : "No"}`);
    log(`ADO Connection: ${project?.adoConnection ? "Yes" : "No"}`);
    log(`Organization: ${project?.adoConnection?.organization ? "Yes" : "No"}`);
    log(
      `AI Provider Settings: ${
        project?.adoConnection?.organization?.aiProviderSettings?.length || 0
      } found`
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
      `Using AI provider: ${provider} with model: ${
        aiProviderSetting.model || "default"
      }`
    );

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
 * STEP 3: Get ADO repository main branch ID
 */
async function getRepositoryMainBranchInfo(job) {
  const repositoryName = job.repositoryName;
  log(`Step 3: Getting repository main branch info for ${repositoryName}`);
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
        Authorization: `Basic ${Buffer.from(`:${adoConnection.pat}`).toString(
          "base64"
        )}`,
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

    // Use project ID (GUID) for API calls instead of display name
    const encodedProjectId = encodeRepositoryName(adoProjectId);
    const encodedRepoName = encodeRepositoryName(repositoryName);

    // Find the matching repository using the helper function
    const repoMatch = await findMatchingRepository(
      adoApi,
      adoProjectId,
      repositoryName,
      encodedProjectId,
      encodedRepoName
    );
    if (!repoMatch) {
      throw new Error(`Repository not found: ${repositoryName}`);
    }

    // Use the repository info from the match
    const actualRepoName = repoMatch.repositoryName || repositoryName;
    const actualEncodedRepoName = encodeRepositoryName(actualRepoName);

    // Get repository refs to find main branch
    const refsResponse = await adoApi.get(
      `/${encodedProjectId}/_apis/git/repositories/${actualEncodedRepoName}/refs?filter=heads&api-version=7.0`
    );

    const validRef = findValidRef(refsResponse);
    if (!validRef) {
      // Repository is empty, initialize it
      log(`Repository is empty, initializing...`);
      await initializeEmptyRepository(
        adoApi,
        encodedProjectId,
        actualEncodedRepoName,
        actualRepoName
      );

      // Try again after initialization
      const refsResponseAfterInit = await adoApi.get(
        `/${encodedProjectId}/_apis/git/repositories/${actualEncodedRepoName}/refs?filter=heads&api-version=7.0`
      );
      const validRefAfterInit = findValidRef(refsResponseAfterInit);

      if (!validRefAfterInit) {
        throw new Error("Failed to initialize repository or find valid branch");
      }

      return {
        adoApi,
        adoProjectId,
        projectName,
        repositoryName: actualRepoName,
        encodedProjectId,
        encodedRepoName: actualEncodedRepoName,
        mainBranchRef: validRefAfterInit.name,
        mainBranchObjectId: validRefAfterInit.objectId,
      };
    }

    return {
      adoApi,
      adoProjectId,
      projectName,
      repositoryName: actualRepoName,
      encodedProjectId,
      encodedRepoName: actualEncodedRepoName,
      mainBranchRef: validRef.name,
      mainBranchObjectId: validRef.objectId,
    };
  } catch (error) {
    log(`Error in Step 3 - Repository info retrieval failed: ${error.message}`);
    throw new Error(`Repository info retrieval failed: ${error.message}`);
  }
}

/**
 * STEP 4: Create feature branch
 */
async function createFeatureBranch(repositoryInfo, branchName) {
  log(`Step 4: Creating feature branch ${branchName}`);

  const { adoApi, encodedProjectName, encodedRepoName, mainBranchObjectId } =
    repositoryInfo;

  try {
    // Create new branch
    log(`Creating branch: ${branchName} from commit ${mainBranchObjectId}`);

    const createBranchResponse = await adoApi.post(
      `/${encodedProjectName}/_apis/git/repositories/${encodedRepoName}/refs?api-version=7.0`,
      {
        refUpdates: [
          {
            name: `refs/heads/${branchName}`,
            oldObjectId: "0000000000000000000000000000000000000000",
            newObjectId: mainBranchObjectId,
          },
        ],
      }
    );

    if (!createBranchResponse.data?.value?.[0]) {
      throw new Error("Failed to create branch");
    }

    log(`Branch ${branchName} created successfully`);

    return {
      ...repositoryInfo,
      branchName,
      branchCommitId: mainBranchObjectId,
    };
  } catch (error) {
    log(`Error in Step 4 - Branch creation failed: ${error.message}`);
    throw new Error(`Branch creation failed: ${error.message}`);
  }
}

/**
 * STEP 5: Push generated code to feature branch
 */
async function pushCodeToFeatureBranch(branchInfo, generatedCode) {
  log(
    `Step 5: Pushing generated code to feature branch ${branchInfo.branchName}`
  );

  const {
    adoApi,
    encodedProjectName,
    encodedRepoName,
    branchName,
    branchCommitId,
  } = branchInfo;

  try {
    // Add the generated code to the branch
    const fileName = "ai-generated-code.md";
    log(`Adding file ${fileName} to branch ${branchName}`);

    const pushResponse = await adoApi.post(
      `/${encodedProjectName}/_apis/git/repositories/${encodedRepoName}/pushes?api-version=7.0`,
      {
        refUpdates: [
          {
            name: `refs/heads/${branchName}`,
            oldObjectId: branchCommitId,
          },
        ],
        commits: [
          {
            comment: "AI generated code",
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
      throw new Error("Failed to push code to branch");
    }

    const newCommitId = pushResponse.data.commits[0].commitId;
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
 * STEP 6: Create pull request
 */
async function createPullRequest(codeInfo) {
  log(`Step 6: Creating pull request for branch ${codeInfo.branchName}`);

  const {
    adoApi,
    encodedProjectName,
    encodedRepoName,
    branchName,
    mainBranchRef,
    repositoryName,
  } = codeInfo;

  try {
    const pullRequestData = {
      sourceRefName: `refs/heads/${branchName}`,
      targetRefName: mainBranchRef,
      title: `AI Generated Code - ${branchName}`,
      description:
        "This pull request contains AI-generated code based on the provided requirements.",
    };

    log(`Creating pull request: ${pullRequestData.title}`);

    const prResponse = await adoApi.post(
      `/${encodedProjectName}/_apis/git/repositories/${encodedRepoName}/pullrequests?api-version=7.0`,
      pullRequestData
    );

    if (!prResponse.data?.pullRequestId) {
      throw new Error("Failed to create pull request");
    }

    const prId = prResponse.data.pullRequestId;
    const prUrl = `https://dev.azure.com/torslev/${encodeURIComponent(
      repositoryName
    )}/_git/${encodeURIComponent(repositoryName)}/pullrequest/${prId}`;

    log(`Pull request created successfully: ${prUrl}`);
    return prUrl;
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
  const modelName = aiProviderSetting.model || "gemini-1.5-pro";

  log(`Calling Google Gemini with model: ${modelName}`);

  if (!aiProviderSetting.apiKey) {
    throw new Error("Google API key not found in provider settings");
  }

  try {
    const genAI = new GoogleGenerativeAI(aiProviderSetting.apiKey);

    // Dynamic model validation: Try to create the model instead of hard-coded validation
    let model;
    try {
      model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: aiProviderSetting.temperature || 0.7,
          maxOutputTokens: aiProviderSetting.maxTokens || 2000,
        },
      });
      log(`Model ${modelName} initialized successfully`);
    } catch (modelError) {
      // If model creation fails, provide helpful error with documentation link
      throw new Error(
        `Invalid or unavailable Google Gemini model: "${modelName}". Error: ${modelError.message}. Please check the model name and availability at: https://ai.google.dev/gemini-api/docs/models`
      );
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Handle different response structures from Google API with robust parsing
    let responseText = "";

    // Method 1: Try the standard text() method first
    try {
      responseText = response.text();
      log(`Method 1: Successfully extracted text using response.text()`);
    } catch (textError) {
      log(
        `Method 1 failed: ${textError.message}, trying alternative parsing methods...`
      );

      // Method 2: Try to extract from candidates array
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        log(
          `Method 2: Checking candidate structure: ${JSON.stringify(
            candidate,
            null,
            2
          )}`
        );

        if (candidate.content) {
          // Method 2a: Standard parts array structure
          if (candidate.content.parts && candidate.content.parts.length > 0) {
            responseText = candidate.content.parts[0].text || "";
            log(
              `Method 2a: Extracted text from parts array (${responseText.length} chars)`
            );
          }
          // Method 2b: Direct text content (some models)
          else if (candidate.content.text) {
            responseText = candidate.content.text;
            log(
              `Method 2b: Extracted text from direct content.text (${responseText.length} chars)`
            );
          }
          // Method 2c: Role-only response (thinking models)
          else if (candidate.content.role === "model") {
            log(
              `Method 2c: Model returned role-only response, checking for finishReason`
            );
            if (candidate.finishReason === "STOP") {
              responseText =
                "[AI model completed processing but returned empty content]";
            } else {
              responseText = `[AI model status: ${
                candidate.finishReason || "processing"
              }]`;
            }
          }
        }
      }

      // Method 3: Check for alternative response structures
      if (!responseText && response.text) {
        responseText = response.text;
        log(`Method 3: Extracted text from direct response.text property`);
      }

      if (!responseText) {
        log("All parsing methods failed. Full response structure:");
        log(JSON.stringify(response, null, 2));
        throw new Error(
          `Unable to extract text from Google API response for model ${modelName}. All parsing methods failed. Original error: ${textError.message}`
        );
      }
    }

    if (!responseText || responseText.trim() === "") {
      throw new Error(
        `Empty response from Google API for model ${modelName}. The model may not be available or the API key may be invalid.`
      );
    }

    log(`Google API returned ${responseText.length} characters`);
    return responseText;
  } catch (error) {
    log(`Google API error: ${error.message}`);

    // Add retry logic for transient failures
    if (
      error.message.includes("rate limit") ||
      error.message.includes("timeout") ||
      error.message.includes("network")
    ) {
      log(
        `Transient error detected, consider implementing retry logic in the future`
      );
    }

    throw new Error(`Google generation failed: ${error.message}`);
  }
}

async function generateWithAnthropic(prompt, aiProviderSetting) {
  log(
    `Calling Anthropic Claude with model: ${
      aiProviderSetting.model || "claude-3-sonnet-20240229"
    }`
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

    // Generate branch name
    const timestamp = Date.now();
    const branchName = `ai-feature-${timestamp}`;

    // STEP 1: Prompt AI provider for code
    log(`\n--- STEP 1: Prompting AI Provider ---`);
    const generatedCode = await promptAIProvider(job);
    log(`Generated code length: ${generatedCode.length} characters`);

    // STEP 2: Get AI provider response (completed in step 1)
    log(`\n--- STEP 2: AI Response Received ---`);

    // STEP 3: Get ADO repository main branch ID
    log(`\n--- STEP 3: Getting Repository Info ---`);
    const repositoryInfo = await getRepositoryMainBranchInfo(job);
    log(
      `Repository info retrieved - Main branch: ${repositoryInfo.mainBranchRef}`
    );

    // STEP 4: Create feature branch
    log(`\n--- STEP 4: Creating Feature Branch ---`);
    const branchInfo = await createFeatureBranch(repositoryInfo, branchName);
    log(`Feature branch created successfully`);

    // STEP 5: Push generated code to feature branch
    log(`\n--- STEP 5: Pushing Code to Feature Branch ---`);
    const codeInfo = await pushCodeToFeatureBranch(branchInfo, generatedCode);
    log(`Code pushed to feature branch successfully`);

    // STEP 6: Create pull request
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
          `Processing job ${job.id} for repository ${
            job.repositoryName || "unknown"
          }`
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
