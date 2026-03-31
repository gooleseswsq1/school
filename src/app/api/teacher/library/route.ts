// app/api/teacher/library/route.ts
// Teacher library: upload files, list files
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List files by teacher OR files from teachers linked to a student
export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get('teacherId');
  const studentId = req.nextUrl.searchParams.get('studentId');

  try {
    if (teacherId) {
      // Teacher viewing their own library
      const files = await prisma.libraryFile.findMany({
        where: { teacherId },
        include: {
          teacher: { select: { name: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(files);
    }

    if (studentId) {
      // Student viewing files from their linked teachers
      const links = await prisma.studentTeacher.findMany({
        where: { studentId, status: 'accepted' },
        select: { teacherId: true },
      });
      const teacherIds = links.map((l) => l.teacherId);

      if (teacherIds.length === 0) return NextResponse.json([]);

      const files = await prisma.libraryFile.findMany({
        where: { teacherId: { in: teacherIds } },
        include: {
          teacher: { select: { name: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(files);
    }

    return NextResponse.json({ error: 'teacherId or studentId required' }, { status: 400 });
  } catch (err) {
    console.error('[GET /api/teacher/library]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Teacher uploads a file (stores as base64 data URL for simplicity)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teacherId, title, description, fileUrl, fileType, fileName, fileSize } = body;

    if (!teacherId || !title || !fileUrl || !fileType || !fileName) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // Validate fileType
    const allowedTypes = ['pdf', 'word', 'image'];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json({ error: 'Loại file không hợp lệ' }, { status: 400 });
    }

    const file = await prisma.libraryFile.create({
      data: { teacherId, title, description, fileUrl, fileType, fileName, fileSize },
      include: { teacher: { select: { name: true } }, _count: { select: { comments: true } } },
    });

    return NextResponse.json(file, { status: 201 });
  } catch (err) {
    console.error('[POST /api/teacher/library]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE: Teacher removes a file
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const teacherId = req.nextUrl.searchParams.get('teacherId');
  if (!id || !teacherId) return NextResponse.json({ error: 'id and teacherId required' }, { status: 400 });

  try {
    const file = await prisma.libraryFile.findUnique({ where: { id } });
    if (!file || file.teacherId !== teacherId) {
      return NextResponse.json({ error: 'Không tìm thấy hoặc không có quyền' }, { status: 404 });
    }
    await prisma.libraryFile.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/teacher/library]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
