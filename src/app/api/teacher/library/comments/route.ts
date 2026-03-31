// app/api/teacher/library/comments/route.ts
// Library file comments
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List comments for a file
export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get('fileId');
  if (!fileId) return NextResponse.json({ error: 'fileId required' }, { status: 400 });

  try {
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
