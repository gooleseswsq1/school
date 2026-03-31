/**
 * Scheduled Comment Cleanup Cron Job
 * 
 * This file should be deployed on Vercel to automatically delete expired comments
 * Configure in vercel.json:
 * 
 * {
 *   "crons": [{
 *     "path": "/api/cron/comment-cleanup",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 * 
 * Or call manually with: curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/comment-cleanup
 */

import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredComments } from "@/services/commentCleanup";

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron or authorized source
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Run cleanup
    const deletedCount = await cleanupExpiredComments();

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} expired comments`,
      deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Comment Cleanup Cron] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to cleanup expired comments",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for external cron services
 * Allows triggering cleanup from external scheduled services
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
