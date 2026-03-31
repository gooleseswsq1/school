import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Fetch a specific submission
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const submission = await prisma.document.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(submission);
  } catch (error) {
    console.error("Error fetching submission:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}

// PUT - Grade/Update submission
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { score, isAchieved, gradedBy } = body;

    // Validate score
    if (score !== undefined && (score < 0 || score > 100)) {
      return NextResponse.json(
        { error: "Score must be between 0 and 100" },
        { status: 400 }
      );
    }

    // Determine status based on isAchieved and score
    let newStatus: string | undefined = undefined;
    let shouldSetGradedAt = false;

    if (isAchieved !== undefined || score !== undefined) {
      shouldSetGradedAt = true;
      
      // If explicitly marked as achieved, status is "achieved"
      if (isAchieved === true) {
        newStatus = "achieved";
      } 
      // If explicitly marked as not achieved, status is "graded"
      else if (isAchieved === false) {
        newStatus = "graded";
      }
      // If only score is provided without isAchieved determination
      else if (score !== undefined) {
        newStatus = "graded";
      }
    }

    const submission = await prisma.document.update({
      where: { id },
      data: {
        score: score !== undefined ? score : undefined,
        isAchieved: isAchieved !== undefined ? isAchieved : undefined,
        status: newStatus,
        gradedBy: gradedBy || undefined,
        gradedAt: shouldSetGradedAt ? new Date() : undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json(submission);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    console.error("Error updating submission:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}

// DELETE - Delete submission
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const submission = await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Submission deleted successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    console.error("Error deleting submission:", error);
    return NextResponse.json(
      { error: "Failed to delete submission" },
      { status: 500 }
    );
  }
}
