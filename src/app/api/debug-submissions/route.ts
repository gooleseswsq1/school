import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const submissions = await prisma.document.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      count: submissions.length,
      submissions: submissions.map(s => ({
        id: s.id,
        title: s.title,
        fileUrl: s.fileUrl,
        authorId: s.authorId,
        authorName: s.author?.name,
        createdAt: s.createdAt,
        status: s.status,
      }))
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
