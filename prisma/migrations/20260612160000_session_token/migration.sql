-- AlterTable
ALTER TABLE "Presence" ADD COLUMN "token" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
