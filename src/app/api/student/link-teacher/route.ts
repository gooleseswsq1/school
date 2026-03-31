// app/api/student/link-teacher/route.ts
// Học sinh gửi yêu cầu liên kết với giáo viên qua mã
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST: Học sinh gửi yêu cầu liên kết (hỗ trợ cả mã GV và mã lớp)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, teacherCode, classCode } = body;

    if (!studentId || (!teacherCode?.trim() && !classCode?.trim())) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin' }, { status: 400 });
    }

    let teacher = null;
    let classInfo = null;
    let linkType = 'teacher'; // 'teacher' or 'class'

    if (teacherCode?.trim()) {
      // Tìm giáo viên theo mã GV
      teacher = await prisma.user.findFirst({
        where: { teacherCode: teacherCode.trim().toUpperCase(), role: 'TEACHER', isActive: true },
        select: { id: true, name: true, subjects: true },
      });

      if (!teacher) {
        return NextResponse.json({ success: false, error: 'Mã giáo viên không hợp lệ' }, { status: 404 });
      }
    } else if (classCode?.trim()) {
      // Tìm lớp theo mã lớp
      classInfo = await prisma.class.findUnique({
        where: { code: classCode.trim().toUpperCase() },
        include: {
          teachers: {
            include: {
              teacher: {
                select: { id: true, name: true, subjects: true },
              },
            },
          },
        },
      });

      if (!classInfo) {
        return NextResponse.json({ success: false, error: 'Mã lớp không hợp lệ' }, { status: 404 });
      }

      // Lấy giáo viên đầu tiên của lớp
      if (classInfo.teachers.length > 0) {
        teacher = classInfo.teachers[0].teacher;
        linkType = 'class';
      } else {
        return NextResponse.json({ success: false, error: 'Lớp này chưa có giáo viên' }, { status: 404 });
      }
    }

    if (!teacher) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy giáo viên' }, { status: 404 });
    }

    // Kiểm tra đã có yêu cầu chưa
    const existing = await prisma.studentTeacher.findUnique({
      where: { studentId_teacherId: { studentId, teacherId: teacher.id } },
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return NextResponse.json({ success: false, error: 'Bạn đã kết nối với giáo viên này' });
      }
      if (existing.status === 'pending') {
        return NextResponse.json({ success: false, error: 'Yêu cầu đang chờ giáo viên duyệt' });
      }
      // Nếu rejected → cho phép gửi lại
    }

    // Tính thời gian hết hạn (1 ngày)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Tạo/cập nhật yêu cầu
    const link = await prisma.studentTeacher.upsert({
      where: { studentId_teacherId: { studentId, teacherId: teacher.id } },
      update: { 
        status: 'pending', 
        requestExpiresAt: expiresAt, 
        joinedAt: new Date(),
        classId: classInfo?.id || null,  // Lưu classId nếu liên kết qua mã lớp
      },
      create: { 
        studentId, 
        teacherId: teacher.id, 
        status: 'pending', 
        requestExpiresAt: expiresAt,
        classId: classInfo?.id || null,  // Lưu classId nếu liên kết qua mã lớp
      },
    });

    const message = linkType === 'class' 
      ? `Đã gửi yêu cầu đến giáo viên ${teacher.name} (Lớp ${classInfo?.name})`
      : `Đã gửi yêu cầu đến giáo viên ${teacher.name}`;

    return NextResponse.json({
      success: true,
      message,
      teacherName: teacher.name,
      className: classInfo?.name,
      linkId: link.id,
    });
  } catch (err: any) {
    console.error('[POST /api/student/link-teacher]', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// GET: Lấy danh sách giáo viên đã liên kết + đang chờ của học sinh
export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get('studentId');
  if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 });

  try {
    // Lấy cả accepted và pending (loại bỏ rejected)
    const links = await prisma.studentTeacher.findMany({
      where: { studentId, status: { in: ['accepted', 'pending'] } },
      include: {
        teacher: {
          select: { id: true, name: true, subjects: true, teacherCode: true },
        },
        class: {
          select: { id: true, name: true, grade: true },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const mapLink = (link: typeof links[0]) => {
      let subjects: string[] = [];
      try { subjects = JSON.parse(link.teacher.subjects || '[]'); } catch { /* ignore */ }
      return {
        id: link.id,
        teacherId: link.teacher.id,
        teacherName: link.teacher.name,
        teacherCode: link.teacher.teacherCode,
        subjects,
        status: link.status,
        joinedAt: link.joinedAt,
        classId: link.class?.id || null,
        className: link.class?.name || null,
        classGrade: link.class?.grade || null,
      };
    };

    const accepted = links.filter(l => l.status === 'accepted').map(mapLink);
    const pending = links.filter(l => l.status === 'pending').map(mapLink);

    return NextResponse.json({ accepted, pending });
  } catch (err) {
    console.error('[GET /api/student/link-teacher]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}