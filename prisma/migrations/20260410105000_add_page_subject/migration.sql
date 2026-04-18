-- Add subject to Page for lecture statistics by subject.

ALTER TABLE "Page"
  ADD COLUMN IF NOT EXISTS "subject" TEXT;

CREATE INDEX IF NOT EXISTS "Page_subject_idx" ON "Page"("subject");
