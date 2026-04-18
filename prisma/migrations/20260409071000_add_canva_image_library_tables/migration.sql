-- Create Canva image library tables missing from previous migrations.
-- This migration is safe to run on PostgreSQL production.

CREATE TABLE IF NOT EXISTS "CanvaImageAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'upload',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvaImageAsset_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CanvaImageAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CanvaBlockImageRef" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CanvaBlockImageRef_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CanvaBlockImageRef_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "CanvaImageAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CanvaImageAsset_userId_hash_key" ON "CanvaImageAsset"("userId", "hash");
CREATE INDEX IF NOT EXISTS "CanvaImageAsset_userId_isVisible_idx" ON "CanvaImageAsset"("userId", "isVisible");
CREATE INDEX IF NOT EXISTS "CanvaImageAsset_hash_idx" ON "CanvaImageAsset"("hash");

CREATE UNIQUE INDEX IF NOT EXISTS "CanvaBlockImageRef_blockId_imageId_key" ON "CanvaBlockImageRef"("blockId", "imageId");
CREATE INDEX IF NOT EXISTS "CanvaBlockImageRef_blockId_idx" ON "CanvaBlockImageRef"("blockId");
CREATE INDEX IF NOT EXISTS "CanvaBlockImageRef_imageId_idx" ON "CanvaBlockImageRef"("imageId");
