#!/usr/bin/env node

/**
 * Script to check all comments in the database
 * Identifies duplicates, student-teacher pairs, and comment relationships
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 Checking all comments in database...\n");

    // Get all comments with full details
    const comments = await prisma.comment.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        block: {
          select: {
            id: true,
            content: true,
            page: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: [{ blockId: "asc" }, { createdAt: "desc" }],
    });

    if (comments.length === 0) {
      console.log("❌ No comments found in database.\n");
      return;
    }

    console.log(`📊 Total comments: ${comments.length}\n`);

    // Group comments by block
    const commentsByBlock = {};
    comments.forEach((comment) => {
      if (!commentsByBlock[comment.blockId]) {
        commentsByBlock[comment.blockId] = [];
      }
      commentsByBlock[comment.blockId].push(comment);
    });

    // Analyze duplicates
    console.log("=".repeat(80));
    console.log("DUPLICATE COMMENTS ANALYSIS");
    console.log("=".repeat(80) + "\n");

    const duplicateGroups = [];

    Object.entries(commentsByBlock).forEach(([blockId, blockComments]) => {
      // Group by author
      const byAuthor = {};
      blockComments.forEach((comment) => {
        const authorKey = comment.authorId;
        if (!byAuthor[authorKey]) {
          byAuthor[authorKey] = [];
        }
        byAuthor[authorKey].push(comment);
      });

      // Find duplicates (same author, multiple comments on same block)
      Object.entries(byAuthor).forEach(([authorId, authorComments]) => {
        if (authorComments.length > 1) {
          duplicateGroups.push({
            blockId,
            authorId,
            author: authorComments[0].author,
            comments: authorComments,
          });
        }
      });
    });

    if (duplicateGroups.length > 0) {
      console.log(`⚠️  Found ${duplicateGroups.length} groups with duplicate comments:\n`);
      duplicateGroups.forEach((group, index) => {
        console.log(`${index + 1}. Author: ${group.author.name} (${group.author.role})`);
        console.log(`   Email: ${group.author.email}`);
        console.log(`   Block ID: ${group.blockId}`);
        console.log(`   Number of comments: ${group.comments.length}`);
        group.comments.forEach((comment, i) => {
          console.log(
            `   ${i + 1}. ${comment.createdAt.toLocaleString()} - "${comment.content.substring(0, 50)}${
              comment.content.length > 50 ? "..." : ""
            }"`
          );
        });
        console.log();
      });
    } else {
      console.log("✅ No duplicate comments found (same author on same block).\n");
    }

    // Analyze student-teacher interactions
    console.log("=".repeat(80));
    console.log("STUDENT-TEACHER COMMENT INTERACTIONS");
    console.log("=".repeat(80) + "\n");

    const interactions = [];
    Object.entries(commentsByBlock).forEach(([blockId, blockComments]) => {
      const students = blockComments.filter((c) => c.author.role === "STUDENT");
      const teachers = blockComments.filter((c) => c.author.role === "TEACHER");

      if (students.length > 0 && teachers.length > 0) {
        interactions.push({
          blockId,
          studentCount: students.length,
          teacherCount: teachers.length,
          students,
          teachers,
        });
      }
    });

    if (interactions.length > 0) {
      console.log(`✅ Found ${interactions.length} blocks with student-teacher interactions:\n`);
      interactions.forEach((interaction, index) => {
        const page = interaction.students[0]?.block?.page;
        console.log(`${index + 1}. Block: ${interaction.blockId}`);
        if (page) {
          console.log(`   Page: ${page.title}`);
        }
        console.log(`   Students: ${interaction.studentCount}, Teachers: ${interaction.teacherCount}`);
        console.log("   Students:");
        interaction.students.forEach((c) => {
          console.log(`     - ${c.author.name}: "${c.content.substring(0, 40)}..."`);
        });
        console.log("   Teachers:");
        interaction.teachers.forEach((c) => {
          console.log(`     - ${c.author.name}: "${c.content.substring(0, 40)}..."`);
        });
        console.log();
      });
    } else {
      console.log("❌ No blocks found with student-teacher interactions.\n");
    }

    // Summary
    console.log("=".repeat(80));
    console.log("SUMMARY");
    console.log("=".repeat(80) + "\n");
    console.log(`Total comments: ${comments.length}`);
    console.log(`Total blocks with comments: ${Object.keys(commentsByBlock).length}`);
    console.log(`Duplicate groups: ${duplicateGroups.length}`);
    console.log(`Total duplicate comments: ${duplicateGroups.reduce((sum, g) => sum + (g.comments.length - 1), 0)}`);
    console.log(`Student-teacher interactions: ${interactions.length}`);

    // Get all unique users who commented
    const uniqueAuthors = new Set(comments.map((c) => c.authorId));
    const authorDetails = await Promise.all(
      Array.from(uniqueAuthors).map((id) =>
        prisma.user.findUnique({
          where: { id },
          select: { id: true, name: true, email: true, role: true },
        })
      )
    );

    console.log("\nUsers who commented:");
    authorDetails.forEach((author) => {
      const count = comments.filter((c) => c.authorId === author.id).length;
      console.log(`  ${author.name} (${author.role}): ${count} comment(s)`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
