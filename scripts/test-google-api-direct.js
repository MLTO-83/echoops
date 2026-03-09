// Test Google Gemini API directly
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGoogleAPI() {
  try {
    console.log("=== Testing Google Gemini API Directly ===");

    // Your API key from the database
    const apiKey = "AIzaSyARhmrn-Refh1Cp5ltuN_6pWi3RbTQazQc";
    const modelName = "gemini-2.5-pro-preview-05-06";
    const prompt = "What is the meaning for code review?";

    console.log("Using API Key:", apiKey);
    console.log("Using Model:", modelName);
    console.log("Using Prompt:", prompt);

    const genAI = new GoogleGenerativeAI(apiKey);

    console.log("\n--- Step 1: Testing API Key Validity ---");
    try {
      // Try to get the model first
      const model = genAI.getGenerativeModel({ model: modelName });
      console.log("✅ Model object created successfully");

      console.log("\n--- Step 2: Testing Model Generation ---");
      const result = await model.generateContent(prompt);
      console.log("✅ Generate content call completed");

      console.log("\n--- Step 3: Checking Response ---");
      const response = result.response;
      console.log("Response object:", response);

      if (!response) {
        console.log("❌ No response object returned");
        return;
      }

      console.log("\n--- Step 4: Getting Text ---");
      const text = response.text();
      console.log("Response text length:", text?.length || 0);
      console.log("Response text:", text);

      if (!text || text.trim() === "") {
        console.log("❌ Empty response text");

        // Let's check the full response structure
        console.log("\n--- Full Response Structure ---");
        console.log("Full response:", JSON.stringify(response, null, 2));

        // Check if there are any candidates
        console.log("\n--- Candidates Check ---");
        if (response.candidates) {
          console.log("Candidates length:", response.candidates.length);
          response.candidates.forEach((candidate, index) => {
            console.log(
              `Candidate ${index}:`,
              JSON.stringify(candidate, null, 2)
            );
          });
        }

        // Check if there are any prompt feedback issues
        console.log("\n--- Prompt Feedback Check ---");
        if (response.promptFeedback) {
          console.log(
            "Prompt feedback:",
            JSON.stringify(response.promptFeedback, null, 2)
          );
        }
      } else {
        console.log("✅ Successfully got response text");
      }
    } catch (modelError) {
      console.error("❌ Model error:", modelError.message);
      console.error("Error details:", modelError);

      // Check if it's a specific model availability issue
      if (
        modelError.message.includes("model") ||
        modelError.message.includes("not found")
      ) {
        console.log("\n--- Trying Alternative Model ---");
        try {
          const altModel = genAI.getGenerativeModel({
            model: "gemini-1.5-pro",
          });
          const altResult = await altModel.generateContent(prompt);
          const altText = altResult.response.text();
          console.log("✅ Alternative model works! Response:", altText);
        } catch (altError) {
          console.error("❌ Alternative model also failed:", altError.message);
        }
      }
    }
  } catch (error) {
    console.error("❌ General error:", error.message);
    console.error("Error stack:", error.stack);
  }
}

testGoogleAPI();
