import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST: Create a new class
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, code, year, schoolId, teacherId } = body;

    if (!name || !teacherId) {
      return NextResponse.json(
        { error: "Name and teacherId are required" },
        { status: 400 }
      );
    }

    // Find or create school
    let school;
    if (schoolId) {
      school = await prisma.school.findUnique({ where: { id: schoolId } });
    }
    
    if (!school) {
      // Create a default school if none exists
      school = await prisma.school.upsert({
        where: { name: "Trường Mặc Định" },
        update: {},
        create: { name: "Trường Mặc Định" },
      });
    }

    // Auto-generate class code if not provided
    let classCode = code?.trim().toUpperCase();
    if (!classCode) {
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      classCode = `LOP-${name.replace(/\s+/g, '').substring(0, 6).toUpperCase()}-${randomPart}`;
    }

    // Ensure code is unique
    const existingClass = await prisma.class.findUnique({ where: { code: classCode } });
    if (existingClass) {
      const extraRandom = Math.random().toString(36).substring(2, 5).toUpperCase();
      classCode = `${classCode}-${extraRandom}`;
    }

    // Create the class
    const newClass = await prisma.class.create({
      data: {
        name,
        code: classCode,
        grade: 10, // Default grade
        year: year || new Date().getFullYear(),
        schoolId: school.id,
      },
    });

    // Link teacher to class
    await prisma.teacherClass.create({
      data: {
        teacherId,
        classId: newClass.id,
      },
    });

    return NextResponse.json(newClass);
  } catch (error) {
    console.error("Error creating class:", error);
    return NextResponse.json(
      { error: "Failed to create class" },
      { status: 500 }
    );
  }
}

// GET: Get classes for a teacher
export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get("teacherId");

  if (!teacherId) {
    return NextResponse.json(
      { error: "teacherId is required" },
      { status: 400 }
    );
  }

  try {
    const teacherClasses = await prisma.teacherClass.findMany({
      where: { teacherId },
      include: {
        class: {
          include: {
            school: true,
          },
        },
      },
    });

    const classes = teacherClasses.map((tc) => ({
      id: tc.class.id,
      name: tc.class.name,
      code: tc.class.code || null, // Handle case where code field doesn't exist yet
      grade: tc.class.grade,
      year: tc.class.year,
      schoolName: tc.class.school?.name,
    }));

    return NextResponse.json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json(
      { error: "Failed to fetch classes" },
      { status: 500 }
    );
  }
}