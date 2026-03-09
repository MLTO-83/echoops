-- This migration adds missing indexes on foreign keys 
-- based on the schema audit from April 27, 2025

-- User foreign key to Organization
CREATE INDEX IF NOT EXISTS "idx_User_organizationId" ON "User"("organizationId");

-- Account foreign key to User
CREATE INDEX IF NOT EXISTS "idx_Account_userId" ON "Account"("userId");

-- Session foreign key to User
CREATE INDEX IF NOT EXISTS "idx_Session_userId" ON "Session"("userId");

-- Authenticator foreign key to User
CREATE INDEX IF NOT EXISTS "idx_Authenticator_userId" ON "Authenticator"("userId");

-- Project foreign key to ADOConnection
CREATE INDEX IF NOT EXISTS "idx_Project_adoConnectionId" ON "Project"("adoConnectionId");

-- AIAgentSettings foreign key to User
CREATE INDEX IF NOT EXISTS "idx_AIAgentSettings_userId" ON "AIAgentSettings"("userId");

-- AIAgentJob foreign key to Project
CREATE INDEX IF NOT EXISTS "idx_AIAgentJob_projectId" ON "AIAgentJob"("projectId");