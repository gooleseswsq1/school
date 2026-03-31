import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/documents - List all documents or filter by authorId
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const authorId = searchParams.get('authorId');
    const fileType = searchParams.get('fileType');

    let whereClause: any = {};
    if (authorId) {
      whereClause.authorId = authorId;
    }
    if (fileType) {
      whereClause.fileType = fileType;
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
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải tài liệu' },
      { status: 500 }
    );
  }
}

// POST /api/documents - Create a new document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, fileUrl, fileType, fileSize, authorId } = body;

    // Validate required fields
    if (!title || !fileUrl || !fileType || !authorId) {
      return NextResponse.json(
        { success: false, error: 'Yêu cầu: title, fileUrl, fileType, authorId' },
        { status: 400 }
      );
    }

    // Verify author exists
    const author = await prisma.user.findUnique({
      where: { id: authorId },
    });

    if (!author) {
      return NextResponse.json(
        { success: false, error: 'Tác giả không tồn tại' },
        { status: 404 }
      );
    }

    const document = await prisma.document.create({
      data: {
        title,
        description,
        fileUrl,
        fileType,
        fileSize,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tạo tài liệu' },
      { status: 500 }
    );
  }
}
