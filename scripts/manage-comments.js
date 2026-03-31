#!/usr/bin/env node

/**
 * Comment Management Tool
 * Features:
 * - List all comments with details
 * - Find duplicate comments
 * - Link comments as replies
 * - Delete duplicate comments
 * - Manage student-teacher comment interactions
 */

const { PrismaClient } = require("@prisma/client");
const readline = require("readline");
const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function showMenu() {
  console.clear();
  console.log("\n" + "=".repeat(80));
  console.log("COMMENT MANAGEMENT TOOL");
  console.log("=".repeat(80));
  console.log("\n1. Xem tất cả bình luận (View all comments)");
  console.log("2. Kiểm tra bình luận trùng lặp (Check duplicates)");
  console.log("3. Liên kết bình luận (Link comments as reply)");
  console.log("4. Xóa bình luận trùng lặp (Delete duplicate)");
  console.log("5. Xem tương tác học sinh-giáo viên (View student-teacher interactions)");
  console.log("6. Thống kê (Statistics)");
  console.log("0. Thoát (Exit)");
  console.log("=".repeat(80) + "\n");

  const choice = await prompt("Chọn lựa chọn (Choose option): ");
  return choice.trim();
}

async function viewAllComments() {
  console.clear();
  console.log("\n📋 All Comments:\n");

  const comments = await prisma.comment.findMany({
    include: {
      author: true,
      block: {
        select: {
          id: true,
          content: true,
          page: { select: { id: true, title: true } },
        },
      },
      replyTo: { select: { id: true, author: { select: { name: true } } } },
      replies: { select: { id: true } },
    },
    orderBy: [{ blockId: "asc" }, { createdAt: "desc" }],
  });

  if (comments.length === 0) {
    console.log("❌ No comments found.\n");
    return;
  }

  comments.forEach((comment, index) => {
    console.log(
      `\n${index + 1}. [${comment.id.substring(0, 8)}...] - ${comment.author.name} (${comment.author.role})`
    );
    console.log(`   Page: ${comment.block?.page?.title || "N/A"}`);
    console.log(
      `   Content: ${comment.content.substring(0, 60)}${comment.content.length > 60 ? "..." : ""}`
    );
    console.log(`   Created: ${comment.createdAt.toLocaleString()}`);
    if (comment.replyToCommentId) {
      console.log(`   ↳ Reply to: ${comment.replyTo?.author?.name || "Unknown"}`);
    }
    if (comment.replies.length > 0) {
      console.log(`   ↳ ${comment.replies.length} reply/replies`);
    }
  });

  console.log(`\n✅ Total: ${comments.length} comments\n`);
  await prompt("Nhấn Enter để tiếp tục (Press Enter to continue)...");
}

async function checkDuplicates() {
  console.clear();
  console.log("\n🔍 Checking for duplicate comments...\n");

  const comments = await prisma.comment.findMany({
    include: { author: true, block: { select: { page: true } } },
  });

  if (comments.length === 0) {
    console.log("❌ No comments found.\n");
    await prompt("Press Enter to continue...");
    return;
  }

  // Group by block and author
  const duplicateGroups = {};
  comments.forEach((comment) => {
    const key = `${comment.blockId}__${comment.authorId}`;
    if (!duplicateGroups[key]) {
      duplicateGroups[key] = [];
    }
    duplicateGroups[key].push(comment);
  });

  // Find groups with more than 1 comment
  const duplicates = Object.values(duplicateGroups).filter((group) => group.length > 1);

  if (duplicates.length === 0) {
    console.log("✅ No duplicate comments found.\n");
    await prompt("Press Enter to continue...");
    return;
  }

  console.log(`⚠️  Found ${duplicates.length} duplicate groups:\n`);

  duplicates.forEach((group, index) => {
    const author = group[0].author;
    const page = group[0].block?.page;
    console.log(`\n${index + 1}. Author: ${author.name} (${author.role})`);
    console.log(`   Page: ${page?.title || "N/A"}`);
    console.log(`   Number of duplicates: ${group.length}`);
    console.log(`   Comments:`);
    group.forEach((comment, i) => {
      console.log(
        `     ${i + 1}. [${comment.id.substring(0, 8)}...] ${comment.createdAt.toLocaleString()}`
      );
      console.log(
        `        "${comment.content.substring(0, 50)}${comment.content.length > 50 ? "..." : ""}"`
      );
    });
  });

  console.log();
  await prompt("Nhấn Enter để tiếp tục (Press Enter to continue)...");
}

