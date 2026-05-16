-- Add verification code system for anti-fraud task completion

-- Add fields to tasks table for landing page system
ALTER TABLE "tasks" ADD COLUMN "slug" TEXT;
ALTER TABLE "tasks" ADD COLUMN "referralLink" TEXT;
ALTER TABLE "tasks" ADD COLUMN "instructions" TEXT;
ALTER TABLE "tasks" ADD COLUMN "requiresCode" BOOLEAN NOT NULL DEFAULT false;

-- Add unique constraint on slug
CREATE UNIQUE INDEX "tasks_slug_key" ON "tasks"("slug");

-- Add index for slug lookups
CREATE INDEX "tasks_slug_idx" ON "tasks"("slug");

-- Add verification code fields to task_sessions
ALTER TABLE "task_sessions" ADD COLUMN "verificationCode" TEXT;
ALTER TABLE "task_sessions" ADD COLUMN "codeGeneratedAt" TIMESTAMP(3);
ALTER TABLE "task_sessions" ADD COLUMN "codeViewedAt" TIMESTAMP(3);

-- Add index for verification code lookups
CREATE INDEX "task_sessions_verificationCode_idx" ON "task_sessions"("verificationCode");
