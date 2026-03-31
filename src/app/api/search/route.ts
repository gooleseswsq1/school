import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to calculate similarity between two strings (Levenshtein distance)
function calculateSimilarity(str1: string, str2: string): number {
  const lower1 = str1.toLowerCase();
  const lower2 = str2.toLowerCase();
  
  // Exact match gets highest score
  if (lower1 === lower2) return 100;
  
  // Check if one contains the other
  if (lower1.includes(lower2) || lower2.includes(lower1)) return 80;
  
  // Check for word-level matches
  const words1 = lower1.split(/\s+/);
  const words2 = lower2.split(/\s+/);
  
  let matchingWords = 0;
  for (const word of words1) {
    if (words2.some(w => w.includes(word) || word.includes(w))) {
      matchingWords++;
    }
  }
  
  if (matchingWords > 0) {
    return (matchingWords / Math.max(words1.length, words2.length)) * 75;
  }
  
  // Levenshtein distance for similar strings
  const len1 = lower1.length;
  const len2 = lower2.length;
  const maxLen = Math.max(len1, len2);
  
  let distance = 0;
  for (let i = 0; i < Math.min(len1, len2); i++) {
    if (lower1[i] !== lower2[i]) distance++;
  }
  distance += Math.abs(len1 - len2);
  
  const similarity = Math.max(0, 100 - (distance / maxLen) * 100);
  return similarity >= 20 ? similarity : 0;
}

// Helper function to extract keywords for better suggestions
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 5);
}

// Find similar pages/documents using keywords
async function findSimilarResults(
  query: string,
  type: string[],
  limit: number = 10
) {
  const queryKeywords = extractKeywords(query);
  const queryLower = query.toLowerCase();
  
  let results: any[] = [];

  if (type.includes('page')) {
    const pages = await prisma.page.findMany({
where: {
        isPublished: true,
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
        ],
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
      take: limit * 2,
    });

    results = results.concat(
      pages.map(page => ({
        id: page.id,
        title: page.title,
        description: page.description,
        type: 'page',
        relevance: calculateSimilarity(queryLower, page.title.toLowerCase()),
      }))
    );
  }

  if (type.includes('document')) {
    const documents = await prisma.document.findMany({
where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
        ],
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
      take: limit * 2,
    });

    results = results.concat(
      documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        type: 'document',
        relevance: calculateSimilarity(queryLower, doc.title.toLowerCase()),
      }))
    );
  }

  // Sort by relevance and remove duplicates
  const sorted = results
    .sort((a, b) => b.relevance - a.relevance)
    .filter((item, index, arr) => 
      index === arr.findIndex(other => 
        other.id === item.id && other.type === item.type
      )
    )
    .slice(0, limit);

  return sorted;
}

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q');
    const typeParam = request.nextUrl.searchParams.get('type') || 'page,document';
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');

    if (!q || q.length < 1) {
      return NextResponse.json([]);
    }

    const types = typeParam.split(',').map(t => t.trim());

    const results = await findSimilarResults(q, types as any, limit);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    );
  }
}
