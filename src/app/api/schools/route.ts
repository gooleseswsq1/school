import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/schools?q=nguyen
// Trả về danh sách trường khớp với query (dùng cho autocomplete đăng ký)
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ schools: [] });
    }

    const schools = await prisma.school.findMany({
      where: {
        name: {
          contains: q,
        },
      },
      select: {
        id: true,
        name: true,
        address: true,
        province: true,
      },
      orderBy: { name: 'asc' },
      take: 10,
    });

    return NextResponse.json({ schools });
  } catch (error) {
    console.error('Schools search error:', error);
    return NextResponse.json({ schools: [] });
  }
}

// POST /api/schools — Admin tạo trường mới
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, address, province, district } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Tên trường là bắt buộc' },
        { status: 400 }
      );
    }

    const school = await prisma.school.create({
      data: {
        name: name.trim(),
        address: address?.trim() || null,
        province: province?.trim() || null,
        district: district?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, school }, { status: 201 });
  } catch (error: unknown) {
    // Unique constraint
    if ((error as { code?: string })?.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Trường này đã tồn tại trong hệ thống' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Lỗi tạo trường' },
      { status: 500 }
    );
  }
}
