-- AlterTable
ALTER TABLE "Presence" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Presence" ADD COLUMN IF NOT EXISTS "gender" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Presence" ADD COLUMN IF NOT EXISTS "location" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Presence" ADD COLUMN IF NOT EXISTS "mood" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_reportedId_idx" ON "Report"("reportedId");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");
