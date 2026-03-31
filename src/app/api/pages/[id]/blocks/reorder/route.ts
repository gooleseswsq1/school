import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reorderBlocksSchema = z.object({
  blocks: z.array(
    z.object({
      id: z.string(),
      order: z.number(),
    })
  ),
});

type ReorderBlocksInput = z.infer<typeof reorderBlocksSchema>;

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
        },
      },
      parent: true,
    },
  });

  if (!page) return null;

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
    ...page,
    children: childrenWithTree.filter(Boolean),
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { blocks } = reorderBlocksSchema.parse(body);

    // Check if page exists and get author
    const page = await prisma.page.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Check if user has permission to reorder blocks (only teachers)
    const author = await prisma.user.findUnique({
      where: { id: page.authorId },
      select: { role: true },
    });

    if (author && author.role !== 'TEACHER' && author.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Only teachers can reorder blocks" },
        { status: 403 }
      );
    }

    // Update order for each block
    await Promise.all(
      blocks.map(block =>
        prisma.pageBlock.update({
          where: { id: block.id },
          data: { order: block.order },
        })
      )
    );

    // Fetch and return updated page with full tree
    const updatedPage = await buildPageTree(id);

    if (!updatedPage) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json(updatedPage);
  } catch (error) {
    console.error("Error reordering blocks:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to reorder blocks" },
      { status: 500 }
    );
  }
}
