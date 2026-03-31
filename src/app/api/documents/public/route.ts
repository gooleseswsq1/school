import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/documents/public - Get all teacher documents (public for students)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fileType = searchParams.get('fileType');
    const teacherId = searchParams.get('teacherId');

    let whereClause: any = {};
    
    // Get documents from teachers and admins
    const teacherUsers = await prisma.user.findMany({
      where: {
        role: {
          in: ['TEACHER', 'ADMIN']
        }
      },
      select: { id: true }
    });

    const teacherIds = teacherUsers.map(t => t.id);
    whereClause.authorId = { in: teacherIds };

    if (fileType) {
      whereClause.fileType = fileType;
    }

    if (teacherId) {
      whereClause.authorId = teacherId;
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching public documents:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải tài liệu' },
      { status: 500 }
    );
  }
}
