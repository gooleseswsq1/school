/**
 * Comment Cleanup Service
 * Tự động xóa bình luận hết hạn sau 7 ngày
 * 
 * Cách sử dụng:
 * 1. Import: import { initCommentCleanupJob } from "@/services/commentCleanup"
 * 2. Gọi trong server startup hoặc API route init
 * 3. Hoặc manual call: await cleanupExpiredComments()
 */

import { prisma } from "@/lib/prisma";

/**
 * Xóa tất cả bình luận hết hạn
 * @returns Số bình luận đã xóa
 */
export async function cleanupExpiredComments (): Promise<number> {
  try {
    const now = new Date();

    const result = await prisma.comment.deleteMany({
      where: {
        expiresAt: {
          lt: now, // Xóa những bình luận có expiresAt < hiện tại
        },
      },
    });

    console.log(
      `[Comment Cleanup] Deleted ${result.count} expired comments at ${now.toISOString()}`
    );

    return result.count;
  } catch (error) {
    console.error("[Comment Cleanup] Error:", error);
    throw error;
  }
}

/**
 * Tìm bình luận sắp hết hạn (trong vòng 24 giờ)
 * @returns Danh sách bình luận sắp hết hạn
 */
export async function findExpiringComments() {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const comments = await prisma.comment.findMany({
      where: {
        expiresAt: {
          lte: tomorrow,
          gt: now,
        },
      },
      include: {
        author: true,
      },
    });

    return comments;
  } catch (error) {
    console.error("[Comment Cleanup] Error finding expiring comments:", error);
    return [];
  }
}

/**
 * Khởi tạo job cleanup tự động
 * Chạy mỗi giờ để xóa bình luận hết hạn
 * 
 * Cách sử dụng:
 * - Gọi trong root layout hoặc API initialize
 * - Hoặc thiết lập external cron job để call /api/comments DELETE endpoint
 */
export function initCommentCleanupJob() {
  // Chạy cleanup mỗi 1 giờ
  const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  setInterval(async () => {
    try {
      await cleanupExpiredComments();
    } catch (error) {
      console.error("[Comment Cleanup Job] Failed:", error);
    }
  }, CLEANUP_INTERVAL);

  console.log(
    "[Comment Cleanup Job] Initialized - runs every hour"
  );
}

/**
 * Alternative: External Cron Job Setup
 * 
 * Option 1: Using node-cron
 * ========================
 * npm install node-cron
 * 
 * import cron from 'node-cron';
 * import { cleanupExpiredComments } from '@/services/commentCleanup';
 * 
 * // Chạy mỗi ngày lúc 2 AM
 * cron.schedule('0 2 * * *', async () => {
 *   await cleanupExpiredComments();
 * });
 * 
 * 
 * Option 2: Using Vercel Cron (Production)
 * ========================================
 * Tạo file: /api/cron/comment-cleanup/route.ts
 * 
 * import { cleanupExpiredComments } from '@/services/commentCleanup';
 * 
 * export async function GET(request: Request) {
 *   // Verify token for security
 *   if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
 *     return new Response('Unauthorized', { status: 401 });
 *   }
 * 
 *   const deletedCount = await cleanupExpiredComments();
 *   
 *   return Response.json({
 *     success: true,
 *     deletedCount,
 *     timestamp: new Date().toISOString(),
 *   });
 * }
 * 
 * // vercel.json
 * {
 *   "crons": [{
 *     "path": "/api/cron/comment-cleanup",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 * 
 * 
 * Option 3: Using Schedule.dev (External Service)
 * ==============================================
 * https://schedule.dev
 * 
 * 1. Create free schedule.dev account
 * 2. Create new cron job pointing to: {your-domain}/api/comments?method=cleanup
 * 3. Set schedule to run daily at 2 AM
 * 4. Add authorization header with token
 * 
 */

export default {
  cleanupExpiredComments,
  findExpiringComments,
  initCommentCleanupJob,
};
