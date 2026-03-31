import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Find page by slug (published only)
    const page = await prisma.page.findFirst({
      where: {
        slug,
        isPublished: true,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        children: {
          where: { isPublished: true },
          orderBy: { order: "asc" },
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
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error("Error fetching public page:", error);
    return NextResponse.json(
      { error: "Failed to fetch page" },
      { status: 500 }
    );
  }
}
