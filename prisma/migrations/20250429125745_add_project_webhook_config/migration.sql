/*
  Warnings:

  - Made the column `licenseType` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "idx_AIAgentJob_projectId";

-- DropIndex
DROP INDEX "idx_AIAgentSettings_userId";

-- DropIndex
DROP INDEX "idx_Account_userId";

-- DropIndex
DROP INDEX "idx_Authenticator_userId";

-- DropIndex
DROP INDEX "idx_Project_adoConnectionId";

-- DropIndex
DROP INDEX "idx_Session_userId";

-- DropIndex
DROP INDEX "idx_User_organizationId";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "licenseType" SET NOT NULL;

-- CreateTable
CREATE TABLE "ProjectWebhookConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectWebhookConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectWebhookConfig_projectId_key" ON "ProjectWebhookConfig"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectWebhookConfig" ADD CONSTRAINT "ProjectWebhookConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
