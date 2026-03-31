import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Lấy các bài giảng từ giáo viên mà học sinh đã liên kết
export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get("studentId");

  if (!studentId) {
    return NextResponse.json(
      { error: "studentId is required" },
      { status: 400 }
    );
  }

  try {
    // Lấy danh sách giáo viên đã chấp nhận liên kết với học sinh (kèm classId)
    const linkedTeachers = await prisma.studentTeacher.findMany({
      where: {
        studentId,
        status: "accepted",
      },
      select: {
        teacherId: true,
        classId: true,
      },
    });

    console.log(`[student-linked] studentId=${studentId}, linkedTeachers=${linkedTeachers.length}`, 
      linkedTeachers.map(l => ({ teacherId: l.teacherId, classId: l.classId })));

    if (linkedTeachers.length === 0) {
      console.log(`[student-linked] Không tìm thấy giáo viên nào đã accepted cho studentId=${studentId}`);
      return NextResponse.json([]);
    }

    // Tạo điều kiện lọc theo từng liên kết teacher-class
    // Học sinh đã liên kết được xem tất cả bài giảng của giáo viên (kể cả chưa publish)
    const orConditions = linkedTeachers.map((link) => {
      if (link.classId) {
        // Nếu liên kết qua lớp → chỉ lấy bài giảng của lớp đó + bài giảng chung (không gán lớp)
        return {
          authorId: link.teacherId,
          OR: [
            { classId: link.classId },
            { classId: null },
          ],
        };
      }
      // Nếu liên kết trực tiếp (không qua lớp) → lấy tất cả bài giảng
      return {
        authorId: link.teacherId,
      };
    });

    // Lấy các page phù hợp điều kiện liên kết
    const matchedPages = await prisma.page.findMany({
      where: {
        OR: orConditions,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        order: "asc",
      },
    });

    console.log(`[student-linked] matchedPages=${matchedPages.length} cho studentId=${studentId}`);

    if (matchedPages.length === 0) {
      return NextResponse.json([]);
    }

    // Đảm bảo cây không bị gãy: nếu match bài con thì vẫn phải kéo đủ bài mẹ
    const pageMap = new Map<string, any>(
      matchedPages.map((p: any) => [p.id, { ...p, children: [] as any[] }])
    );

    let unresolvedParentIds = Array.from(
      new Set(
        matchedPages
          .map((p: any) => p.parentId)
          .filter((parentId): parentId is string => Boolean(parentId) && !pageMap.has(parentId))
      )
    );

    while (unresolvedParentIds.length > 0) {
      const parentPages = await prisma.page.findMany({
        where: {
          id: { in: unresolvedParentIds },
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (parentPages.length === 0) {
        break;
      }

      parentPages.forEach((parent: any) => {
        if (!pageMap.has(parent.id)) {
          pageMap.set(parent.id, { ...parent, children: [] as any[] });
        }
      });

      unresolvedParentIds = Array.from(
        new Set(
          parentPages
            .map((p: any) => p.parentId)
            .filter((parentId): parentId is string => Boolean(parentId) && !pageMap.has(parentId))
        )
      );
    }

    for (const page of pageMap.values()) {
      if (page.parentId && pageMap.has(page.parentId)) {
        pageMap.get(page.parentId).children.push(page);
      }
    }

    for (const page of pageMap.values()) {
      page.children.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    }

    const rootCourses = Array.from(pageMap.values())
      .filter((p: any) => !p.parentId)
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

    return NextResponse.json(rootCourses);
  } catch (error) {
    console.error("Error fetching student linked pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch pages" },
      { status: 500 }
    );
  }
}