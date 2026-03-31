/*
  Warnings:

  - Made the `status` column on the `Document` table required. Its type was String.

*/
-- UpdateData
UPDATE "Document" SET "status" = 'submitted' WHERE "status" IS NULL;

-- AlterTable - For SQLite, we just need to ensure the column has a default value
PRAGMA foreign_keys=OFF;
CREATE TABLE "Document_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "authorId" TEXT NOT NULL,
    "score" INTEGER,
    "isAchieved" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "gradedBy" TEXT,
    "gradedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE
);
INSERT INTO "Document_new" SELECT * FROM "Document";
DROP TABLE "Document";
ALTER TABLE "Document_new" RENAME TO "Document";
CREATE INDEX "Document_authorId_idx" on "Document"("authorId");
CREATE INDEX "Document_fileType_idx" on "Document"("fileType");
CREATE INDEX "Document_createdAt_idx" on "Document"("createdAt");
CREATE INDEX "Document_status_idx" on "Document"("status");
PRAGMA foreign_keys=ON;

