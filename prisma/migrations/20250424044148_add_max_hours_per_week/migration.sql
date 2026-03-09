-- AlterTable
ALTER TABLE "ProjectMember" ALTER COLUMN "role" SET DEFAULT 'OWNER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "maxHoursPerWeek" DOUBLE PRECISION NOT NULL DEFAULT 40;

-- Create a function to check if a user would be overbooked
CREATE OR REPLACE FUNCTION check_user_capacity()
RETURNS TRIGGER AS $$
DECLARE
    total_hours DOUBLE PRECISION;
    max_hours DOUBLE PRECISION;
BEGIN
    -- For INSERT operations
    IF (TG_OP = 'INSERT') THEN
        -- Get user's maximum hours per week
        SELECT "maxHoursPerWeek" INTO max_hours
        FROM "User"
        WHERE id = NEW."userId";
        
        -- Get total allocated hours for the user (excluding this new entry)
        SELECT COALESCE(SUM("hoursPerWeek"), 0) INTO total_hours
        FROM "ProjectMember"
        WHERE "userId" = NEW."userId";
        
        -- Check if adding new hours would exceed capacity
        IF (total_hours + NEW."hoursPerWeek" > max_hours) THEN
            RAISE EXCEPTION 'Adding % hours would exceed user capacity of % hours. Current total: % hours.',
                NEW."hoursPerWeek", max_hours, total_hours;
        END IF;
        
        RETURN NEW;
    
    -- For UPDATE operations
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only check if hoursPerWeek is being changed
        IF NEW."hoursPerWeek" <> OLD."hoursPerWeek" THEN
            -- Get user's maximum hours per week
            SELECT "maxHoursPerWeek" INTO max_hours
            FROM "User"
            WHERE id = NEW."userId";
            
            -- Get total allocated hours for the user (excluding this updated entry)
            SELECT COALESCE(SUM("hoursPerWeek"), 0) INTO total_hours
            FROM "ProjectMember"
            WHERE "userId" = NEW."userId" AND id <> NEW.id;
            
            -- Check if updated hours would exceed capacity
            IF (total_hours + NEW."hoursPerWeek" > max_hours) THEN
                RAISE EXCEPTION 'Updating to % hours would exceed user capacity of % hours. Current total: % hours.',
                    NEW."hoursPerWeek", max_hours, total_hours;
            END IF;
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL; -- Should never reach here
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT operations
CREATE TRIGGER check_insert_user_capacity
BEFORE INSERT ON "ProjectMember"
FOR EACH ROW
EXECUTE FUNCTION check_user_capacity();

-- Create trigger for UPDATE operations
CREATE TRIGGER check_update_user_capacity
BEFORE UPDATE ON "ProjectMember"
FOR EACH ROW
EXECUTE FUNCTION check_user_capacity();
