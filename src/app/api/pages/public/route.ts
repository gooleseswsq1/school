import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get all published root-level pages (no parentId)
    const publishedPages = await prisma.page.findMany({
      where: {
        isPublished: true,
        parentId: null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        blocks: {
          take: 1, // Get first block for preview
          orderBy: {
            order: "asc",
          },
          select: {
            id: true,
            type: true,
            videoUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(publishedPages);
  } catch (error) {
    console.error("Error fetching public pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch public pages" },
      { status: 500 }
    );
  }
}
