-- AlterTable
ALTER TABLE "User" ADD COLUMN     "licenseType" TEXT NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "AIProviderSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIProviderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAgentSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIAgentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAgentJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "repositoryName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "pullRequestUrl" TEXT,
    "errorMessage" TEXT,
    "adoWorkItemId" TEXT,
    "adoWorkItemTitle" TEXT,
    "adoWorkItemType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIAgentJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIProviderSettings_organizationId_provider_key" ON "AIProviderSettings"("organizationId", "provider");

-- AddForeignKey
ALTER TABLE "AIProviderSettings" ADD CONSTRAINT "AIProviderSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAgentSettings" ADD CONSTRAINT "AIAgentSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAgentJob" ADD CONSTRAINT "AIAgentJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
