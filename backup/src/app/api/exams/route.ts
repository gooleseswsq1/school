// app/api/exams/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type DifficultyLabel = 'EASY' | 'MEDIUM' | 'HARD';
type SnapshotKind = 'MCQ' | 'TF' | 'TF4' | 'SAQ' | 'ESSAY';

type ClientQuestion = {
  num?: number;
  text: string;
  type: 'mcq' | 'tf' | 'tf4' | 'saq' | 'essay';
  options?: string[];
  subItems?: Array<{ label: string; text: string; answer?: string }>;
  images?: string[];
  answer: string;
  points: number;
  difficulty?: number;
  chapter?: string;
};

function numToDiff(n: number): DifficultyLabel {
  if (n <= 1) return 'EASY';
  if (n <= 2) return 'MEDIUM';
  return 'HARD';
}

function mapClientTypeToSnapshotKind(type: ClientQuestion['type']): SnapshotKind {
  if (type === 'mcq') return 'MCQ';
  if (type === 'tf') return 'TF';
  if (type === 'tf4') return 'TF4';
  if (type === 'saq') return 'SAQ';
  return 'ESSAY';
}

function buildOptionsSnapshot(q: ClientQuestion): string | undefined {
  const payload: {
    options?: string[];
    subItems?: Array<{ label: string; text: string; answer?: string }>;
    images?: string[];
    type?: SnapshotKind;
  } = {};

  if (Array.isArray(q.options) && q.options.length > 0) payload.options = q.options;
  if (Array.isArray(q.subItems) && q.subItems.length > 0) payload.subItems = q.subItems;
  if (Array.isArray(q.images) && q.images.length > 0) payload.images = q.images;

  const kind = mapClientTypeToSnapshotKind(q.type);
  if (kind === 'TF4' || kind === 'SAQ') payload.type = kind;

  if (!payload.options && !payload.subItems && !payload.images && !payload.type) {
    return undefined;
  }
  return JSON.stringify(payload);
}

function buildAnswerSnapshot(q: ClientQuestion): string {
  if (q.type === 'tf4' && Array.isArray(q.subItems) && q.subItems.length > 0) {
    const map = q.subItems.reduce<Record<string, string>>((acc, s) => {
      if (s.label) acc[s.label.toLowerCase()] = (s.answer || '').trim();
      return acc;
    }, {});
    if (Object.keys(map).length > 0) return JSON.stringify(map);
  }
  return q.answer;
}

