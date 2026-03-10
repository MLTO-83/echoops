#!/bin/bash

# Google Gemini API Test Script
# This script tests the Google Gemini API directly using curl

API_KEY="${GOOGLE_API_KEY:?Error: GOOGLE_API_KEY environment variable is not set}"
MODEL="gemini-2.5-pro-preview-05-06"
PROMPT="What is the meaning for code review?"

echo "=== Google Gemini API Test ==="
echo "API Key: ***${API_KEY: -4}"
echo "Model: $MODEL"
echo "Prompt: $PROMPT"
echo ""

# Test 1: Try the specific model that's configured
echo "--- Test 1: Testing configured model ($MODEL) ---"
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{
        "text": "'"$PROMPT"'"
      }]
    }],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 1000
    }
  }' | jq '.' 2>/dev/null || echo "Response (raw):"

echo -e "\n\n"

# Test 2: Try a more stable model
STABLE_MODEL="gemini-1.5-pro"
echo "--- Test 2: Testing stable model ($STABLE_MODEL) ---"
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/${STABLE_MODEL}:generateContent?key=${API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{
        "text": "'"$PROMPT"'"
      }]
    }],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 1000
    }
  }' | jq '.' 2>/dev/null || echo "Response (raw):"

echo -e "\n\n"

# Test 3: List available models to see what's accessible
echo "--- Test 3: Listing available models ---"
curl -X GET \
  "https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}" \
  -H 'Content-Type: application/json' | jq '.models[] | {name: .name, displayName: .displayName}' 2>/dev/null || echo "Response (raw):"

echo -e "\n\n"

# Test 4: Simple API key validation
echo "--- Test 4: API Key validation test ---"
curl -X GET \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro?key=${API_KEY}" \
  -H 'Content-Type: application/json' | jq '.' 2>/dev/null || echo "Response (raw):"

echo -e "\n=== Test Complete ==="
