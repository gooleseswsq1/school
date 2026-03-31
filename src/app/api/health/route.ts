/**
 * 🏥 Health Check API Endpoint
 * Location: src/app/api/health/route.ts
 * 
 * Purpose:
 * - Monitor application health
 * - Verify database connectivity
 * - Check critical services
 * 
 * Usage:
 * curl https://your-app.vercel.app/api/health
 */

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  database: {
    connected: boolean;
    responseTime?: number;
    error?: string;
  };
  uptime: number;
  environment: string;
}

let startTime = Date.now();

export async function GET(): Promise<NextResponse<HealthStatus>> {
  try {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - startTime;
    const environment = process.env.NODE_ENV || 'unknown';

    // Test database connection
    let dbConnected = false;
    let dbResponseTime = 0;
    let dbError: string | undefined;

    try {
      const startDb = Date.now();
      
      // Simple database query to verify connection
      await prisma.$queryRaw`SELECT 1`;
      
      dbResponseTime = Date.now() - startDb;
      dbConnected = true;
    } catch (error) {
      dbConnected = false;
      dbError = error instanceof Error ? error.message : String(error);
    }

    // Determine overall health status
    let healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!dbConnected) {
      healthStatus = 'unhealthy';
    } else if (dbResponseTime > 1000) {
      healthStatus = 'degraded';
    }

    // Return health status
    return NextResponse.json(
      {
        status: healthStatus,
        timestamp,
        version: process.env.npm_package_version || '0.1.0',
        database: {
          connected: dbConnected,
          responseTime: dbConnected ? dbResponseTime : undefined,
          error: dbError,
        },
        uptime,
        environment,
      },
      {
        status: dbConnected ? 200 : 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[Health Check Error]', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
        database: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        uptime: Date.now() - startTime,
        environment: process.env.NODE_ENV || 'unknown',
      },
      { status: 503 }
    );
  }
}

/**
 * ─────────────────────────────────────────
 * EXPECTED RESPONSE (Healthy)
 * ─────────────────────────────────────────
 * {
 *   "status": "healthy",
 *   "timestamp": "2026-03-31T12:00:00.000Z",
 *   "version": "0.1.0",
 *   "database": {
 *     "connected": true,
 *     "responseTime": 45
 *   },
 *   "uptime": 3600000,
 *   "environment": "production"
 * }
 * 
 * ─────────────────────────────────────────
 * TESTING
 * ─────────────────────────────────────────
 * 
 * Local testing:
 * curl http://localhost:3000/api/health
 * 
 * After deployment:
 * curl https://your-app-name.vercel.app/api/health
 * 
 * With detailed output:
 * curl -i https://your-app-name.vercel.app/api/health
 * 
 * Monitor periodically (using cron or uptime monitoring service):
 * Every 5 minutes: curl https://your-app.vercel.app/api/health
 * Alert if status != "healthy"
 */
