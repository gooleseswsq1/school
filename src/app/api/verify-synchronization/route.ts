import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Verify student submission synchronization status
 * Checks that submissions are properly saved and accessible
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      // Return overall synchronization stats
      const totalSubmissions = await prisma.document.count();
      const totalStudents = await prisma.user.count({
        where: { role: "STUDENT" }
      });

      const submissionsByType = await prisma.document.groupBy({
        by: ["fileType"],
        _count: true,
      });

      const submissionsByStatus = await prisma.document.groupBy({
        by: ["status"],
        _count: true,
      });

      return NextResponse.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        synchronization: {
          totalSubmissions,
          totalStudents,
          submissionsByType,
          submissionsByStatus,
        },
      });
    }

    // Check specific student's submissions
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        documents: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            fileUrl: true,
            fileType: true,
            fileSize: true,
            status: true,
            createdAt: true,
            score: true,
            isAchieved: true,
            gradedAt: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Verify file URLs are accessible (basic check)
    const verifiedDocuments = student.documents.map((doc) => ({
      ...doc,
      // Check if fileUrl follows expected pattern
      isSyncValid: /^\/uploads\//.test(doc.fileUrl),
      expectedPath: `/uploads/${studentId}/`,
    }));

    const allSync = verifiedDocuments.every((doc) => doc.isSyncValid);

    return NextResponse.json({
      status: "ok",
      studentId,
      name: student.name,
      documents: verifiedDocuments,
      synchronizationStatus: {
        isFullySynced: allSync,
        totalDocuments: verifiedDocuments.length,
        syncedDocuments: verifiedDocuments.filter((d) => d.isSyncValid).length,
        unsyncedDocuments: verifiedDocuments.filter((d) => !d.isSyncValid).length,
        lastSubmission: verifiedDocuments[0]?.createdAt || null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error verifying synchronization:", error);
    return NextResponse.json(
      {
        error: "Failed to verify synchronization",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
