import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updatePageSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().optional(),
  isPublished: z.boolean().optional(),
});

type UpdatePageInput = z.infer<typeof updatePageSchema>;

// Helper: transform block data for frontend compatibility
function transformBlocks(blocks: any[]): any[] {
  return blocks.map((block: any) => ({
    ...block,
    items: block.contentItems || block.items || [],
    quiz: block.quizzes?.[0] || block.quiz || null,
  }));
}

// Helper function to recursively build page tree
async function buildPageTree(pageId: string): Promise<any> {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
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
      parent: true,
    },
  });

  if (!page) return null;

  // Transform blocks for frontend compatibility
  const transformedPage = {
    ...page,
    blocks: transformBlocks(page.blocks || []),
  };

  // Fetch all children
  const children = await prisma.page.findMany({
    where: { parentId: pageId },
    orderBy: { order: "asc" },
  });

  // Recursively build tree for each child
  const childrenWithTree = await Promise.all(
    children.map(child => buildPageTree(child.id))
  );

  return {
    ...transformedPage,
    children: childrenWithTree.filter(Boolean),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const page = await buildPageTree(id);

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error("Error fetching page:", error);
    return NextResponse.json(
      { error: "Failed to fetch page" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updatePageSchema.parse(body);

    // Check if page exists and get author
    const page = await prisma.page.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Check if user has permission to update pages (only teachers)
    const author = await prisma.user.findUnique({
      where: { id: page.authorId },
      select: { role: true },
    });

    if (author && author.role !== 'TEACHER' && author.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Only teachers can update pages" },
        { status: 403 }
      );
    }

    await prisma.page.update({
      where: { id },
      data,
    });

    // Fetch and return updated page with full tree
    const updatedPage = await buildPageTree(id);

    return NextResponse.json(updatedPage);
  } catch (error) {
    console.error("Error updating page:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update page" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorId = request.nextUrl.searchParams.get("authorId");

    // Fetch the page to verify ownership
    const page = await prisma.page.findUnique({
      where: { id },
      select: { authorId: true, id: true },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Check authorization - user can only delete their own pages
    if (page.authorId !== authorId && authorId !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized to delete this page" },
        { status: 403 }
      );
    }

    // Helper function to recursively delete all children
    async function deletePageAndChildren(pageId: string): Promise<void> {
      // Get all children of this page
      const children = await prisma.page.findMany({
        where: { parentId: pageId },
        select: { id: true },
      });

      // Recursively delete all children first
      for (const child of children) {
        await deletePageAndChildren(child.id);
      }

      // Delete the page itself (cascade will handle blocks and documents)
      await prisma.page.delete({
        where: { id: pageId },
      });
    }

    await deletePageAndChildren(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting page:", error);
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500 }
    );
  }
}
