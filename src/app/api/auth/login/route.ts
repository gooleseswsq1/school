import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt';
import crypto from 'crypto';

function isMissingRefreshTokenTable(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== 'P2021') {
    return false;
  }

  const table = (error.meta as { table?: unknown } | undefined)?.table;
  return typeof table === 'string' && table.includes('RefreshToken');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    // Validation
    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { success: false, error: 'Email và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({ userId: user.id });

    // Store refresh token hash in DB with expiry (7 days)
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    let refreshStored = true;
    try {
      await prisma.refreshToken.create({
        data: {
          token: tokenHash,
          userId: user.id,
          expiresAt,
        },
      });
    } catch (refreshError) {
      refreshStored = false;
      if (isMissingRefreshTokenTable(refreshError)) {
        console.warn('RefreshToken table missing. Login continues without refresh cookie.');
      } else {
        console.error('Refresh token persistence failed:', refreshError);
      }
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Create response with user data and tokens
    const response = NextResponse.json(
      {
        success: true,
        message: 'Đăng nhập thành công',
        user: userWithoutPassword,
        accessToken,
        redirectTo: user.role === 'TEACHER' ? '/teacher/documents' : '/student/library',
      },
      { status: 200 }
    );

    // Set refresh token in httpOnly cookie (secure)
    if (refreshStored) {
      response.cookies.set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    // Set access token in cookie so browser API calls are authenticated by proxy
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    });

    // Set user info in regular cookie (for frontend convenience)
    response.cookies.set('user', JSON.stringify(userWithoutPassword), {
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi đăng nhập',
        ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
      },
      { status: 500 }
    );
  }
}
