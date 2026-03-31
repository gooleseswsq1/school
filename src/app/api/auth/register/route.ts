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
    const normalizedRole = typeof role === 'string'
      ? (role.trim().toUpperCase() as 'TEACHER' | 'STUDENT' | 'ADMIN' | '')
      : '';
    const normalizedActivationCode = typeof activationCode === 'string'
      ? activationCode.trim().toUpperCase()
      : '';

    if (!['TEACHER', 'STUDENT', 'ADMIN'].includes(normalizedRole)) {
      return NextResponse.json({ success:false, error:'Vai trò không hợp lệ' }, { status: 400 });
    }

    const userRole = normalizedRole as 'TEACHER' | 'STUDENT' | 'ADMIN';

    if (userRole === 'ADMIN') {
      const adminBootstrapCode = process.env.ADMIN_BOOTSTRAP_CODE?.trim().toUpperCase();

      if (!adminBootstrapCode) {
        return NextResponse.json({ success:false, error:'Chức năng khởi tạo admin chưa được bật' }, { status: 403 });
      }

      if (!normalizedActivationCode) {
        return NextResponse.json({ success:false, error:'Vui lòng nhập mã khởi tạo admin' }, { status: 400 });
      }

      if (normalizedActivationCode !== adminBootstrapCode) {
        return NextResponse.json({ success:false, error:'Mã khởi tạo admin không đúng' }, { status: 403 });
      }

      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount > 0) {
        return NextResponse.json({ success:false, error:'Hệ thống đã có tài khoản admin, không thể khởi tạo thêm từ trang đăng ký' }, { status: 403 });
      }
    }

    // ── Kiểm tra activation code (chỉ TEACHER cần) ──
    // Học sinh đăng ký tự do không cần mã kích hoạt
    // Giáo viên cần mã kích hoạt do admin cung cấp
    if (userRole === 'TEACHER') {
      if (!normalizedActivationCode) {
        return NextResponse.json({ success:false, error:'Mã kích hoạt là bắt buộc cho giáo viên' });
      }
      const code = await prisma.activationCode.findUnique({
        where: { code: normalizedActivationCode },
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
    if (userRole !== 'ADMIN' && !resolvedSchoolId && schoolName?.trim()) {
      const school = await prisma.school.upsert({
        where: { name: schoolName.trim() },
        update: {},
        create: { name: schoolName.trim() },
      });
      resolvedSchoolId = school.id;
    }

    // ── Sinh teacher code (chỉ TEACHER) ──
    let newTeacherCode: string | null = null;
    if (userRole === 'TEACHER') {
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
        role:        userRole,
        isActive:    userRole !== 'STUDENT',
        schoolId:    userRole === 'ADMIN' ? null : resolvedSchoolId,
        level:       userRole === 'ADMIN' ? null : level || null,
        subjects:    userRole === 'TEACHER' ? JSON.stringify(subjects || []) : null,
        teacherCode: newTeacherCode,   // chỉ GV có giá trị
      },
    });

    // ── Đánh dấu activation code đã sử dụng (chỉ TEACHER) ──
    if (userRole === 'TEACHER' && normalizedActivationCode) {
      await prisma.activationCode.update({
        where: { code: normalizedActivationCode },
        data:  { isUsed: true, usedBy: user.id },
      });
    }

    // ── Kích hoạt account cho STUDENT ──
    // Học sinh đăng ký tự do → tự động active
    if (userRole === 'STUDENT') {
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