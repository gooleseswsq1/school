// app/api/teacher/library/comments/route.ts
// Library file comments
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function canStudentAccessFile(studentId: string, fileId: string): Promise<boolean> {
  const file = await prisma.libraryFile.findUnique({
    where: { id: fileId },
    select: { id: true, teacherId: true, visibility: true, classId: true },
  });

  if (!file) {
    return false;
  }

  if (file.visibility === 'PUBLIC') {
    return true;
  }

  const links = await prisma.studentTeacher.findMany({
    where: {
      studentId,
      teacherId: file.teacherId,
      status: 'accepted',
    },
    select: { classId: true },
  });

  if (links.length === 0) {
    return false;
  }

  if (!file.classId) {
    return true;
  }

  return links.some((link) => link.classId === file.classId);
}

// GET: List comments for a file
export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get('fileId');
  const viewerId = req.nextUrl.searchParams.get('viewerId');
  if (!fileId) return NextResponse.json({ error: 'fileId required' }, { status: 400 });

  try {
    if (viewerId) {
      const viewer = await prisma.user.findUnique({ where: { id: viewerId }, select: { role: true } });
      if (!viewer) {
        return NextResponse.json({ error: 'viewer not found' }, { status: 404 });
      }

      if (viewer.role === 'STUDENT') {
        const allowed = await canStudentAccessFile(viewerId, fileId);
        if (!allowed) {
          return NextResponse.json({ error: 'Không có quyền xem nhận xét của tài liệu này' }, { status: 403 });
        }
      }
    }

    const comments = await prisma.libraryComment.findMany({
      where: { fileId },
      include: { author: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(comments);
  } catch (err) {
    console.error('[GET /api/teacher/library/comments]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Add a comment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileId, authorId, content } = body;

    if (!fileId || !authorId || !content?.trim()) {
      return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
    }

    const author = await prisma.user.findUnique({ where: { id: authorId }, select: { role: true } });
    if (!author) {
      return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 });
    }

    if (author.role === 'STUDENT') {
      const allowed = await canStudentAccessFile(authorId, fileId);
      if (!allowed) {
        return NextResponse.json({ error: 'Không có quyền bình luận vào tài liệu này' }, { status: 403 });
      }
    }

    const comment = await prisma.libraryComment.create({
      data: { fileId, authorId, content: content.trim() },
      include: { author: { select: { name: true, role: true } } },
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    console.error('[POST /api/teacher/library/comments]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
