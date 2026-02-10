-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password_reset_token" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password_reset_expires" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Content" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Content_slug_key" ON "Content"("slug");

-- CreateIndex (for lookups by slug)
CREATE INDEX IF NOT EXISTS "Content_slug_idx" ON "Content"("slug");