async function linkComments() {
  console.clear();
  console.log("\n🔗 Link comments (create reply):\n");

  const comments = await prisma.comment.findMany({
    include: { author: true, block: { select: { page: true } } },
  });

  if (comments.length < 2) {
    console.log("❌ Need at least 2 comments to link.\n");
    await prompt("Press Enter to continue...");
    return;
  }

  console.log("Available comments:\n");
  comments.forEach((comment, index) => {
    console.log(
      `${index + 1}. [${comment.id.substring(0, 8)}...] - ${comment.author.name}: "${comment.content.substring(
        0,
        40
      )}..."`
    );
  });

  const replyIndex = parseInt(await prompt("\nSelect comment to reply to (number): ")) - 1;
  if (replyIndex < 0 || replyIndex >= comments.length) {
    console.log("❌ Invalid selection.\n");
    return;
  }

  const parentCommentId = comments[replyIndex].id;
  const availableReplies = comments.filter(
    (c) => c.id !== parentCommentId && !c.replyToCommentId
  );

  if (availableReplies.length === 0) {
    console.log("❌ No available comments to use as reply.\n");
    await prompt("Press Enter to continue...");
    return;
  }

  console.log("\nAvailable comments to use as reply:\n");
  availableReplies.forEach((comment, index) => {
    console.log(
      `${index + 1}. [${comment.id.substring(0, 8)}...] - ${comment.author.name}: "${comment.content.substring(
        0,
        40
      )}..."`
    );
  });

  const replyCommentIndex = parseInt(await prompt("\nSelect comment to link as reply (number): ")) - 1;
  if (replyCommentIndex < 0 || replyCommentIndex >= availableReplies.length) {
    console.log("❌ Invalid selection.\n");
    return;
  }

  const replyCommentId = availableReplies[replyCommentIndex].id;

  try {
    await prisma.comment.update({
      where: { id: replyCommentId },
      data: { replyToCommentId: parentCommentId },
    });

    console.log(`\n✅ Successfully linked comment as reply!`);
    console.log(`   Parent: ${comments[replyIndex].author.name}`);
    console.log(
      `   Reply: ${availableReplies[replyCommentIndex].author.name}`
    );
  } catch (error) {
    console.log(`\n❌ Error linking comments: ${error.message}`);
  }

  await prompt("\nPress Enter to continue...");
}

async function deleteDuplicate() {
  console.clear();
  console.log("\n🗑️  Delete duplicate comment:\n");

  const comments = await prisma.comment.findMany({
    include: { author: true },
  });

  if (comments.length === 0) {
    console.log("❌ No comments found.\n");
    await prompt("Press Enter to continue...");
    return;
  }

  // Group by block and author
  const duplicateGroups = {};
  comments.forEach((comment) => {
    const key = `${comment.blockId}__${comment.authorId}`;
    if (!duplicateGroups[key]) {
      duplicateGroups[key] = [];
    }
    duplicateGroups[key].push(comment);
  });

  const duplicates = Object.values(duplicateGroups).filter((group) => group.length > 1);

  if (duplicates.length === 0) {
    console.log("✅ No duplicates found to delete.\n");
    await prompt("Press Enter to continue...");
    return;
  }

  console.log(`Found ${duplicates.length} duplicate groups:\n`);

  duplicates.forEach((group, index) => {
    console.log(`${index + 1}. ${group[0].author.name} - ${group.length} comments:`);
    group.forEach((comment, i) => {
      console.log(`   ${i + 1}. [${comment.id.substring(0, 8)}...] ${comment.createdAt.toLocaleString()}`);
    });
  });

  const groupIndex = parseInt(await prompt("\nSelect group to delete from (number): ")) - 1;
  if (groupIndex < 0 || groupIndex >= duplicates.length) {
    console.log("❌ Invalid selection.\n");
    return;
  }

  const selectedGroup = duplicates[groupIndex];
  console.log(`\nComments in group:\n`);
  selectedGroup.forEach((comment, i) => {
    console.log(`${i + 1}. [${comment.id.substring(0, 8)}...] ${comment.createdAt.toLocaleString()}`);
    console.log(`   "${comment.content.substring(0, 50)}..."`);
  });

  const commentIndex =
    parseInt(await prompt("\nSelect comment to DELETE (number, usually the oldest): ")) - 1;
  if (commentIndex < 0 || commentIndex >= selectedGroup.length) {
    console.log("❌ Invalid selection.\n");
    return;
  }

  const toDelete = selectedGroup[commentIndex];
  const confirm = await prompt(
    `\n⚠️  Are you sure you want to delete this comment? (yes/no): `
  );

  if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
    console.log("❌ Deletion cancelled.\n");
    await prompt("Press Enter to continue...");
    return;
  }

  try {
    await prisma.comment.delete({
      where: { id: toDelete.id },
    });

    console.log(
      `\n✅ Successfully deleted comment from ${toDelete.author.name}`
    );
  } catch (error) {
    console.log(`\n❌ Error deleting comment: ${error.message}`);
  }

  await prompt("\nPress Enter to continue...");
}

