import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Generate a random alphanumeric code
function generateActivationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is ADMIN (in real app, use proper session/JWT)
    const userCookie = request.cookies.get('user');
    if (!userCookie) {
      return NextResponse.json(
        { success: false, error: 'Chưa xác thực' },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie.value);
    if (user.role !== 'ADMIN' && user.role !== 'TEACHER') {
      return NextResponse.json(
        { success: false, error: 'Không có quyền' },
        { status: 403 }
      );
    }

    // Generate activation code
    let code = generateActivationCode();
    let existingCode = await prisma.activationCode.findUnique({
      where: { code },
    });

    // Ensure code is unique
    while (existingCode) {
      code = generateActivationCode();
      existingCode = await prisma.activationCode.findUnique({
        where: { code },
      });
    }

    // Create activation code valid for 30 days
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const activationCode = await prisma.activationCode.create({
      data: {
        code,
        expiresAt,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Tạo mã kích hoạt thành công',
        code: activationCode.code,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Generate code error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi tạo mã' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is ADMIN
    const userCookie = request.cookies.get('user');
    if (!userCookie) {
      return NextResponse.json(
        { success: false, error: 'Chưa xác thực' },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie.value);
    if (user.role !== 'ADMIN' && user.role !== 'TEACHER') {
      return NextResponse.json(
        { success: false, error: 'Không có quyền' },
        { status: 403 }
      );
    }

    const codes = await prisma.activationCode.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      {
        success: true,
        codes,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get codes error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi lấy danh sách' },
      { status: 500 }
    );
  }
}
