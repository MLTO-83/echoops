#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Dynamic path detection to handle both dev and production environments
const basePath = fs.existsSync("/var/www/portavi")
  ? "/var/www/portavi"
  : "/root/portavi";
const prismaPath = path.join(basePath, "prisma/app/generated/prisma/client");

const { PrismaClient } = require(prismaPath);

async function testAIJobProcessing() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Testing AI Job Processing Pipeline");
    console.log("=====================================\n");

    // Step 1: Check for existing AI jobs
    console.log("📋 Step 1: Checking existing AI jobs...");
    const existingJobs = await prisma.aIAgentJob.findMany({
      include: {
        project: {
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    console.log(`Found ${existingJobs.length} AI jobs in database`);

    for (const job of existingJobs) {
      console.log(
        `  - Job ${job.id}: ${job.status} (${job.prompt.substring(0, 50)}...)`
      );
      if (
        job.project?.adoConnection?.organization?.aiProviderSettings?.length > 0
      ) {
        const aiSettings =
          job.project.adoConnection.organization.aiProviderSettings[0];
        console.log(
          `    AI Provider: ${aiSettings.provider} / ${aiSettings.model}`
        );
      }
    }

    // Step 2: Create a test AI job if none exist or all are completed
    const pendingJobs = existingJobs.filter((job) => job.status === "PENDING");

    if (pendingJobs.length === 0) {
      console.log("\n🆕 Step 2: Creating new test AI job..."); // Find the first project with AI settings (prioritize ones with webhook config)
      let projectWithAI = await prisma.project.findFirst({
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
          webhookConfig: true,
        },
        where: {
          AND: [
            {
              adoConnection: {
                organization: {
                  aiProviderSettings: {
                    some: {},
                  },
                },
              },
            },
            {
              webhookConfig: {
                repositoryName: {
                  not: null,
                },
              },
            },
          ],
        },
      });

      // If no project with webhook config, use any project with AI settings
      if (!projectWithAI) {
        projectWithAI = await prisma.project.findFirst({
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
            webhookConfig: true,
          },
          where: {
            adoConnection: {
              organization: {
                aiProviderSettings: {
                  some: {},
                },
              },
            },
          },
        });
      }

      if (!projectWithAI) {
        console.log("❌ No projects found with AI provider settings!");
        console.log("Please configure AI settings for at least one project.");
        return;
      }

      console.log(`Found project: ${projectWithAI.name} (${projectWithAI.id})`);
      console.log(
        `Repository: ${projectWithAI.webhookConfig?.repositoryName || "test-repo"}`
      );
      console.log(
        `Webhook enabled: ${projectWithAI.webhookConfig?.active ? "Yes" : "No (will use test-repo)"}`
      );
      console.log(
        `AI Provider Settings: ${projectWithAI.adoConnection?.organization?.aiProviderSettings?.length || 0} configured`
      );

      const testJob = await prisma.aIAgentJob.create({
        data: {
          projectId: projectWithAI.id,
          prompt:
            "Create a simple utility function to format dates in TypeScript. The function should accept a Date object and return a formatted string.",
          repositoryName:
            projectWithAI.webhookConfig?.repositoryName || "test-repo",
          status: "PENDING",
        },
      });

      console.log(`✅ Created test job: ${testJob.id}`);
    } else {
      console.log(
        `\n⏳ Step 2: Found ${pendingJobs.length} pending jobs, using existing ones`
      );
    }

    // Step 3: Trigger the AI job processor
    console.log("\n🚀 Step 3: Triggering AI job processor...");

    const { spawn } = require("child_process");

    // Run the processor once
    const processor = spawn(
      "node",
      [path.join(basePath, "scripts/process-ai-jobs.js")],
      {
        stdio: "pipe",
        env: { ...process.env, NODE_ENV: "production" },
      }
    );

    let output = "";
    let errorOutput = "";

    processor.stdout.on("data", (data) => {
      const text = data.toString();
      output += text;
      console.log("PROCESSOR:", text.trim());
    });

    processor.stderr.on("data", (data) => {
      const text = data.toString();
      errorOutput += text;
      console.error("PROCESSOR ERROR:", text.trim());
    });

    await new Promise((resolve, reject) => {
      processor.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Processor exited with code ${code}`));
        }
      });

      // Kill after 60 seconds
      setTimeout(() => {
        processor.kill("SIGTERM");
        resolve();
      }, 60000);
    });

    // Step 4: Check job status after processing
    console.log("\n📊 Step 4: Checking job status after processing...");

    const updatedJobs = await prisma.aIAgentJob.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
    });

    for (const job of updatedJobs) {
      console.log(`  - Job ${job.id}: ${job.status}`);
      if (job.errorMessage) {
        console.log(`    Error: ${job.errorMessage.substring(0, 100)}...`);
      }
      if (job.pullRequestUrl) {
        console.log(`    PR: ${job.pullRequestUrl}`);
      }
    }

    console.log("\n✅ AI Job Processing Test Complete!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    console.error("Stack trace:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testAIJobProcessing().catch(console.error);
