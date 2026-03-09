# AI Job Processor Installation Guide

This README provides simple steps to install and run the AI Job Processor on your production server.

## Installation Steps

1. **SSH into your production server**

2. **Navigate to your Portavi application directory**

   ```bash
   cd /var/www/portavi
   ```

3. **Make sure the installation script is executable**

   ```bash
   chmod +x scripts/install-ai-processor-service.sh
   ```

4. **Run the installation script**

   ```bash
   sudo bash scripts/install-ai-processor-service.sh
   ```

5. **Verify the service is running**

   ```bash
   systemctl status ai-job-processor.service
   ```

6. **Test the job processor by creating a test job**
   ```bash
   node scripts/test-ai-job-processor.js
   ```

## Repository Name Handling Fix (May 17, 2025)

We've implemented a fix for handling repository names with spaces in Azure DevOps API calls:

1. **Deploy the fix with a single command**:

   ```bash
   sudo bash deploy-repository-name-fix.sh
   ```

2. **Manually test repositories with spaces**:

   ```bash
   cd /var/www/portavi
   node scripts/test-repo-with-spaces.js
   ```

3. **Reset any failed jobs with spaces in repository names**:

   ```bash
   cd /var/www/portavi
   node scripts/reset-failed-jobs-with-spaces.js
   ```

For detailed documentation on this fix, see:

- `/docs/repository-name-fix.md`
- `/docs/ai-job-processor-deployment.md`

## Troubleshooting

If the service fails to start:

1. Check logs:

   ```bash
   journalctl -u ai-job-processor.service -n 50
   ```

2. Check application logs:

   ```bash
   tail -f /var/www/portavi/scripts/process-ai-jobs.log
   ```

3. Manually run the script to see errors:

   ```bash
   cd /var/www/portavi
   node scripts/process-ai-jobs.ts
   ```

4. Regenerate the Prisma client if needed:
   ```bash
   cd /var/www/portavi
   npx prisma generate
   ```

## Manual Restart

If you need to restart the service:

```bash
sudo systemctl restart ai-job-processor.service
```
