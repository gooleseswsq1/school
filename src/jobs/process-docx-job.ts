import { prisma } from '../lib/prisma';
import { sendJobEmail } from '../lib/email-notifier';
import type { DocxParseJobPayload, DocxParseResult } from './types';

const prismaAny = prisma as any;

function resolveParseEndpoint(payload: DocxParseJobPayload): string {
  if (payload.target === 'exam-banks') {
    return '/api/exam-banks/parse';
  }
  return '/api/exams/parse-docx';
}

function getBaseUrl(): string {
  return (
    process.env.INTERNAL_API_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'http://localhost:3000'
  );
}

export async function processDocxParseJob(payload: DocxParseJobPayload): Promise<DocxParseResult> {
  const endpoint = resolveParseEndpoint(payload);
  const parseUrl = `${getBaseUrl()}${endpoint}`;

  await prismaAny.backgroundJob.update({
    where: { id: payload.backgroundJobId },
    data: {
      status: 'PROCESSING',
      startedAt: new Date(),
    },
  });

  try {
    const fileResponse = await fetch(payload.fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Cannot download file: ${fileResponse.status}`);
    }

    const blob = await fileResponse.blob();
    const file = new File([blob], payload.fileName || 'input.docx', {
      type: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const formData = new FormData();
    formData.append('file', file);
    if (payload.target === 'exam-banks' && payload.authorId) {
      formData.append('authorId', payload.authorId);
    }

    const parseResponse = await fetch(parseUrl, {
      method: 'POST',
      headers: {
        'x-parse-sync': '1',
      },
      body: formData,
    });

    const json = await parseResponse.json().catch(() => ({}));
    const result: DocxParseResult = {
      ok: parseResponse.ok,
      endpoint,
      statusCode: parseResponse.status,
      body: json,
    };

    if (!parseResponse.ok) {
      throw new Error(`Parse failed with ${parseResponse.status}: ${JSON.stringify(json)}`);
    }

    await prismaAny.backgroundJob.update({
      where: { id: payload.backgroundJobId },
      data: {
        status: 'COMPLETED',
        resultJson: JSON.stringify(result),
        finishedAt: new Date(),
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });

    if (payload.notifyEmail) {
      await sendJobEmail({
        email: payload.notifyEmail,
        subject: 'DOCX parse completed',
        message: `Your job ${payload.backgroundJobId} has completed successfully.`,
      });
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    await prismaAny.backgroundJob.update({
      where: { id: payload.backgroundJobId },
      data: {
        status: 'FAILED',
        error: message,
        finishedAt: new Date(),
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });

    if (payload.notifyEmail) {
      await sendJobEmail({
        email: payload.notifyEmail,
        subject: 'DOCX parse failed',
        message: `Your job ${payload.backgroundJobId} failed: ${message}`,
      }).catch(() => undefined);
    }

    throw error;
  }
}
