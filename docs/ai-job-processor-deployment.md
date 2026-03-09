# AI Job Processor Deployment Guide

This guide explains how to deploy the AI Job Processor service to process AI agent jobs in the background.

## Prerequisites

- Node.js v18+ installed
- Access to the Portavi application server
- Sudo/root privileges for installing systemd services

## Deployment Steps

1. **First, clone or update the repository**

   Make sure you have the latest code from the repository.

2. **Install dependencies**

   ```bash
   cd /path/to/portavi
   npm install
   ```

3. **Generate Prisma client**

   ```bash
   npx prisma generate
   ```

4. **Run the installation script**

   ```bash
   sudo bash scripts/install-ai-processor-service.sh
   ```

   This will:

   - Copy the service file to systemd
   - Reload the systemd daemon
   - Enable and start the service

5. **Verify the service is running**

   ```bash
   systemctl status ai-job-processor.service
   ```

   You should see output indicating that the service is active (running).

6. **Check the logs**

   The service will create logs in two places:

   - Systemd logs: `journalctl -u ai-job-processor.service`
   - Application logs: `/path/to/portavi/scripts/process-ai-jobs.log`

## Updating the AI Job Processor

When you need to update the AI Job Processor code:

1. **Use the update script**

   ```bash
   sudo bash scripts/update-pr-url-format.sh
   ```

   This will:

   - Pull the latest changes
   - Compile the TypeScript code to JavaScript
   - Copy files to the deployment location
   - Restart the service

2. **Test the updated service**

   ```bash
   # Basic test
   cd /var/www/portavi && node scripts/test-ai-job-processor.js

   # Test with repository names containing spaces
   cd /var/www/portavi && node scripts/test-repo-with-spaces.js
   ```

## Recent Updates

### May 17, 2025: Repository Name URL Encoding Fix

1. **Issue Fixed**:

   - Fixed handling of repository names with spaces in Azure DevOps API calls
   - All repository names are now URL-encoded before being used in API endpoints
   - Added detailed error logging for API responses

2. **Additional Tools**:
   - `test-repo-with-spaces.js`: Test script specifically for repositories with spaces in names
   - `reset-failed-jobs-with-spaces.js`: Reset utility for failed jobs with spaces in repository names
3. **Documentation**:
   - Added detailed documentation in `/docs/repository-name-fix.md`

### May 14, 2025: Permission Fix for AI Job Retry

1. **Issue Fixed**:

   - Removed project membership requirement for retrying AI jobs
   - Added `dynamic = "force-dynamic"` to ensure API routes aren't cached
   - Fixed pull request URL generation for Azure DevOps

2. **Additional Tools**:
   - `test-ai-job-processor.js`: Test script to verify AI job processing
   - `reset-failed-jobs.js`: Utility to reset failed AI jobs

## Troubleshooting

If the service is not processing jobs correctly:

1. Check if the service is running:

   ```bash
   systemctl status ai-job-processor.service
   ```

2. View the logs:

   ```bash
   tail -f /path/to/portavi/scripts/process-ai-jobs.log
   ```

3. Reset failed jobs if needed:

   ```bash
   # Reset all failed jobs
   cd /var/www/portavi && node scripts/reset-failed-jobs.js

   # Reset a specific failed job
   cd /var/www/portavi && node scripts/reset-specific-job.js <job-id>

   # Reset failed jobs with spaces in repository names
   cd /var/www/portavi && node scripts/reset-failed-jobs-with-spaces.js
   ```

4. Check if there are any PENDING jobs in the database:

   ```bash
   npx prisma studio
   ```

   Then navigate to the AIAgentJob table and look for jobs with status "PENDING".

5. Restart the service if necessary:
   ```bash
   systemctl restart ai-job-processor.service
   ```

## Understanding the Flow

1. When webhooks are active, jobs are created in the AIAgentJob table with status "PENDING"
2. The AI Job Processor polls the database for PENDING jobs
3. When it finds a job, it updates the status to "PROCESSING"
4. It calls the AI provider API with the job prompt
5. It creates a pull request with the generated code
6. It updates the job status to either "COMPLETED" or "FAILED"

The AIProgressSection component in the UI displays these jobs and their current status.
