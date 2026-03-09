#!/bin/bash
# Deployment script to update the AI job processor on production server

# Show commands being executed
set -x

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting AI job processor update...${NC}"

# Navigate to the project directory
cd /var/www/echoops || cd /root/echoops

# Pull latest changes from Git repo
echo -e "${GREEN}Pulling latest changes...${NC}"
git stash
git pull

# Copy the updated process-ai-jobs.ts to the production server
echo -e "${GREEN}Ensuring scripts directory exists...${NC}"
mkdir -p /var/www/echoops/scripts

echo -e "${GREEN}Copying updated process-ai-jobs.ts...${NC}"
cp -f /root/echoops/scripts/process-ai-jobs.ts /var/www/echoops/scripts/

echo -e "${GREEN}Copying test script for repositories with spaces...${NC}"
cp -f /root/echoops/scripts/test-repo-with-spaces.js /var/www/echoops/scripts/

echo -e "${GREEN}Copying utility to reset failed jobs with spaces...${NC}"
cp -f /root/echoops/scripts/reset-failed-jobs-with-spaces.js /var/www/echoops/scripts/

echo -e "${GREEN}Compiling TypeScript to JavaScript...${NC}"
cd /var/www/echoops
# Ensure npx and typescript are available
if ! command -v npx &> /dev/null; then
  echo -e "${RED}npx not found, installing typescript globally...${NC}"
  npm install -g typescript
  tsc /var/www/echoops/scripts/process-ai-jobs.ts --esModuleInterop
else
  npx tsc /var/www/echoops/scripts/process-ai-jobs.ts --esModuleInterop
fi

# Check if compilation was successful
if [ -f "/var/www/echoops/scripts/process-ai-jobs.js" ]; then
  echo -e "${GREEN}Compilation successful!${NC}"
else
  echo -e "${RED}Compilation failed! Trying a simpler approach...${NC}"
  cd /var/www/echoops
  # Use Node to compile it
  node -e "require('@babel/core').transformFileSync('./scripts/process-ai-jobs.ts', {presets: ['@babel/preset-typescript']}).code" > ./scripts/process-ai-jobs.js
fi

# Ensure the JS file has the right permissions
chmod +x /var/www/echoops/scripts/process-ai-jobs.js

# Restart the AI job processor service
echo -e "${GREEN}Restarting AI job processor service...${NC}"
systemctl restart ai-job-processor.service

# Check service status
echo -e "${GREEN}Checking service status...${NC}"
systemctl status ai-job-processor.service

echo -e "${GREEN}Update complete!${NC}"
echo -e "${GREEN}Run a test job to verify branch creation and PR URL generation is working correctly:${NC}"
echo -e "${GREEN}cd /var/www/echoops && node scripts/test-ai-job-processor.js${NC}"
echo -e "${GREEN}To specifically test repositories with spaces in their names:${NC}"
echo -e "${GREEN}cd /var/www/echoops && node scripts/test-repo-with-spaces.js${NC}"

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}Additional debugging commands:${NC}"
echo -e "${GREEN}1. Check the AI job processor service status:${NC}"
echo -e "${GREEN}   systemctl status ai-job-processor.service${NC}"
echo -e "${GREEN}2. View the processor logs:${NC}"
echo -e "${GREEN}   tail -f /var/www/echoops/scripts/process-ai-jobs.log${NC}"
echo -e "${GREEN}3. Reset a specific failed job:${NC}"
echo -e "${GREEN}   cd /var/www/echoops && node scripts/reset-specific-job.js <job-id>${NC}"
echo -e "${GREEN}4. Reset all failed jobs:${NC}"
echo -e "${GREEN}   cd /var/www/echoops && node scripts/reset-failed-jobs.js${NC}"
echo -e "${GREEN}5. Reset all failed jobs with spaces in repository names:${NC}"
echo -e "${GREEN}   cd /var/www/echoops && node scripts/reset-failed-jobs-with-spaces.js${NC}"
