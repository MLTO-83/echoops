/*
  Warnings:

  - A unique constraint covering the columns `[adoUserId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adoUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_adoUserId_key" ON "User"("adoUserId");
