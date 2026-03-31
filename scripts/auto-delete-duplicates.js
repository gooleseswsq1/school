#!/usr/bin/env node

/**
 * Auto-delete duplicate comments
 * Keeps the first (oldest) comment and deletes newer duplicates
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 Finding duplicate comments...\n");

    const comments = await prisma.comment.findMany({
      orderBy: { createdAt: "asc" },
    });

    if (comments.length === 0) {
      console.log("✅ No comments in database.\n");
      return;
    }

    // Group by block and author
    const groups = {};
    comments.forEach((comment) => {
      const key = `${comment.blockId}__${comment.authorId}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(comment);
    });

    // Find duplicates
    const duplicates = Object.values(groups)
      .filter((group) => group.length > 1)
      .map((group) => ({
        keep: group[0], // Keep oldest
        delete: group.slice(1), // Delete newer ones
      }));

    if (duplicates.length === 0) {
      console.log("✅ No duplicate comments found.\n");
      return;
    }

    console.log(`⚠️  Found ${duplicates.length} duplicate groups.\n`);
    console.log("Summary of deletions:\n");

    let totalToDelete = 0;
    duplicates.forEach((dup, index) => {
      console.log(
        `${index + 1}. Keeping: [${dup.keep.id.substring(0, 8)}...] (${dup.keep.createdAt.toLocaleString()})`
      );
      console.log(`   Deleting ${dup.delete.length} comment(s):`);
      dup.delete.forEach((comment) => {
        console.log(`     - [${comment.id.substring(0, 8)}...] (${comment.createdAt.toLocaleString()})`);
        totalToDelete++;
      });
      console.log();
    });

    console.log(`Total comments to delete: ${totalToDelete}\n`);

    // Delete duplicates
    for (const dup of duplicates) {
      for (const comment of dup.delete) {
        try {
          await prisma.comment.delete({ where: { id: comment.id } });
          console.log(`✅ Deleted [${comment.id.substring(0, 8)}...]`);
        } catch (error) {
          console.log(`❌ Failed to delete [${comment.id.substring(0, 8)}...]: ${error.message}`);
        }
      }
    }

    console.log(`\n✅ Successfully deleted ${totalToDelete} duplicate comment(s)!\n`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
