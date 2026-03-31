import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createQuestionSchema = z.object({
  quizId: z.string().min(1, "Quiz ID cannot be empty"),
  questionText: z.string().min(1, "Question text cannot be empty"),
  questionType: z.string().default("multiple"),
  order: z.number().default(0),
  options: z.array(z.object({
    optionText: z.string().min(1, "Option text cannot be empty"),
    isCorrect: z.boolean(),
  })).default([]),
});

const updateQuestionSchema = z.object({
  questionText: z.string().optional(),
  questionType: z.string().optional(),
  order: z.number().optional(),
  options: z.array(z.object({
    optionText: z.string(),
    isCorrect: z.boolean(),
  })).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createQuestionSchema.parse(body);

    // Verify that the quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: data.quizId },
    });

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    const question = await prisma.question.create({
      data: {
        quizId: data.quizId,
        questionText: data.questionText,
        questionType: data.questionType,
        order: data.order,
        options: {
          create: data.options.map((opt, index) => ({
            optionText: opt.optionText,
            isCorrect: opt.isCorrect,
            order: index,
          })),
        },
      },
      include: {
        options: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error("Error creating question:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for foreign key constraint errors
    if (errorMessage.includes("P2003") || errorMessage.includes("Foreign key constraint")) {
      return NextResponse.json(
        { error: "Invalid quiz ID - Quiz not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("id");

    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    // Verify that the question exists before updating
    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!existingQuestion) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = updateQuestionSchema.parse(body);

    // Update question
    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        questionText: data.questionText,
        questionType: data.questionType,
        order: data.order,
      },
      include: {
        options: {
          orderBy: { order: "asc" },
        },
      },
    });

    // Update options if provided
    if (data.options) {
      // Delete existing options
      await prisma.questionOption.deleteMany({
        where: { questionId },
      });

      // Create new options
      if (data.options.length > 0) {
        await prisma.questionOption.createMany({
          data: data.options.map((opt, index) => ({
            questionId,
            optionText: opt.optionText,
            isCorrect: opt.isCorrect,
            order: index,
          })),
        });
      }

      // Re-fetch question with new options
      return NextResponse.json(
        await prisma.question.findUnique({
          where: { id: questionId },
          include: {
            options: {
              orderBy: { order: "asc" },
            },
          },
        })
      );
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error("Error updating question:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for record not found errors
    if (errorMessage.includes("P2025") || errorMessage.includes("not found")) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("id");

    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    // Verify that the question exists before deleting
    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!existingQuestion) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    await prisma.question.delete({
      where: { id: questionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting question:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("P2025")) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}
