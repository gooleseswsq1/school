import { prisma } from '../lib/prisma';

async function run() {
  const now = new Date();

  const result = await prisma.backgroundJob.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });

  console.log(`[cleanup] deleted ${result.count} expired background jobs`);
}

run()
  .catch((error) => {
    console.error('[cleanup] error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
