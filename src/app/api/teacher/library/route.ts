// app/api/teacher/library/route.ts
// Teacher library: upload files, list files
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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
      // Student sees:
      // 1) PUBLIC files from all teachers
      // 2) CLASS files from linked teachers for matching class
      const links = await prisma.studentTeacher.findMany({
        where: { studentId, status: 'accepted' },
        select: { teacherId: true, classId: true },
      });

      const classScopedConditions = links.map((link) => {
        if (link.classId) {
          return {
            visibility: 'CLASS',
            teacherId: link.teacherId,
            OR: [
              { classId: { equals: link.classId } },
              { classId: { equals: null } },
            ],
          } as Prisma.LibraryFileWhereInput;
        }

        return {
          visibility: 'CLASS',
          teacherId: link.teacherId,
          classId: { equals: null },
        } as Prisma.LibraryFileWhereInput;
      });

      const whereClause: Prisma.LibraryFileWhereInput = classScopedConditions.length
        ? {
            OR: [
              { visibility: 'PUBLIC' },
              ...classScopedConditions,
            ],
          }
        : { visibility: 'PUBLIC' };

      const files = await prisma.libraryFile.findMany({
        where: whereClause,
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
    const { teacherId, title, description, fileUrl, fileType, fileName, fileSize, visibility, classId } = body;

    if (!teacherId || !title || !fileUrl || !fileType || !fileName) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // Validate fileType
    const allowedTypes = ['pdf', 'word', 'image'];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json({ error: 'Loại file không hợp lệ' }, { status: 400 });
    }

    const normalizedVisibility = String(visibility || 'PUBLIC').toUpperCase();
    if (!['PUBLIC', 'CLASS'].includes(normalizedVisibility)) {
      return NextResponse.json({ error: 'visibility không hợp lệ' }, { status: 400 });
    }

    if (normalizedVisibility === 'CLASS' && classId) {
      const classLink = await prisma.teacherClass.findUnique({
        where: {
          teacherId_classId: {
            teacherId,
            classId,
          },
        },
      });
      if (!classLink) {
        return NextResponse.json({ error: 'Bạn không thuộc lớp đã chọn' }, { status: 403 });
      }
    }

    const file = await prisma.libraryFile.create({
      data: {
        teacherId,
        title,
        description,
        fileUrl,
        fileType,
        fileName,
        fileSize,
        visibility: normalizedVisibility,
        classId: normalizedVisibility === 'CLASS' ? (classId || null) : null,
      },
      include: {
        teacher: { select: { name: true } },
        _count: { select: { comments: true } },
      },
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
