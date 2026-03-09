-- Create the LicenseType ENUM if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'licensetype') THEN
        CREATE TYPE "public"."LicenseType" AS ENUM ('FREE', 'BASIC', 'AI_AGENT');
    END IF;
END$$;

-- If the User table already has a licenseType column that's not of enum type, fix it
DO $$
BEGIN
    -- Check if the User table exists and has a licenseType column
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'User'
        AND column_name = 'licenseType'
    ) THEN
        -- Create a temporary column with the correct type
        ALTER TABLE "public"."User" ADD COLUMN "licenseType_new" "LicenseType" DEFAULT 'FREE';
        
        -- Update the new column with values from the old one if possible
        UPDATE "public"."User"
        SET "licenseType_new" = CAST(
            CASE
                WHEN "licenseType"::text = 'FREE' THEN 'FREE'
                WHEN "licenseType"::text = 'BASIC' THEN 'BASIC'
                WHEN "licenseType"::text = 'AI_AGENT' THEN 'AI_AGENT'
                ELSE 'FREE'
            END AS "LicenseType"
        );
        
        -- Drop the old column and rename the new one
        ALTER TABLE "public"."User" DROP COLUMN "licenseType";
        ALTER TABLE "public"."User" RENAME COLUMN "licenseType_new" TO "licenseType";
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        -- Table doesn't exist, nothing to do
    WHEN undefined_column THEN
        -- Column doesn't exist, nothing to do
END$$;