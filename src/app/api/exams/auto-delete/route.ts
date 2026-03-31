// app/api/exams/auto-delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/exams/auto-delete
 * Tự động xóa bài kiểm tra đã quá 7 ngày sau khi đóng
 * Có thể gọi từ cron job hoặc scheduler
 */
export async function POST(request: NextRequest) {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Tìm các bài kiểm tra đã đóng quá 7 ngày
    const examsToDelete = await prisma.exam.findMany({
      where: {
        status: 'CLOSED',
        closeAt: {
          lt: sevenDaysAgo,
        },
      },
      select: {
        id: true,
        title: true,
        closeAt: true,
        attempts: {
          select: {
            id: true,
            studentId: true,
          },
        },
      },
    });

    if (examsToDelete.length === 0) {
      return NextResponse.json({
        message: 'Không có bài kiểm tra nào cần xóa',
        deletedCount: 0,
      });
    }

    // Xóa tất cả bài kiểm tra và dữ liệu liên quan
    const deleteResult = await prisma.$transaction(async (tx) => {
      // Xóa tất cả attempts của các bài kiểm tra này
      await tx.studentExamAttempt.deleteMany({
        where: {
          examId: {
            in: examsToDelete.map(exam => exam.id),
          },
        },
      });

      // Xóa tất cả exam items
      await tx.examItem.deleteMany({
        where: {
          examId: {
            in: examsToDelete.map(exam => exam.id),
          },
        },
      });

      // Xóa tất cả exam bank refs
      await tx.examBankRef.deleteMany({
        where: {
          examId: {
            in: examsToDelete.map(exam => exam.id),
          },
        },
      });

      // Xóa bài kiểm tra
      const deletedExams = await tx.exam.deleteMany({
        where: {
          id: {
            in: examsToDelete.map(exam => exam.id),
          },
        },
      });

      return deletedExams;
    });

    // Log thông tin về các bài kiểm tra đã xóa
    console.log(`[AUTO-DELETE] Đã xóa ${deleteResult.count} bài kiểm tra:`, 
      examsToDelete.map(exam => ({
        id: exam.id,
        title: exam.title,
        closeAt: exam.closeAt,
        attemptsCount: exam.attempts.length,
      }))
    );

    return NextResponse.json({
      message: `Đã xóa thành công ${deleteResult.count} bài kiểm tra`,
      deletedCount: deleteResult.count,
      deletedExams: examsToDelete.map(exam => ({
        id: exam.id,
        title: exam.title,
        closeAt: exam.closeAt,
        attemptsCount: exam.attempts.length,
      })),
    });

  } catch (error) {
    console.error('[AUTO-DELETE] Lỗi khi xóa bài kiểm tra:', error);
    return NextResponse.json(
      { error: 'Lỗi hệ thống khi xóa bài kiểm tra' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * GET /api/exams/auto-delete
 * Kiểm tra số lượng bài kiểm tra sẽ bị xóa (không xóa thực sự)
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const examsToDelete = await prisma.exam.findMany({
      where: {
        status: 'CLOSED',
        closeAt: {
          lt: sevenDaysAgo,
        },
      },
      select: {
        id: true,
        title: true,
        subject: true,
        closeAt: true,
        createdAt: true,
        creator: {
          select: {
            name: true,
          },
        },
        attempts: {
          select: {
            id: true,
            student: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        closeAt: 'asc',
      },
    });

    const summary = {
      totalExams: examsToDelete.length,
      totalAttempts: examsToDelete.reduce((sum, exam) => sum + exam.attempts.length, 0),
      oldestExam: examsToDelete.length > 0 ? examsToDelete[0] : null,
      newestExam: examsToDelete.length > 0 ? examsToDelete[examsToDelete.length - 1] : null,
    };

    return NextResponse.json({
      message: `Tìm thấy ${examsToDelete.length} bài kiểm tra sẽ bị xóa`,
      summary,
      exams: examsToDelete.map(exam => ({
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        teacherName: exam.creator.name,
        closeAt: exam.closeAt,
        createdAt: exam.createdAt,
        attemptsCount: exam.attempts.length,
        students: exam.attempts.map(att => att.student.name),
      })),
    });

  } catch (error) {
    console.error('[AUTO-DELETE] Lỗi khi kiểm tra bài kiểm tra:', error);
    return NextResponse.json(
      { error: 'Lỗi hệ thống khi kiểm tra bài kiểm tra' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}