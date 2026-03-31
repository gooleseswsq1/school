import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 }
      );
    }

    const submissions = await prisma.document.findMany({
      where: { 
        authorId: studentId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        fileUrl: true,
        fileType: true,
        fileSize: true,
        createdAt: true,
        updatedAt: true,
        score: true,
        isAchieved: true,
        status: true,
        gradedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Map to submission format
    const formattedSubmissions = submissions.map(doc => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      fileUrl: doc.fileUrl,
      fileName: doc.fileUrl.split('/').pop() || 'file',
      fileSize: doc.fileSize || 0,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      status: doc.status && doc.status.trim() ? doc.status : 'submitted', // Ensure status is always set
      score: doc.score,
      isAchieved: doc.isAchieved,
      gradedAt: doc.gradedAt?.toISOString(),
    }));

    return NextResponse.json(formattedSubmissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, code, studentId, fileName } = body;

    if (!title || !studentId) {
      return NextResponse.json(
        { error: "title and studentId are required" },
        { status: 400 }
      );
    }

    // Student account should already exist or will be created by student-submissions endpoint
    // Just verify it exists
    let student = await prisma.user.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      // Create student account if it doesn't exist
      student = await prisma.user.create({
        data: {
          id: studentId,
          email: `student-${studentId}@local`,
          name: `Student ${studentId}`,
          password: "temp-password",
          role: "STUDENT",
          isActive: true,
        },
      });
    }

    // Save code submission as document
    const submission = await prisma.document.create({
      data: {
        title,
        description: description || `Code submission: ${code?.substring(0, 100)}...`,
        fileUrl: `submission-${Date.now()}.c`,
        fileType: "OTHER",
        fileSize: code ? code.length : 0,
        authorId: student.id,
        status: "submitted", // Explicitly set status to submitted
      },
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}
