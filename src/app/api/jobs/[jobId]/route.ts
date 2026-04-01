import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createDocxParseQueue } from '@/lib/bullmq';

export async function GET(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;

    const job = await prisma.backgroundJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        type: true,
        status: true,
        queueJobId: true,
        inputJson: true,
        resultJson: true,
        error: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        expiresAt: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: job.id,
      type: job.type,
      status: job.status,
      queueJobId: job.queueJobId,
      input: job.inputJson ? JSON.parse(job.inputJson) : null,
      result: job.resultJson ? JSON.parse(job.resultJson) : null,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      expiresAt: job.expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;

    const job = await prisma.backgroundJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        queueJobId: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELED') {
      return NextResponse.json(
        { error: `Cannot cancel job in status ${job.status}` },
        { status: 409 }
      );
    }

    if (job.status === 'PROCESSING') {
      return NextResponse.json(
        { error: 'Job is already processing and cannot be canceled' },
        { status: 409 }
      );
    }

    if (job.queueJobId) {
      const queue = createDocxParseQueue();
      try {
        const queuedJob = await queue.getJob(job.queueJobId);
        if (queuedJob) {
          await queuedJob.remove();
        }
      } finally {
        await queue.close();
      }
    }

    const canceled = await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: 'CANCELED',
        error: 'Canceled by user',
        finishedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        finishedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      id: canceled.id,
      status: canceled.status,
      finishedAt: canceled.finishedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
