-- AlterTable
ALTER TABLE "User" ADD COLUMN "email_verification_token" TEXT;
ALTER TABLE "User" ADD COLUMN "email_verification_expires" TIMESTAMP(3);
