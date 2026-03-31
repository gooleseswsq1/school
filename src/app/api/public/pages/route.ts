import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get all published pages with tree structure
    const pages = await prisma.page.findMany({
      where: { isPublished: true },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          where: { isPublished: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(pages);
  } catch (error) {
    console.error("Error fetching public pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch pages" },
      { status: 500 }
    );
  }
}
