-- Allow one student to link with the same teacher across multiple classes.
-- Legacy schema had unique(studentId, teacherId), which blocked class-specific links.
DROP INDEX IF EXISTS "StudentTeacher_studentId_teacherId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "StudentTeacher_studentId_teacherId_classId_key"
ON "StudentTeacher"("studentId", "teacherId", "classId");
