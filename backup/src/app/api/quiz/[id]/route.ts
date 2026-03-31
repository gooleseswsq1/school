import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await params;
    console.log("[Quiz API] Fetching quiz with ID:", quizId);

    // Validate quiz ID format
    if (!quizId || quizId.length === 0) {
      console.log("[Quiz API] Invalid quiz ID provided");
      return NextResponse.json(
        { error: "Invalid quiz ID" },
        { status: 400 }
      );
    }

    // Fetch quiz with questions and options
    let quiz;
    try {
      console.log("[Quiz API] Querying database...");
      quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          questions: {
            include: {
              options: {
                orderBy: { order: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      });
      console.log("[Quiz API] Database query completed");
    } catch (dbError) {
      console.error("[Quiz API] Database query error:", dbError);
      throw new Error(`Database query failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
    }

    if (!quiz) {
      console.log("[Quiz API] Quiz not found for ID:", quizId);
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    console.log("[Quiz API] Quiz found:", {
      id: quiz.id,
      blockId: quiz.blockId,
      numQuestions: quiz.questions.length,
    });

    // Validate quiz has required data
    if (!quiz.blockId) {
      console.warn("[Quiz API] Warning: Quiz missing blockId", {
        quizId: quiz.id,
        title: quiz.title,
      });
    }

    // Transform response to match expected format
    let formattedQuiz;
    try {
      formattedQuiz = {
        id: quiz.id,
        title: quiz.title || "Quiz",
        blockId: quiz.blockId || "",
        questions: (quiz.questions || []).map((q) => ({
          id: q.id,
          questionText: q.questionText || "",
          questionType: q.questionType || "multiple",
          order: q.order || 0,
          options: (q.options || []).map((o) => ({
            id: o.id,
            optionText: o.optionText || "",
            isCorrect: Boolean(o.isCorrect),
          })),
        })),
      };
    } catch (formatError) {
      console.error("[Quiz API] Error formatting response:", formatError);
      throw new Error(`Response formatting failed: ${formatError instanceof Error ? formatError.message : String(formatError)}`);
    }

    console.log("[Quiz API] Response ready, sending...");
    return NextResponse.json(formattedQuiz);
  } catch (error) {
    console.error("[Quiz API] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "No stack trace";
    
    console.error("[Quiz API] Error details:", {
      message: errorMessage,
      stack: errorStack?.split("\n").slice(0, 10).join("\n"),
    });
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? {
          message: errorMessage,
          type: error instanceof Error ? error.constructor.name : typeof error,
        } : undefined
      },
      { status: 500 }
    );
  }
}
