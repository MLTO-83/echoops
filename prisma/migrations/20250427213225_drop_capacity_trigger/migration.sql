-- Drop legacy capacity-check triggers and function
DROP TRIGGER IF EXISTS check_insert_user_capacity ON "ProjectMember" CASCADE;
DROP TRIGGER IF EXISTS check_update_user_capacity ON "ProjectMember" CASCADE;
DROP TRIGGER IF EXISTS check_user_capacity ON "ProjectMember" CASCADE;
DROP FUNCTION IF EXISTS check_user_capacity() CASCADE;
