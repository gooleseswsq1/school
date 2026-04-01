import { Worker } from 'bullmq';
import { DOCX_PARSE_QUEUE, createWorkerRedisConnection } from '../lib/bullmq';
import type { DocxParseJobPayload } from './types';
import { processDocxParseJob } from './process-docx-job';

const connection = createWorkerRedisConnection();

const worker = new Worker(
  DOCX_PARSE_QUEUE,
  async (job) => {
    const payload = job.data as DocxParseJobPayload;
    return processDocxParseJob(payload);
  },
  {
    connection,
    concurrency: 2,
  }
);

worker.on('ready', () => {
  console.log(`[worker] ready: ${DOCX_PARSE_QUEUE}`);
});

worker.on('completed', (job) => {
  console.log(`[worker] completed job ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] failed job ${job?.id}:`, err.message);
});

async function shutdown() {
  console.log('[worker] shutting down...');
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
