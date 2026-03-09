-- AlterTable
ALTER TABLE "ProjectMember" DROP COLUMN IF EXISTS "hoursPerWeek",
                           DROP COLUMN IF EXISTS "hoursPerMonth";

-- CreateTable
CREATE TABLE "ProjectMemberWeeklyHours" (
    "id" TEXT NOT NULL,
    "projectMemberId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMemberWeeklyHours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMemberWeeklyHours_projectMemberId_year_weekNumber_key" ON "ProjectMemberWeeklyHours"("projectMemberId", "year", "weekNumber");

-- CreateIndex
CREATE INDEX "ProjectMemberWeeklyHours_projectMemberId_idx" ON "ProjectMemberWeeklyHours"("projectMemberId");

-- CreateIndex
CREATE INDEX "ProjectMemberWeeklyHours_year_weekNumber_idx" ON "ProjectMemberWeeklyHours"("year", "weekNumber");

-- AddForeignKey
ALTER TABLE "ProjectMemberWeeklyHours" ADD CONSTRAINT "ProjectMemberWeeklyHours_projectMemberId_fkey" FOREIGN KEY ("projectMemberId") REFERENCES "ProjectMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;