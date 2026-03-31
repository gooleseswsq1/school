import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Kiểm tra mã lớp có hợp lệ không
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code?.trim()) {
    return NextResponse.json({ valid: false, error: "Thiếu mã lớp" }, { status: 400 });
  }

  try {
    const classInfo = await prisma.class.findUnique({
      where: { code: code.trim().toUpperCase() },
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
      return NextResponse.json({ valid: false, error: "Mã lớp không tồn tại" });
    }

    if (classInfo.teachers.length === 0) {
      return NextResponse.json({ valid: false, error: "Lớp này chưa có giáo viên" });
    }

    const teacher = classInfo.teachers[0].teacher;
    let subject = "";
    try {
      const subjects = JSON.parse(teacher.subjects || "[]");
      subject = subjects.join(", ");
    } catch {
      subject = teacher.subjects || "";
    }

    return NextResponse.json({
      valid: true,
      teacherName: teacher.name,
      subject,
      className: classInfo.name,
      grade: classInfo.grade,
    });
  } catch (error) {
    console.error("Error checking class code:", error);
    return NextResponse.json(
      { valid: false, error: "Lỗi server" },
      { status: 500 }
    );
  }
}