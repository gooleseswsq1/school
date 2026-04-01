import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createDocxParseQueue } from '@/lib/bullmq';
import type { DocxParseJobPayload, DocxParseTarget } from '@/jobs/types';

function getUserId(request: NextRequest): string | undefined {
  const id = request.headers.get('x-user-id');
  return id || undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fileUrl = typeof body?.fileUrl === 'string' ? body.fileUrl.trim() : '';
    const fileName = typeof body?.fileName === 'string' ? body.fileName.trim() : 'input.docx';
    const target = (body?.target === 'exam-banks' ? 'exam-banks' : 'exams') as DocxParseTarget;
    const authorId = typeof body?.authorId === 'string' ? body.authorId : undefined;
    const notifyEmail = typeof body?.notifyEmail === 'string' ? body.notifyEmail : undefined;

    if (!fileUrl) {
      return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 });
    }

    const userId = getUserId(request);

    const backgroundJob = await prisma.backgroundJob.create({
      data: {
        type: 'DOCX_PARSE',
        status: 'QUEUED',
        userId,
        inputJson: JSON.stringify({ fileUrl, fileName, target, authorId }),
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });

    const payload: DocxParseJobPayload = {
      backgroundJobId: backgroundJob.id,
      fileUrl,
      fileName,
      target,
      authorId,
      notifyEmail,
    };

    const queue = createDocxParseQueue();
    const enqueued = await queue.add('docx-parse', payload);

    await prisma.backgroundJob.update({
      where: { id: backgroundJob.id },
      data: { queueJobId: String(enqueued.id) },
    });

    await queue.close();

    return NextResponse.json({
      success: true,
      jobId: backgroundJob.id,
      queueJobId: String(enqueued.id),
      status: 'QUEUED',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to enqueue job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
