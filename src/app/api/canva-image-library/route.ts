import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuthUser } from "@/lib/api-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const upsertSchema = z.object({
  blockId: z.string().optional(),
  url: z.string().min(1),
  hash: z.string().min(1),
  source: z.enum(["upload", "background", "paste"]).default("upload"),
});

const hideSchema = z.object({
  hash: z.string().min(1),
});

function canUseCanvaImageLibrary(role: string): boolean {
  return role === "TEACHER" || role === "ADMIN";
}

function isMissingCanvaImageLibraryTables(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === "P2021"
  );
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getApiAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canUseCanvaImageLibrary(authUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const images = await prisma.canvaImageAsset.findMany({
      where: {
        userId: authUser.id,
        isVisible: true,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        url: true,
        hash: true,
        source: true,
        updatedAt: true,
      },
      take: 200,
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error("[GET /api/canva-image-library]", error);
    if (isMissingCanvaImageLibraryTables(error)) {
      return NextResponse.json(
        {
          error: "Canva image library tables are missing. Run Prisma migrations.",
          code: "MIGRATION_REQUIRED",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Failed to list images" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getApiAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canUseCanvaImageLibrary(authUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const { blockId, url, hash, source } = parsed.data;
    const isVisible = source !== "paste";

    if (blockId) {
      const block = await prisma.pageBlock.findUnique({
        where: { id: blockId },
        select: { page: { select: { authorId: true } } },
      });

      if (!block) {
        return NextResponse.json({ error: "Block not found" }, { status: 404 });
      }

      if (authUser.role !== "ADMIN" && block.page.authorId !== authUser.id) {
        return NextResponse.json({ error: "Forbidden block access" }, { status: 403 });
      }
    }

    const asset = await prisma.canvaImageAsset.upsert({
      where: {
        userId_hash: { userId: authUser.id, hash },
      },
      update: {
        updatedAt: new Date(),
        isVisible: isVisible ? true : undefined,
        source,
      },
      create: {
        userId: authUser.id,
        hash,
        url,
        source,
        isVisible,
      },
      select: {
        id: true,
        userId: true,
        hash: true,
        url: true,
        source: true,
        isVisible: true,
      },
    });

    if (blockId) {
      await prisma.canvaBlockImageRef.upsert({
        where: {
          blockId_imageId: {
            blockId,
            imageId: asset.id,
          },
        },
        update: {},
        create: {
          blockId,
          imageId: asset.id,
        },
      });
    }

    return NextResponse.json({ image: asset });
  } catch (error) {
    console.error("[POST /api/canva-image-library]", error);
    if (isMissingCanvaImageLibraryTables(error)) {
      return NextResponse.json(
        {
          error: "Canva image library tables are missing. Run Prisma migrations.",
          code: "MIGRATION_REQUIRED",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Failed to upsert image asset" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getApiAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canUseCanvaImageLibrary(authUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = hideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const { hash } = parsed.data;

    const updated = await prisma.canvaImageAsset.updateMany({
      where: {
        userId: authUser.id,
        hash,
      },
      data: {
        isVisible: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, count: updated.count });
  } catch (error) {
    console.error("[DELETE /api/canva-image-library]", error);
    if (isMissingCanvaImageLibraryTables(error)) {
      return NextResponse.json(
        {
          error: "Canva image library tables are missing. Run Prisma migrations.",
          code: "MIGRATION_REQUIRED",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Failed to hide image" }, { status: 500 });
  }
}
