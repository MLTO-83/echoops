import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users, organizations, aiProviderSettings, aiAgentJobs } from "@/lib/firebase/db";
import { OpenAI } from "openai";

/**
 * POST /api/ai/execute - Execute an AI job synchronously with multiple model support
 * Uses database settings for AI provider configuration instead of environment variables
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get request data
    const data = await req.json();
    const {
      projectId,
      prompt,
      repositoryName = "default",
      modelName = "gpt-4",
    } = data;

    // Validate inputs
    if (!projectId || !prompt || !repositoryName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the user's organization
    const user = await users.findByEmail(session.user.email as string);

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { error: "User not associated with an organization" },
        { status: 400 }
      );
    }

    const organization = await organizations.findById(user.organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: "User not associated with an organization" },
        { status: 400 }
      );
    }

    // Determine which AI provider to use based on the model name
    const providerName = modelName.startsWith("claude")
      ? "anthropic"
      : modelName.startsWith("gemini") || modelName.includes("gemini")
        ? "google"
        : "openai";

    // Get the AI provider settings from the database
    const providerSettings = await aiProviderSettings.findByOrgAndProvider(
      user.organizationId as string,
      providerName
    );

    if (!providerSettings) {
      return NextResponse.json(
        {
          error: `AI provider '${providerName}' is not configured for your organization`,
        },
        { status: 400 }
      );
    }

    // Create a record of this job
    const job = await aiAgentJobs.create({
      projectId,
      prompt,
      repositoryName,
      status: "processing",
    });

    let aiResponse;
    let errorMessage;
    let aiClient;

    try {
      // Initialize the appropriate AI client based on the provider
      switch (providerName) {
        case "anthropic":
          const { Anthropic } = require("@anthropic-ai/sdk");
          aiClient = new Anthropic({
            apiKey: providerSettings.apiKey,
          });

          // Call Claude API
          const claudeResponse = await aiClient.messages.create({
            model: modelName,
            max_tokens: providerSettings.maxTokens || 4000,
            messages: [{ role: "user", content: prompt }],
          });
          aiResponse = claudeResponse.content[0].text;
          break;

        case "google":
          const { GoogleGenerativeAI } = require("@google/generative-ai");
          aiClient = new GoogleGenerativeAI(providerSettings.apiKey);

          // Validate model name is in allowed list - updated with complete Google model list
          const validModels = [
            // Gemini 2.5 models
            "gemini-2.5-flash-preview-05-20",
            "gemini-2.5-flash-preview-native-audio-dialog",
            "gemini-2.5-flash-exp-native-audio-thinking-dialog",
            "gemini-2.5-flash-preview-tts",
            "gemini-2.5-pro-preview-05-06",
            "gemini-2.5-pro-preview-tts",
            // Gemini 2.0 models
            "gemini-2.0-flash",
            "gemini-2.0-flash-001", // Stable version
            "gemini-2.0-flash-preview-image-generation",
            "gemini-2.0-flash-lite",
            "gemini-2.0-flash-live-001",
            // Gemini 1.5 models
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "gemini-1.5-pro",
            // Legacy models
            "gemini-1.0-pro",
            "gemini-pro",
            // Embedding models
            "gemini-embedding-exp",
            // Image/Video generation models
            "imagen-3.0-generate-002",
            "veo-2.0-generate-001",
          ];

          if (!validModels.includes(modelName)) {
            throw new Error(
              `Invalid Google Gemini model: "${modelName}". Please use one of the valid models: ${validModels.join(", ")}. For a complete list of available models, visit: https://ai.google.dev/gemini-api/docs/models`
            );
          }

          // Call Gemini API with proper error handling
          try {
            console.log(`Calling Gemini API with model: ${modelName}`);
            const genModel = aiClient.getGenerativeModel({
              model: modelName,
              generationConfig: {
                temperature: providerSettings.temperature || 0.7,
                maxOutputTokens: providerSettings.maxTokens || 1000,
              },
            });

            const geminiResponse = await genModel.generateContent(prompt);

            // Make sure we have a response and it has text content
            if (!geminiResponse || !geminiResponse.response) {
              throw new Error("Empty response from Gemini API");
            }

            // Handle different response structures from Google API
            let responseText = "";
            try {
              responseText = geminiResponse.response.text();
            } catch (textError: any) {
              console.log(
                "Failed to get text() from response, trying alternative methods..."
              );
              console.log(
                "Response structure:",
                JSON.stringify(geminiResponse.response, null, 2)
              );

              // Try to extract text from candidates array directly
              const response = geminiResponse.response;
              if (response.candidates && response.candidates.length > 0) {
                const candidate = response.candidates[0];
                if (
                  candidate.content &&
                  candidate.content.parts &&
                  candidate.content.parts.length > 0
                ) {
                  responseText = candidate.content.parts[0].text || "";
                } else if (
                  candidate.content &&
                  candidate.content.role === "model"
                ) {
                  // Some models return just role without parts - this might be a thinking model
                  responseText =
                    "Response received but content structure is different. Model may be processing.";
                }
              }

              if (!responseText) {
                throw new Error(
                  `Unable to extract text from Google API response for model ${modelName}. Original error: ${textError.message}`
                );
              }
            }

            aiResponse = responseText;

            if (!aiResponse || aiResponse.trim() === "") {
              throw new Error(
                `Empty response text from Gemini API for model ${modelName}`
              );
            }

            console.log("Gemini API response received successfully");
          } catch (geminiError) {
            console.error("Gemini API specific error:", geminiError);
            // Re-throw to be caught by the outer try/catch
            throw geminiError;
          }
          break;

        default: // "openai"
          aiClient = new OpenAI({
            apiKey: providerSettings.apiKey,
          });

          // Call OpenAI API
          const openaiResponse = await aiClient.chat.completions.create({
            model: modelName,
            messages: [{ role: "user", content: prompt }],
            temperature: providerSettings.temperature || 0.7,
            max_tokens: providerSettings.maxTokens || 1000,
          });
          aiResponse = openaiResponse.choices[0]?.message?.content || "";
      }

      // Update job with successful result - store the result in the pullRequestUrl field temporarily
      // since there's no dedicated result field in the schema
      await aiAgentJobs.update(job.id, {
        status: "completed",
        pullRequestUrl: aiResponse, // Using this field to store the response
        adoWorkItemTitle: `AI Response (${new Date().toISOString()})`,
        adoWorkItemType: providerName, // Store the provider name for reference
      });
    } catch (e) {
      console.error(
        `Error processing AI request with provider ${providerName}:`,
        e
      );
      errorMessage = e instanceof Error ? e.message : "Unknown error occurred";

      // Update job with error
      await aiAgentJobs.update(job.id, {
        status: "failed",
        errorMessage,
      });
    }

    // Return the results immediately
    if (errorMessage) {
      return NextResponse.json({
        success: false,
        error: errorMessage,
        jobId: job.id,
        provider: providerName,
      });
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      result: aiResponse,
      provider: providerName,
    });
  } catch (error) {
    console.error("Error executing AI job:", error);
    return NextResponse.json(
      { error: "Failed to execute AI job" },
      { status: 500 }
    );
  }
}