/**
 * POST /api/exams
 * Body: {
 *   title, subject, className, duration,
 *   easyCount, mediumCount, hardCount,
 *   variantCount, deadlineDays, autoDeleteAfter, saveToBank,
 *   creatorId,
 *   bankId?,         // nếu đã có bank từ parse
 *   questions[]      // array ParsedQ từ ExamCreator
 * }
 *
 * Logic:
 * 1. Nếu có bankId → chọn câu từ ExamBank.questions theo cấp độ
 * 2. Nếu không có bankId nhưng có questions → lưu trực tiếp
 * 3. Tạo Exam + ExamItem (snapshot)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title, subject, className, duration,
      // Kind-based counts (new) — -1 means "include all"
      mcqCount = -1, tfCount = -1, essayCount = -1,
      // Legacy difficulty counts (kept for DB compat, defaulting to 0)
      easyCount = 0, mediumCount = 0, hardCount = 0,
      variantCount = 1, deadlineDays = 7,
      creatorId, bankId, questions = [], questionIds = [],
      saveToBank = false,
    } = body;

    if (!title || !creatorId) {
      return NextResponse.json({ error: 'title và creatorId là bắt buộc' }, { status: 400 });
    }

    // Tính closeAt
    const closeAt = new Date(Date.now() + (deadlineDays ?? 7) * 86_400_000);

    // ── Bước 1: Xác định câu hỏi cho đề ───────────────────────
    type KindLabel = SnapshotKind;
    let selectedItems: Array<{
      order: number;
      questionId?: string;
      kind?: KindLabel;
      text: string;
      options?: string;
      answer: string;
      points: number;
      difficulty: DifficultyLabel;
      subItems?: string;
      tolerance?: number;
    }> = [];
    let sourceBankId: string | undefined = bankId;

    if (bankId) {
      // Lấy từ ExamBank trong DB
      const bankQuestions = await prisma.bankQuestion.findMany({
        where: { bankId },
        orderBy: { num: 'asc' },
      });

      const easy   = bankQuestions.filter(q => q.difficulty === 'EASY').slice(0, easyCount);
      const medium = bankQuestions.filter(q => q.difficulty === 'MEDIUM').slice(0, mediumCount);
      const hard   = bankQuestions.filter(q => q.difficulty === 'HARD').slice(0, hardCount);
      const picked = [...easy, ...medium, ...hard];

      // Shuffle nếu cần
      picked.sort(() => Math.random() - 0.5);

      selectedItems = picked.map((q, idx) => ({
        order: idx + 1,
        questionId: q.id,
        kind: q.kind as KindLabel,
        text: q.text,
        options: q.options || undefined,
        answer: q.answer,
        points: q.points,
        difficulty: q.difficulty as DifficultyLabel,
        subItems: q.subItems || undefined,
        tolerance: q.answerTolerance ?? undefined,
      }));

    } else if (Array.isArray(questionIds) && questionIds.length > 0) {
      // Dùng danh sách ID câu hỏi được chọn từ QuestionBankPage
      const picked = await prisma.bankQuestion.findMany({
        where: { id: { in: questionIds } },
      });

      // Giữ thứ tự theo đúng danh sách questionIds từ client
      const pickedMap = new Map(picked.map((q) => [q.id, q]));
      const orderedPicked = questionIds
        .map((id: string) => pickedMap.get(id))
        .filter((q): q is NonNullable<typeof q> => Boolean(q));

      // Nếu toàn bộ câu hỏi thuộc cùng 1 bank, liên kết exam với bank đó
      const bankIdSet = new Set(orderedPicked.map(q => q.bankId));
      if (bankIdSet.size === 1) {
        sourceBankId = orderedPicked[0]?.bankId;
      }

      selectedItems = orderedPicked.map((q, idx) => ({
        order: idx + 1,
        questionId: q.id,
        kind: q.kind as KindLabel,
        text: q.text,
        options: q.options || undefined,
        answer: q.answer,
        points: q.points,
        difficulty: q.difficulty as DifficultyLabel,
        subItems: q.subItems || undefined,
        tolerance: q.answerTolerance ?? undefined,
      }));

    } else if (questions.length > 0) {
      // Dùng questions từ request (không có bank)
      // Lọc theo loại câu hỏi (MCQ/TF/Essay), không theo độ khó
      const mcqQs   = questions.filter((q: ClientQuestion) => q.type === 'mcq');
      const tfQs    = questions.filter((q: ClientQuestion) => q.type === 'tf' || q.type === 'tf4');
      const essayQs = questions.filter((q: ClientQuestion) => q.type === 'essay' || q.type === 'saq');
      const picked = [
        ...(mcqCount >= 0 ? mcqQs.slice(0, mcqCount) : mcqQs),
        ...(tfCount  >= 0 ? tfQs.slice(0,  tfCount)  : tfQs),
        ...(essayCount >= 0 ? essayQs.slice(0, essayCount) : essayQs),
      ];

      // Nếu saveToBank → tạo ExamBank mới
      let newBankId: string | undefined;
      if (saveToBank) {
        const bank = await prisma.examBank.create({
          data: {
            title: `${subject} — ${title}`,
            subject,
            authorId: creatorId,
            questions: {
              create: picked.map((q: ClientQuestion) => ({
                num: q.num ?? 0,
                text: q.text,
                kind: mapClientTypeToSnapshotKind(q.type) as any,
                difficulty: numToDiff(q.difficulty ?? 1),
                difficultyNum: q.difficulty ?? 1,
                points: q.points,
                options: buildOptionsSnapshot(q) || null,
                answer: buildAnswerSnapshot(q),
                chapter: q.chapter,
                subItems: q.subItems ? JSON.stringify(q.subItems) : null,
                answerTolerance: q.type === 'saq' ? 0 : null,
              })),
            },
          },
        });
        newBankId = bank.id;
        sourceBankId = bank.id;
      }

      selectedItems = picked.map((q: ClientQuestion, idx: number) => ({
        order: idx + 1,
        kind: mapClientTypeToSnapshotKind(q.type),
        text: q.text,
        options: buildOptionsSnapshot(q),
        answer: buildAnswerSnapshot(q),
        points: q.points,
        difficulty: numToDiff(q.difficulty || 1),
        subItems: q.subItems ? JSON.stringify(q.subItems) : undefined,
        tolerance: q.type === 'saq' ? 0 : undefined,
      }));
    }

    if (selectedItems.length === 0) {
      return NextResponse.json(
        { error: 'Không có câu hỏi hợp lệ để tạo đề thi' },
        { status: 400 }
      );
    }

    // ── Bước 2: Tạo Exam ────────────────────────────────────
    const exam = await prisma.exam.create({
      data: {
        title,
        subject,
        className: className || '',
        duration,
        status: 'DRAFT',
        openAt: null,
        closeAt,
        easyCount,
        mediumCount,
        hardCount,
        variantCount,
        creatorId,
        // Nếu có bankId → liên kết ExamBankRef
        ...(sourceBankId ? {
          banks: { create: { bankId: sourceBankId } },
        } : {}),
        // ExamItem snapshots
        items: {
          create: selectedItems.map(item => ({
            order: item.order,
            questionId: item.questionId || undefined,
            textSnapshot: item.text,
            optionsSnapshot: item.options,
            answerSnapshot: item.answer,
            kindSnapshot: item.kind || undefined,
            pointsSnapshot: item.points,
            subItemsSnapshot: item.subItems || undefined,
            toleranceSnapshot: item.tolerance ?? undefined,
          })) as any,
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(exam, { status: 201 });

  } catch (error: any) {
    console.error('[POST /api/exams]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * GET /api/exams?creatorId=xxx&className=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get('creatorId');
  const className = searchParams.get('className');

  try {
    const where: any = {};
    if (creatorId) where.creatorId = creatorId;
    if (className) where.className = className;

    const exams = await prisma.exam.findMany({
      where,
      include: {
        _count: { select: { items: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(exams);
  } catch (error) {
    console.error('[GET /api/exams]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}