-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT,
    "shortcutCode" TEXT,
    "shortcutUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContentItem_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "PageBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ContentItem_blockId_idx" ON "ContentItem"("blockId");

-- CreateIndex
CREATE INDEX "ContentItem_shortcutCode_idx" ON "ContentItem"("shortcutCode");
