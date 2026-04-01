import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuthUser } from "@/lib/api-auth";
import { z } from "zod";

const syncSchema = z.object({
  blockId: z.string().min(1),
  hashes: z.array(z.string().min(1)).default([]),
});

export async function POST(request: NextRequest) {
  try {
    const authUser = await getApiAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const { blockId, hashes } = parsed.data;

    const assets = await prisma.canvaImageAsset.findMany({
      where: {
        userId: authUser.id,
        hash: { in: hashes },
      },
      select: { id: true, hash: true },
    });

    const wantedImageIds = new Set(assets.map((a) => a.id));

    const currentRefs = await prisma.canvaBlockImageRef.findMany({
      where: { blockId },
      select: { id: true, imageId: true },
    });

    const toDeleteRefIds = currentRefs
      .filter((ref) => !wantedImageIds.has(ref.imageId))
      .map((ref) => ref.id);

    await prisma.$transaction(async (tx) => {
      if (toDeleteRefIds.length > 0) {
        await tx.canvaBlockImageRef.deleteMany({
          where: { id: { in: toDeleteRefIds } },
        });
      }

      for (const asset of assets) {
        await tx.canvaBlockImageRef.upsert({
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

      // Cleanup hidden assets with zero references to keep storage lean.
      const hiddenAssets = await tx.canvaImageAsset.findMany({
        where: {
          userId: authUser.id,
          isVisible: false,
        },
        select: {
          id: true,
          refs: { select: { id: true }, take: 1 },
        },
      });

      const orphanIds = hiddenAssets.filter((a) => a.refs.length === 0).map((a) => a.id);
      if (orphanIds.length > 0) {
        await tx.canvaImageAsset.deleteMany({
          where: { id: { in: orphanIds } },
        });
      }
    });

    return NextResponse.json({ ok: true, synced: assets.length });
  } catch (error) {
    console.error("[POST /api/canva-image-library/sync]", error);
    return NextResponse.json({ error: "Failed to sync block image refs" }, { status: 500 });
  }
}
