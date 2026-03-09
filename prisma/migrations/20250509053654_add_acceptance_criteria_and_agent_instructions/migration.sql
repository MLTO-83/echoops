-- AlterTable
ALTER TABLE "ADOWorkItem" ADD COLUMN     "acceptanceCriteria" TEXT;

-- AlterTable
ALTER TABLE "ProgramType" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ProjectWebhookConfig" ADD COLUMN     "agentInstructions" TEXT,
ADD COLUMN     "description" TEXT;
