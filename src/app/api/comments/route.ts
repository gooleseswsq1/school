import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCommentSchema = z.object({
  blockId: z.string(),
  authorId: z.string(),
  content: z.string().min(1).max(5000),
  replyToCommentId: z.string().optional(), // Optional for comment replies
});

const getCommentsSchema = z.object({
  blockId: z.string(),
});

// GET comments for a specific block
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const blockId = searchParams.get("blockId");

    if (!blockId) {
      return NextResponse.json(
        { error: "blockId is required" },
        { status: 400 }
      );
    }

    const comments = await prisma.comment.findMany({
      where: {
        blockId,
        // Only get comments that haven't expired
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            author: { select: { name: true } },
            content: true,
          },
        },
        replies: {
          select: {
            id: true,
            author: { select: { id: true, name: true } },
            content: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: comments,
      total: comments.length,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST create new comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createCommentSchema.parse(body);

    // Check if blockId is a page-level comment (format: page-{pageId})
    const isPageLevelComment = validated.blockId.startsWith("page-");
    let entityExists = false;

    if (isPageLevelComment) {
      // For page-level comments, extract pageId and validate it exists
      const pageId = validated.blockId.replace("page-", "");
      const pageExists = await prisma.page.findUnique({
        where: { id: pageId },
      });
      entityExists = !!pageExists;
      
      if (!entityExists) {
        return NextResponse.json(
          { error: "Trang không tồn tại" },
          { status: 404 }
        );
      }
    } else {
      // For block-level comments, validate the block exists
      const blockExists = await prisma.pageBlock.findUnique({
        where: { id: validated.blockId },
      });
      entityExists = !!blockExists;

      if (!entityExists) {
        return NextResponse.json(
          { error: "Khối không tồn tại" },
          { status: 404 }
        );
      }
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: validated.authorId },
    });

    if (!userExists) {
      return NextResponse.json(
        { error: "Người dùng không tồn tại" },
        { status: 404 }
      );
    }

    // Create comment with expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // If replyToCommentId is provided, validate it exists and belongs to the same block
    if (validated.replyToCommentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: validated.replyToCommentId },
      });

      if (!parentComment) {
        return NextResponse.json(
          { error: "Bình luận gốc không tồn tại" },
          { status: 404 }
        );
      }

      if (parentComment.blockId !== validated.blockId) {
        return NextResponse.json(
          { error: "Bình luận reply phải cùng khối" },
          { status: 400 }
        );
      }
    }

    const comment = await prisma.comment.create({
      data: {
        blockId: validated.blockId,
        authorId: validated.authorId,
        content: validated.content,
        replyToCommentId: validated.replyToCommentId,
        expiresAt,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            author: { select: { name: true } },
            content: true,
          },
        },
        replies: {
          select: {
            id: true,
            author: { select: { id: true, name: true } },
            content: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: comment,
        message: "Bình luận được tạo thành công",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Không thể tạo bình luận" },
      { status: 500 }
    );
  }
}

// DELETE expired comments (cleanup job)
export async function DELETE(request: NextRequest) {
  try {
    // This endpoint should ideally be protected and called by a cron job
    const result = await prisma.comment.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} expired comments`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Error deleting expired comments:", error);
    return NextResponse.json(
      { error: "Failed to delete expired comments" },
      { status: 500 }
    );
  }
}
