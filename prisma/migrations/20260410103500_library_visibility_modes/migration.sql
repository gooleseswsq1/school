-- Add public/class-scoped visibility for teacher library files.
-- PUBLIC: visible to all students
-- CLASS: visible only to students linked to the same class (or shared teacher links when classId is null)

ALTER TABLE "LibraryFile"
  ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'PUBLIC';

ALTER TABLE "LibraryFile"
  ADD COLUMN IF NOT EXISTS "classId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'LibraryFile_classId_fkey'
  ) THEN
    ALTER TABLE "LibraryFile"
      ADD CONSTRAINT "LibraryFile_classId_fkey"
      FOREIGN KEY ("classId") REFERENCES "Class"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "LibraryFile_classId_idx" ON "LibraryFile"("classId");
CREATE INDEX IF NOT EXISTS "LibraryFile_visibility_idx" ON "LibraryFile"("visibility");
