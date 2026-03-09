#!/bin/bash

# Simple Google Gemini API Test Script (no jq dependency)
# This script tests the Google Gemini API directly using curl

API_KEY="AIzaSyArd5SoUhVSil2LNfMp1T8gu06FqxKA5ME"
MODEL="gemini-2.5-pro-preview-05-06"
PROMPT="What is the meaning for code review?"

echo "=== Google Gemini API Test ==="
echo "API Key: $API_KEY"
echo "Model: $MODEL"
echo "Prompt: $PROMPT"
echo ""

# Test 1: Try the specific model that's configured
echo "--- Test 1: Testing configured model ($MODEL) ---"
response1=$(curl -s -X POST \
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
  }')

echo "Response 1:"
echo "$response1"
echo ""

# Check if response contains error
if echo "$response1" | grep -q '"error"'; then
    echo "❌ Error detected in response 1"
else
    echo "✅ No error in response 1"
fi

echo -e "\n--- Test 2: Testing stable model (gemini-1.5-pro) ---"
response2=$(curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${API_KEY}" \
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
  }')

echo "Response 2:"
echo "$response2"
echo ""

# Check if response contains error
if echo "$response2" | grep -q '"error"'; then
    echo "❌ Error detected in response 2"
else
    echo "✅ No error in response 2"
fi

echo -e "\n--- Test 3: API Key validation ---"
response3=$(curl -s -X GET \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro?key=${API_KEY}" \
  -H 'Content-Type: application/json')

echo "API Key validation response:"
echo "$response3"
echo ""

# Check if response contains error
if echo "$response3" | grep -q '"error"'; then
    echo "❌ API Key validation failed"
else
    echo "✅ API Key validation passed"
fi

echo -e "\n=== Test Summary ==="
echo "Test 1 (${MODEL}): $(if echo "$response1" | grep -q '"error"'; then echo "FAILED"; else echo "PASSED"; fi)"
echo "Test 2 (gemini-1.5-pro): $(if echo "$response2" | grep -q '"error"'; then echo "FAILED"; else echo "PASSED"; fi)"
echo "Test 3 (API Key): $(if echo "$response3" | grep -q '"error"'; then echo "FAILED"; else echo "PASSED"; fi)"
