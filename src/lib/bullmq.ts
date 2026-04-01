import IORedis from 'ioredis';
import { Queue } from 'bullmq';

export const DOCX_PARSE_QUEUE = 'docx-parse-queue';

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL is required for BullMQ');
  }

  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export function createDocxParseQueue() {
  return new Queue(DOCX_PARSE_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      removeOnComplete: {
        age: 24 * 60 * 60,
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 60 * 60,
        count: 1000,
      },
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });
}

export function createWorkerRedisConnection() {
  return getRedisConnection();
}
