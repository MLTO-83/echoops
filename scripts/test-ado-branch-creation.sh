#!/bin/bash

# Test script for ADO Branch Creation Server
# Usage: ./test-ado-branch-creation.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Azure DevOps Branch Creation Test Script ===${NC}"
echo ""

# Check if server is running
echo -e "${YELLOW}Checking if test server is running...${NC}"
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not running. Please start it first:${NC}"
    echo "   node test-ado-branch-creation-server.js"
    exit 1
fi

echo ""
echo -e "${YELLOW}Please provide the following information:${NC}"

# Prompt for inputs
read -p "Personal Access Token (PAT): " -s PAT
echo ""
read -p "Organization URL (e.g., https://dev.azure.com/yourorg): " ORG_URL
read -p "Project Name: " PROJECT_NAME
read -p "Repository Name: " REPO_NAME
read -p "Feature Branch Name (e.g., feature/test-branch-123): " BRANCH_NAME

echo ""
echo -e "${YELLOW}Making test request...${NC}"

# Create JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
  "pat": "$PAT",
  "organizationUrl": "$ORG_URL",
  "projectName": "$PROJECT_NAME",
  "repositoryName": "$REPO_NAME",
  "featureBranchName": "$BRANCH_NAME"
}
EOF
)

# Make the request
RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST http://localhost:3001/test-branch-creation \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

# Extract HTTP status and body
HTTP_STATUS=$(echo $RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
BODY=$(echo $RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

echo ""
echo -e "${YELLOW}=== Test Results ===${NC}"
echo "HTTP Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ SUCCESS: Branch creation test passed!${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ FAILED: Branch creation test failed${NC}"
    echo ""
    echo "Error Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""
echo -e "${YELLOW}=== Test Complete ===${NC}"