async function viewInteractions() {
  console.clear();
  console.log("\n👥 Student-Teacher Comment Interactions:\n");

  const comments = await prisma.comment.findMany({
    include: {
      author: true,
      block: { select: { page: true } },
    },
  });

  // Find blocks with student-teacher comments
  const blockComments = {};
  comments.forEach((comment) => {
    if (!blockComments[comment.blockId]) {
      blockComments[comment.blockId] = { students: [], teachers: [], page: null };
    }
    if (comment.author.role === "STUDENT") {
      blockComments[comment.blockId].students.push(comment);
    } else if (comment.author.role === "TEACHER") {
      blockComments[comment.blockId].teachers.push(comment);
    }
    blockComments[comment.blockId].page = comment.block?.page;
  });

  const interactions = Object.entries(blockComments)
    .filter(([, data]) => data.students.length > 0 && data.teachers.length > 0)
    .map(([blockId, data]) => ({ blockId, ...data }));

  if (interactions.length === 0) {
    console.log("❌ No student-teacher interactions found.\n");
    await prompt("Press Enter to continue...");
    return;
  }

  console.log(`✅ Found ${interactions.length} blocks with interactions:\n`);

  interactions.forEach((interaction, index) => {
    console.log(
      `${index + 1}. Page: ${interaction.page?.title || "N/A"}`
    );
    console.log(`   Block: ${interaction.blockId}`);
    console.log(`   Students (${interaction.students.length}):`);
    interaction.students.forEach((comment) => {
      console.log(`     - ${comment.author.name}: "${comment.content.substring(0, 40)}..."`);
    });
    console.log(`   Teachers (${interaction.teachers.length}):`);
    interaction.teachers.forEach((comment) => {
      console.log(`     - ${comment.author.name}: "${comment.content.substring(0, 40)}..."`);
    });
    console.log();
  });

  await prompt("Press Enter to continue...");
}

async function showStats() {
  console.clear();
  console.log("\n📊 Comment Statistics:\n");

  const [totalComments, duplicates, linked, teachers, students] = await Promise.all([
    prisma.comment.count(),
    prisma.comment.groupBy({
      by: ["blockId", "authorId"],
      having: { id: { _count: { gt: 1 } } },
      _count: true,
    }),
    prisma.comment.count({ where: { replyToCommentId: { not: null } } }),
    prisma.comment.count({
      where: { author: { role: "TEACHER" } },
    }),
    prisma.comment.count({
      where: { author: { role: "STUDENT" } },
    }),
  ]);

  const adminComments = totalComments - teachers - students;

  console.log(`Total comments: ${totalComments}`);
  console.log(`Duplicate groups: ${duplicates.length}`);
  console.log(`Linked replies: ${linked}`);
  console.log(`Teacher comments: ${teachers}`);
  console.log(`Student comments: ${students}`);
  console.log(`Admin comments: ${adminComments}`);

  console.log();
  await prompt("Press Enter to continue...");
}

async function main() {
  try {
    let running = true;
    while (running) {
      const choice = await showMenu();

      switch (choice) {
        case "1":
          await viewAllComments();
          break;
        case "2":
          await checkDuplicates();
          break;
        case "3":
          await linkComments();
          break;
        case "4":
          await deleteDuplicate();
          break;
        case "5":
          await viewInteractions();
          break;
        case "6":
          await showStats();
          break;
        case "0":
          running = false;
          break;
        default:
          console.log("Invalid option");
          await prompt("Press Enter to continue...");
      }
    }

    console.log("\n👋 Goodbye!\n");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
