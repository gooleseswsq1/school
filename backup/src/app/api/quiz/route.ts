import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const createQuizSchema = z.object({
  blockId: z.string(),
  title: z.string().optional(),
});

const bulkImportSchema = z.object({
  blockId: z.string(),
  title: z.string().optional(),
  questions: z.array(
    z.object({
      questionText: z.string(),
      questionType: z.string().optional().default("multiple"),
      options: z.array(
        z.object({
          optionText: z.string(),
          isCorrect: z.boolean(),
        })
      ),
    })
  ),
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: check if a blockId exists in the Block table
// ─────────────────────────────────────────────────────────────────────────────

async function blockExists(blockId: string): Promise<boolean> {
  try {
    const block = await prisma.pageBlock.findUnique({
      where: { id: blockId },
      select: { id: true },
    });
    return !!block;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a synthetic (in-memory) quiz object with proper UUIDs.
//
// Used when blockId is a Canva slide UUID (client-generated, not a DB Block).
// The quiz will be stored inside slidesData JSON — no DB row is needed.
// ─────────────────────────────────────────────────────────────────────────────

function buildSyntheticQuiz(
  blockId: string,
  title: string,
  questions: z.infer<typeof bulkImportSchema>["questions"]
) {
  const quizId = uuidv4();

  return {
    id: quizId,
    blockId,
    title,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: questions.map((q, qIdx) => {
      const questionId = uuidv4();
      return {
        id: questionId,
        quizId,
        questionText: q.questionText,
        questionType: (q.questionType ?? "multiple").toLowerCase(),
        order: qIdx,
        options: q.options.map((opt, oIdx) => ({
          id: uuidv4(),
          questionId,
          optionText: opt.optionText,
          isCorrect: opt.isCorrect,
          order: oIdx,
        })),
      };
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/quiz  — list all quizzes
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const quizzes = await prisma.quiz.findMany({
      include: {
        questions: {
          include: {
            options: { orderBy: { order: "asc" } },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(quizzes);
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return NextResponse.json({ error: "Failed to fetch quizzes" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/quiz  — create quiz (bulk import or single)
//
// TWO MODES:
//   1. DB mode   — blockId points to a real Block row → persist to database
//   2. Local mode — blockId is a Canva slide UUID (not in Block table)
//                   → return a synthetic quiz object WITHOUT writing to DB.
//                   The caller (MagicQuizBuilder → MiniCanvaApp) stores this
//                   in the slide's local state, which is later saved as part
//                   of slidesData JSON. No DB record is created or needed.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── BULK IMPORT (MagicQuizBuilder sends questions[]) ─────────────────────
    if (body.questions && Array.isArray(body.questions)) {
      const { blockId, title, questions } = bulkImportSchema.parse(body);
      const quizTitle = title || "Câu hỏi trắc nghiệm";

      const exists = await blockExists(blockId);

      // ── LOCAL MODE: slide UUID, not a DB Block ──────────────────────────
      if (!exists) {
        console.log(
          `[Quiz API] blockId "${blockId}" not in Block table → local/slide mode`
        );
        const synthetic = buildSyntheticQuiz(blockId, quizTitle, questions);
        return NextResponse.json(synthetic, { status: 201 });
      }

      // ── DB MODE: real Block → persist ───────────────────────────────────
      const existingQuizzes = await prisma.quiz.findMany({
        where: { blockId },
        orderBy: { order: "desc" },
        take: 1,
      });

      const nextOrder =
        existingQuizzes.length > 0 ? existingQuizzes[0].order + 1 : 0;
      let quiz = existingQuizzes.length > 0 ? existingQuizzes[0] : null;

      if (!quiz) {
        quiz = await prisma.quiz.create({
          data: { blockId, title: quizTitle, order: nextOrder },
        });
      }

      // Replace all questions
      await prisma.question.deleteMany({ where: { quizId: quiz.id } });

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await prisma.question.create({
          data: {
            quizId: quiz.id,
            questionText: q.questionText,
            questionType: (q.questionType ?? "multiple").toLowerCase(),
            order: i,
            options: {
              create: q.options.map((opt, optIndex) => ({
                optionText: opt.optionText,
                isCorrect: opt.isCorrect,
                order: optIndex,
              })),
            },
          },
        });
      }

      const completeQuiz = await prisma.quiz.findUnique({
        where: { id: quiz.id },
        include: {
          questions: {
            include: { options: { orderBy: { order: "asc" } } },
            orderBy: { order: "asc" },
          },
        },
      });

      return NextResponse.json(completeQuiz, { status: 201 });
    }

    // ── SINGLE QUIZ CREATION ─────────────────────────────────────────────────
    const { blockId, title } = createQuizSchema.parse(body);

    const exists = await blockExists(blockId);
    if (!exists) {
      return NextResponse.json(
        {
          error: "Block not found",
          code: "BLOCK_NOT_FOUND",
          hint: "Nếu đây là quiz trong slide Canva, hãy truyền kèm questions[] để dùng local mode.",
        },
        { status: 404 }
      );
    }

    const quiz = await prisma.quiz.create({
      data: { blockId, title },
      include: {
        questions: {
          include: { options: { orderBy: { order: "asc" } } },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(quiz, { status: 201 });
  } catch (error) {
    console.error("Error creating quiz:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 });
  }
}