import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

// POST /api/settings/test-ai - Test the configured AI provider with a simple prompt
export async function POST(req: NextRequest) {
  console.log("Test AI provider endpoint called");

  const session = await getServerSession(authOptions);
  console.log(
    "Session in test-ai:",
    JSON.stringify(
      {
        authenticated: !!session?.user,
        userId: session?.user?.id,
        email: session?.user?.email,
        name: session?.user?.name,
        organizationId: session?.user?.organizationId,
      },
      null,
      2
    )
  );

  if (!session?.user) {
    console.log("No authenticated user found");
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // Try to get full user data directly from database to verify organizationId
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log("User from database:", JSON.stringify(dbUser, null, 2));

    // If DB shows user has organization but session doesn't have it
    if (dbUser?.organizationId && !session.user.organizationId) {
      console.log(
        "Organization found in DB but not in session - using DB value"
      );
      session.user.organizationId = dbUser.organizationId;
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Check for organization ID
    if (!session.user.organizationId) {
      console.log("User has no organization - attempting to create one");

      try {
        // Create an organization for the user
        const orgName =
          session.user.name ||
          session.user.email?.split("@")[0] ||
          "My Organization";
        console.log("Creating organization with name:", orgName);

        const organization = await prisma.organization.create({
          data: { name: orgName },
        });

        // Update the user with the new organization ID
        await prisma.user.update({
          where: { id: session.user.id },
          data: { organizationId: organization.id },
        });

        console.log(
          "Created organization and linked to user:",
          organization.id
        );

        // Since we just created the organization, the user won't have AI settings yet
        return NextResponse.json({
          success: true,
          message: `Organization "${orgName}" has been created for your account. Please configure AI provider settings before testing.`,
          needsConfig: true,
        });
      } catch (error) {
        console.error("Failed to create organization:", error);
        return NextResponse.json(
          { error: "Unable to create organization for your account" },
          { status: 500 }
        );
      }
    }

    // Get the organization's AI provider settings
    const orgId = session.user.organizationId;
    const aiSettings = await prisma.aIProviderSettings.findFirst({
      where: { organizationId: orgId },
    });

    if (!aiSettings) {
      return NextResponse.json(
        {
          success: false,
          error: "No AI provider settings found for your organization",
          needsConfig: true,
        },
        { status: 404 }
      );
    }

    console.log(
      `Using AI provider: ${aiSettings.provider} with model: ${aiSettings.model}`
    );

    // Process based on the provider
    let response;

    if (aiSettings.provider.toLowerCase().includes("openai")) {
      response = await testOpenAI(aiSettings, prompt);
    } else if (
      aiSettings.provider.toLowerCase().includes("gemini") ||
      aiSettings.provider.toLowerCase().includes("google")
    ) {
      response = await testGemini(aiSettings, prompt);
    } else if (
      aiSettings.provider.toLowerCase().includes("anthropic") ||
      aiSettings.provider.toLowerCase().includes("claude")
    ) {
      response = await testClaude(aiSettings, prompt);
    } else {
      // Generic fallback response for unsupported providers
      response = {
        success: false,
        message: `Provider "${aiSettings.provider}" is not currently supported. Supported providers are OpenAI, Google Gemini, and Claude.`,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error testing AI provider:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to test AI provider",
        success: false,
      },
      { status: 500 }
    );
  }
}

// OpenAI integration - Real API connection
async function testOpenAI(aiSettings: any, prompt: string) {
  try {
    if (!aiSettings.apiKey) {
      return {
        success: false,
        message: "OpenAI API key is missing. Please add it in the settings.",
      };
    }

    const openai = new OpenAI({
      apiKey: aiSettings.apiKey,
    });

    const model = aiSettings.model || "gpt-4";
    const temperature = aiSettings.temperature || 0.7;
    const maxTokens = aiSettings.maxTokens || 1000;

    console.log(
      `Calling OpenAI API with model: ${model}, temperature: ${temperature}, maxTokens: ${maxTokens}`
    );

    const completion = await openai.chat.completions.create({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    const responseContent =
      completion.choices[0]?.message?.content || "No response generated.";
    return {
      success: true,
      message: responseContent,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? `OpenAI API Error: ${error.message}`
          : "Unknown error occurred while calling OpenAI API",
    };
  }
}

// Google Gemini integration - Real API connection
async function testGemini(aiSettings: any, prompt: string) {
  try {
    if (!aiSettings.apiKey) {
      return {
        success: false,
        message: "Google AI API key is missing. Please add it in the settings.",
      };
    }

    const genAI = new GoogleGenerativeAI(aiSettings.apiKey);
    const modelName = aiSettings.model || "gemini-1.5-pro";

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
      return {
        success: false,
        message: `Invalid Google Gemini model: "${modelName}". Please use one of the valid models: ${validModels.join(", ")}. For a complete list of available models, visit: https://ai.google.dev/gemini-api/docs/models`,
      };
    }

    console.log(
      `Calling Gemini API with model: ${modelName}, temperature: ${aiSettings.temperature}, maxTokens: ${aiSettings.maxTokens}`
    );

    const geminiModel = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: aiSettings.temperature || 0.7,
        maxOutputTokens: aiSettings.maxTokens || 1000,
      },
    });

    const result = await geminiModel.generateContent(prompt);
    const response = result.response;

    // Handle different response structures from Google API
    let responseText = "";
    try {
      responseText = response.text();
    } catch (textError) {
      console.log(
        "Failed to get text() from response, trying alternative methods..."
      );
      console.log("Response structure:", JSON.stringify(response, null, 2));

      // Try to extract text from candidates array directly
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (
          candidate.content &&
          candidate.content.parts &&
          candidate.content.parts.length > 0
        ) {
          responseText = candidate.content.parts[0].text || "";
        } else if (candidate.content && candidate.content.role === "model") {
          // Some models return just role without parts - this might be a thinking model
          responseText =
            "Response received but content structure is different. Model may be processing.";
        }
      }

      if (!responseText) {
        console.error("Could not extract text from response:", textError);
        return {
          success: false,
          message: `Unable to extract text from Google API response for model ${modelName}. Response structure: ${JSON.stringify(response, null, 2)}`,
        };
      }
    }

    if (!responseText || responseText.trim() === "") {
      return {
        success: false,
        message: `Empty response from Google API for model ${modelName}. The model may not be available or the API key may be invalid.`,
      };
    }

    return {
      success: true,
      message: responseText,
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? `Gemini API Error: ${error.message}`
          : "Unknown error occurred while calling Gemini API",
    };
  }
}

// Anthropic Claude integration - Real API connection
async function testClaude(aiSettings: any, prompt: string) {
  try {
    if (!aiSettings.apiKey) {
      return {
        success: false,
        message: "Anthropic API key is missing. Please add it in the settings.",
      };
    }

    const anthropic = new Anthropic({
      apiKey: aiSettings.apiKey,
    });

    const model = aiSettings.model || "claude-3-opus-20240229";
    const temperature = aiSettings.temperature || 0.7;
    const maxTokens = aiSettings.maxTokens || 1000;

    console.log(
      `Calling Claude API with model: ${model}, temperature: ${temperature}, maxTokens: ${maxTokens}`
    );

    const message = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: "user", content: prompt }],
      system: "You are a helpful AI assistant.",
    });

    // Handle different content block types in the Anthropic API response
    let responseText = "";
    if (message.content && message.content.length > 0) {
      for (const block of message.content) {
        if ("type" in block && block.type === "text" && "text" in block) {
          responseText += block.text;
        }
      }
    }

    return {
      success: true,
      message: responseText || "No text content found in the response",
    };
  } catch (error) {
    console.error("Claude API error:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? `Claude API Error: ${error.message}`
          : "Unknown error occurred while calling Claude API",
    };
  }
}
