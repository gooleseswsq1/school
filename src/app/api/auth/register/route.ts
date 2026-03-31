// ─── PATCH cho /api/auth/register/route.ts ───────────────────────────────────
// Tìm đoạn tạo user trong file register hiện tại và thêm 2 thứ:
// 1. Sinh teacherCode tự động khi tạo TEACHER
// 2. Tạo bản ghi StudentTeacher khi học sinh nhập teacherCode

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Sinh mã GV: "GV-" + 3 chữ cái đầu tên + 4 ký tự random
function genTeacherCode(name: string): string {
  const prefix = name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu
    .toUpperCase().replace(/[^A-Z]/g, '')
    .slice(0, 4) || 'GV';
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GV-${prefix}-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      role, name, email, password,
      schoolId, schoolName, level,
      subjects, teacherCode, activationCode,
    } = body;

    // ── Kiểm tra activation code (chỉ TEACHER cần) ──
    // Học sinh đăng ký tự do không cần mã kích hoạt
    // Giáo viên cần mã kích hoạt do admin cung cấp
    if (role === 'TEACHER') {
      if (!activationCode?.trim()) {
        return NextResponse.json({ success:false, error:'Mã kích hoạt là bắt buộc cho giáo viên' });
      }
      const code = await prisma.activationCode.findUnique({
        where: { code: activationCode.trim().toUpperCase() },
      });
      if (!code)           return NextResponse.json({ success:false, error:'Mã kích hoạt không tồn tại' });
      if (code.isUsed)     return NextResponse.json({ success:false, error:'Mã kích hoạt đã được sử dụng' });
      if (new Date(code.expiresAt) < new Date())
        return NextResponse.json({ success:false, error:'Mã kích hoạt đã hết hạn' });
    }

    // ── Kiểm tra email trùng ──
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ success:false, error:'Email đã được sử dụng' });

    // ── Xử lý school ──
    let resolvedSchoolId = schoolId || null;
    if (!resolvedSchoolId && schoolName?.trim()) {
      const school = await prisma.school.upsert({
        where: { name: schoolName.trim() },
        update: {},
        create: { name: schoolName.trim() },
      });
      resolvedSchoolId = school.id;
    }

    // ── Sinh teacher code (chỉ TEACHER) ──
    let newTeacherCode: string | null = null;
    if (role === 'TEACHER') {
      let attempt = genTeacherCode(name);
      // Đảm bảo unique
      while (await prisma.user.findFirst({ where: { teacherCode: attempt } })) {
        attempt = genTeacherCode(name);
      }
      newTeacherCode = attempt;
    }

    const hashed = await bcrypt.hash(password, 10);

    // ── Tạo user ──
    const user = await prisma.user.create({
      data: {
        name:        name.trim(),
        email:       email.toLowerCase().trim(),
        password:    hashed,
        role:        role,
        isActive:    role === 'TEACHER', // GV cần mã kích hoạt nên active ngay; HS đăng ký tự do
        schoolId:    resolvedSchoolId,
        level:       level || null,
        subjects:    role === 'TEACHER' ? JSON.stringify(subjects || []) : null,
        teacherCode: newTeacherCode,   // chỉ GV có giá trị
      },
    });

    // ── Đánh dấu activation code đã sử dụng (chỉ TEACHER) ──
    if (role === 'TEACHER' && activationCode?.trim()) {
      await prisma.activationCode.update({
        where: { code: activationCode.trim().toUpperCase() },
        data:  { isUsed: true, usedBy: user.id },
      });
    }

    // ── Kích hoạt account cho STUDENT ──
    // Học sinh đăng ký tự do → tự động active
    if (role === 'STUDENT') {
      await prisma.user.update({
        where: { id: user.id },
        data:  { isActive: true },
      });
    }

    // Ghi chú: Học sinh KHÔNG nhập mã giáo viên khi đăng ký.
    // Sau khi đăng nhập, học sinh sẽ nhập mã qua nút "+Kết nối giáo viên" trên dashboard.

    return NextResponse.json({ success: true, userId: user.id, teacherCode: newTeacherCode });
  } catch (err: any) {
    console.error('[POST /api/auth/register]', err);
    return NextResponse.json({ success:false, error: err.message || 'Lỗi server' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}