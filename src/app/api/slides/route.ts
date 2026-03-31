import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/slides/save
 * Saves canvas slides to database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, slides, title } = body;

    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json(
        { error: 'Invalid slides data' },
        { status: 400 }
      );
    }

    // Save or update project
    // Note: Adjust according to your Prisma schema
    // This is a template implementation

    return NextResponse.json({
      success: true,
      message: 'Slides saved successfully',
      projectId,
    });
  } catch (error) {
    console.error('Error saving slides:', error);
    return NextResponse.json(
      { error: 'Failed to save slides' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/slides/:projectId
 * Retrieves slides from database
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Retrieve project and slides
    // Note: Adjust according to your Prisma schema

    return NextResponse.json({
      success: true,
      slides: [],
    });
  } catch (error) {
    console.error('Error loading slides:', error);
    return NextResponse.json(
      { error: 'Failed to load slides' },
      { status: 500 }
    );
  }
}
