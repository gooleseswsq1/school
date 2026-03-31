import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Email hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    // Check if account is active (only for students)
    if (user.role === 'STUDENT' && !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email của bạn.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Email hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    // Update lastLoginAt
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Create response with user data and redirect hint
    const response = NextResponse.json(
      {
        success: true,
        message: 'Đăng nhập thành công',
        user: userWithoutPassword,
        redirectTo: user.role === 'TEACHER' ? '/teacher/documents' : '/student/library',
      },
      { status: 200 }
    );

    // Set authentication cookie
    response.cookies.set('user', JSON.stringify(userWithoutPassword), {
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi đăng nhập' },
      { status: 500 }
    );
  }
}
