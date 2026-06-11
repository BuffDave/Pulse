-- AlterTable
ALTER TABLE "Presence" ADD COLUMN "broadcastText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Presence" ADD COLUMN "broadcastAt" TIMESTAMP(3);
