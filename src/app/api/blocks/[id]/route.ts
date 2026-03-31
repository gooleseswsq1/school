import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateBlockSchema = z.object({
  type: z.enum(["VIDEO", "DOCUMENT", "TEXT", "CONTENT", "QUIZ", "CANVA", "RICH_TEXT", "EMBED"]).optional(),
  order: z.number().optional(),
  videoUrl: z.string().optional(),
  videoType: z.string().optional(),
  poster: z.string().optional(),
  interactions: z.string().optional(), // JSON string of interactions
  content: z.string().optional(),
  slidesData: z.string().optional(), // JSON string for canvas/slides data
  items: z.array(z.object({
    id: z.string(),
    title: z.string(),
    image: z.string().optional(),
    shortcutCode: z.string().optional(),
    shortcutUrl: z.string().optional(),
  })).optional(),
});

type UpdateBlockInput = z.infer<typeof updateBlockSchema>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const block = await prisma.pageBlock.findUnique({
      where: { id },
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
    });

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    return NextResponse.json(block);
  } catch (error) {
    console.error("Error fetching block:", error);
    return NextResponse.json(
      { error: "Failed to fetch block" },
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
    console.log(`[PUT /api/blocks/${id}] Received request`);
    
    const body = await request.json();
    console.log(`[PUT /api/blocks/${id}] Body keys:`, Object.keys(body));
    if (body.slidesData) {
      console.log(`[PUT /api/blocks/${id}] slidesData size:`, body.slidesData.length, 'bytes');
    }
    
    // Check if block exists first
    const existingBlock = await prisma.pageBlock.findUnique({
      where: { id },
      include: {
        page: {
          select: { authorId: true },
        },
      },
    });

    if (!existingBlock) {
      console.error(`[PUT /api/blocks/${id}] Block not found`);
      return NextResponse.json(
        { error: "Block not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to update blocks (only teachers)
    const author = await prisma.user.findUnique({
      where: { id: existingBlock.page.authorId },
      select: { role: true },
    });

    if (author && author.role !== 'TEACHER' && author.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Only teachers can update blocks" },
        { status: 403 }
      );
    }

    if (!existingBlock) {
      console.error(`[PUT /api/blocks/${id}] Block not found`);
      return NextResponse.json(
        { error: "Block not found" },
        { status: 404 }
      );
    }
    
    // Validate the data with Zod
    let data;
    try {
      data = updateBlockSchema.parse(body);
      console.log(`[PUT /api/blocks/${id}] Validation passed`);
    } catch (zodError) {
      console.error(`[PUT /api/blocks/${id}] Zod validation error:`, zodError);
      if (zodError instanceof z.ZodError) {
        return NextResponse.json({ 
          error: "Validation error", 
          details: zodError.errors 
        }, { status: 400 });
      }
      throw zodError;
    }

    // Extract items if provided
    const { items, ...blockData } = data as any;

    // Update block data
    console.log(`[PUT /api/blocks/${id}] Updating block with:`, Object.keys(blockData));
    const block = await prisma.pageBlock.update({
      where: { id },
      data: blockData,
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
    });

    console.log(`[PUT /api/blocks/${id}] Block updated successfully`);

    // Handle items update if provided
    if (items) {
      // Delete existing content items
      await prisma.contentItem.deleteMany({
        where: { blockId: id },
      });

      // Create new content items
      if (items.length > 0) {
        const itemsToCreate = items.map((item: any, index: number) => ({
          blockId: id,
          title: item.title,
          image: item.image,
          shortcutCode: item.shortcutCode,
          shortcutUrl: item.shortcutUrl,
          order: index,
        }));

        await prisma.contentItem.createMany({
          data: itemsToCreate,
        });
      }

      // Re-fetch block with updated content items
      return NextResponse.json(
        await prisma.pageBlock.findUnique({
          where: { id },
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
        })
      );
    }

    return NextResponse.json(block);
  } catch (error) {
    console.error(`[PUT /api/blocks] Error:`, error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to update block",
        details: error instanceof Error ? error.message : undefined
      }, 
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

    // Check if block exists and get page author
    const existingBlock = await prisma.pageBlock.findUnique({
      where: { id },
      include: {
        page: {
          select: { authorId: true },
        },
      },
    });

    if (!existingBlock) {
      return NextResponse.json(
        { error: "Block not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to delete blocks (only teachers)
    const author = await prisma.user.findUnique({
      where: { id: existingBlock.page.authorId },
      select: { role: true },
    });

    if (author && author.role !== 'TEACHER' && author.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Only teachers can delete blocks" },
        { status: 403 }
      );
    }

    await prisma.pageBlock.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting block:", error);
    return NextResponse.json(
      { error: "Failed to delete block" },
      { status: 500 }
    );
  }
}
