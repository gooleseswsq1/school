import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createPageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
  classId: z.string().nullable().optional(),
  authorId: z.string(),
});

type CreatePageInput = z.infer<typeof createPageSchema>;

export async function GET(request: NextRequest) {
  try {
    const authorId = request.nextUrl.searchParams.get("authorId");
    const published = request.nextUrl.searchParams.get("published");

    // If published param is set, fetch published pages for students
    if (published === "true") {
      const publishedPages = await prisma.page.findMany({
        where: { 
          isPublished: true,
          parentId: null, // Only get root pages
        },
        include: {
          author: {
            select: { name: true, id: true }
          },
          blocks: {
            orderBy: { order: "asc" },
            include: {
              documents: true,
              contentItems: true,
              quizzes: {
                orderBy: { order: "asc" },
                include: {
                  questions: {
                    include: {
                      options: {
                        orderBy: { order: "asc" },
                      },
                    },
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
          },
          children: {
            where: { isPublished: true },
            include: {
              blocks: {
                orderBy: { order: "asc" },
                include: {
                  documents: true,
                  contentItems: true,
                  quizzes: {
                    orderBy: { order: "asc" },
                    include: {
                      questions: {
                        include: {
                          options: {
                            orderBy: { order: "asc" },
                          },
                        },
                        orderBy: { order: "asc" },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { order: "asc" }
          }
        },
        orderBy: { order: "asc" },
      });

      // Transform blocks for frontend compatibility
      const transformBlock = (block: any) => ({
        ...block,
        items: block.contentItems || [],
        quiz: block.quizzes?.[0] || null,
      });

      const transformed = publishedPages.map((page: any) => ({
        ...page,
        blocks: (page.blocks || []).map(transformBlock),
        children: (page.children || []).map((child: any) => ({
          ...child,
          blocks: (child.blocks || []).map(transformBlock),
        })),
      }));

      return NextResponse.json(transformed);
    }

    if (!authorId) {
      return NextResponse.json(
        { error: "authorId is required" },
        { status: 400 }
      );
    }

    // Get ALL pages for this author (flat list)
    const allPages = await prisma.page.findMany({
      where: { authorId },
      include: {
        blocks: {
          orderBy: { order: "asc" },
          include: {
            documents: true,
            contentItems: true,
            quizzes: {
              orderBy: { order: "asc" },
              include: {
                questions: {
                  include: {
                    options: {
                      orderBy: { order: "asc" },
                    },
                  },
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
      },
      orderBy: { order: "asc" },
    });

    // Build tree structure from flat list
    const pageMap = new Map<string, any>(allPages.map((p: any) => [p.id, { 
      ...p,
      // Ensure blocks belong ONLY to this page, not inherited
      // Transform blocks: map contentItems→items, quizzes[0]→quiz for frontend
      blocks: (p.blocks || []).map((block: any) => ({
        ...block,
        items: block.contentItems || [],
        quiz: block.quizzes?.[0] || null,
      })),
      children: [] as any[] 
    }]));
    const roots: any[] = [];

    for (const page of pageMap.values()) {
      if (page.parentId && pageMap.has(page.parentId)) {
        const parent = pageMap.get(page.parentId)!;
        parent.children.push(page);
      } else if (!page.parentId) {
        roots.push(page);
      }
    }

    // Sort children by order
    for (const page of pageMap.values()) {
      page.children.sort((a: any, b: any) => a.order - b.order);
    }

    return NextResponse.json(roots);
  } catch (error) {
    console.error("Error fetching pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch pages" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createPageSchema.parse(body);

    // Create or get author (for testing purposes)
    // First try to find existing user by id
    let author = await prisma.user.findUnique({
      where: { id: data.authorId },
    });

    // Check if user has permission to create pages (only teachers)
    if (author && author.role !== 'TEACHER' && author.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Only teachers can create pages" },
        { status: 403 }
      );
    }

    if (!author) {
      // If not found by id, try by email
      author = await prisma.user.findUnique({
        where: { email: `user-${data.authorId}@test.local` },
      });
    }

    if (!author) {
      // Create new user if not found
      author = await prisma.user.create({
        data: {
          id: data.authorId,
          email: `user-${data.authorId}@test.local`,
          name: `User ${data.authorId}`,
          password: "test-password",
          role: "TEACHER",
          isActive: true,
        },
      });
    } else {
      // Update existing user to be active
      author = await prisma.user.update({
        where: { id: author.id },
        data: { isActive: true },
      });
    }

    // Validate parentId if provided and calculate order
    let inheritedClassId: string | null = data.classId || null;
    let order = 0;
    if (data.parentId) {
      const parentPage = await prisma.page.findUnique({
        where: { id: data.parentId },
        select: { authorId: true, id: true, classId: true },
      });

      if (!parentPage) {
        return NextResponse.json(
          { error: "Parent page not found" },
          { status: 404 }
        );
      }

      // Ensure parent page belongs to the same author
      if (parentPage.authorId !== data.authorId) {
        return NextResponse.json(
          { error: "Parent page must belong to the same author" },
          { status: 403 }
        );
      }

      inheritedClassId = parentPage.classId || null;

      // Get max order for this parent's children
      const maxOrder = await prisma.page.findFirst({
        where: { parentId: data.parentId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = (maxOrder?.order ?? -1) + 1;
    } else {
      // Get max order for root pages of this author
      const maxOrder = await prisma.page.findFirst({
        where: { authorId: data.authorId, parentId: null },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = (maxOrder?.order ?? -1) + 1;
    }

    // Check if slug already exists for this author
    const existingPage = await prisma.page.findUnique({
      where: {
        slug_authorId: {
          slug: data.slug,
          authorId: data.authorId,
        },
      },
    });

    if (existingPage) {
      return NextResponse.json(
        { error: "Page with this slug already exists" },
        { status: 409 }
      );
    }

    const page = await prisma.page.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        parentId: data.parentId || null,
        authorId: data.authorId,
        classId: inheritedClassId,
        order,
      },
      include: {
        children: true,
        blocks: {
          include: {
            documents: true,
            contentItems: true,
            quizzes: {
              orderBy: { order: "asc" },
              include: {
                questions: {
                  include: {
                    options: {
                      orderBy: { order: "asc" },
                    },
                  },
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error("Error creating page:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create page" },
      { status: 500 }
    );
  }
}
