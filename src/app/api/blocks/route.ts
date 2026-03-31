import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createBlockSchema = z.object({
  pageId: z.string(),
  type: z.enum(["VIDEO", "DOCUMENT", "TEXT", "CONTENT", "QUIZ", "CANVA", "RICH_TEXT", "EMBED"]),
  order: z.number().default(0),
  videoUrl: z.string().optional(),
  videoType: z.string().optional(),
  poster: z.string().optional(),
  interactions: z.string().optional(), // JSON string of interactions
  content: z.string().optional(),
});

type CreateBlockInput = z.infer<typeof createBlockSchema>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createBlockSchema.parse(body);

    // Check if user has permission to create blocks (only teachers)
    // First, get the page to check the author
    const page = await prisma.page.findUnique({
      where: { id: data.pageId },
      select: { authorId: true },
    });

    if (!page) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    const author = await prisma.user.findUnique({
      where: { id: page.authorId },
      select: { role: true },
    });

    if (author && author.role !== 'TEACHER' && author.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Only teachers can create blocks" },
        { status: 403 }
      );
    }

    const block = await prisma.pageBlock.create({
      data: {
        pageId: data.pageId,
        type: data.type,
        order: data.order,
        videoUrl: data.videoUrl,
        videoType: data.videoType,
        poster: data.poster,
        interactions: data.interactions,
        content: data.content,
      },
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

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    console.error("Error creating block:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create block" },
      { status: 500 }
    );
  }
}
