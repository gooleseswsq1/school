/**
 * Example: Cached API Endpoint
 * Shows how to use caching with Redis
 * 
 * Usage in route handler:
 * ```
 * export const GET = withCacheMiddleware(handler, cacheConfig.content);
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { cacheGet, cacheSet, cacheGetOrSet, cacheKeys } from '@/lib/cache';

/**
 * Example: Get page with cache
 */

export async function getPageCached(pageId: string) {
  const cacheKey = cacheKeys.page(pageId);

  // Try cache first
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from database (your DB query here)
  // Example with Prisma:
  // const page = await prisma.page.findUnique({
  //   where: { id: pageId },
  //   include: { content: true },
  // });

  // For now, return mock data
  const page = {
    id: pageId,
    title: 'Sample Page',
    content: 'Page content here',
  };
  if (page) {
    // Store in cache for 5 minutes
    await cacheSet(cacheKey, page, { ttl: 300, tags: ['pages', `page:${pageId}`] });
  }

  return page;
}

/**
 * Example: Get quiz questions with cache
 */
export async function getQuizQuestionsCached(quizId: string) {
  const cacheKey = cacheKeys.quizQuestions(quizId);

  return cacheGetOrSet(
    cacheKey,
    async () => {
      // Fetch from database
      // Example with Prisma:
      // return await prisma.question.findMany({
      //   where: { quizId },
      // });
      
      // Mock data
      return [
        { id: '1', question: 'What is 2+2?', answer: '4' },
      ];
    },
    { ttl: 600, tags: ['quizzes', `quiz:${quizId}`] }
  );
}

/**
 * Example: Invalidate cache after update
 */
export async function updatePageAndInvalidateCache(pageId: string, data: any) {

  // Update in database
  // Example with Prisma:
  // const updated = await prisma.page.update({
  //   where: { id: pageId },
  //   data,
  // });

  // Mock update
  const updated = { id: pageId, ...data };

  // Invalidate cache - import cacheDel from @/lib/cache
  const { cacheDel } = await import('@/lib/cache');
  const cacheKey = cacheKeys.page(pageId);
  await cacheDel(cacheKey);
  return updated;
}

/**
 * Example Route Handler with Caching
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');

    if (!pageId) {
      return NextResponse.json(
        { error: 'pageId is required' },
        { status: 400 }
      );
    }

    const page = await getPageCached(pageId);

    if (!page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(page, {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('Get page error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
