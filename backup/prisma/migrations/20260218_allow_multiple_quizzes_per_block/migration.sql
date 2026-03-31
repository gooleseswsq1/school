/*
  Warnings:

  - You are about to alter the `Quiz` table. Drop the unique constraint on column `blockId` if it exists.
  - This allows multiple quizzes per block (like multiple questions quizzes on one page)

*/
-- DropIndex
DROP INDEX IF EXISTS "Quiz_blockId_key";

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex - for efficient querying of quizzes by block and order
CREATE INDEX "Quiz_blockId_order_idx" ON "Quiz"("blockId", "order");
