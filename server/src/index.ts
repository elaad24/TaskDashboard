import { buildApp } from './app.js';
import { verifyAiOnStartup } from './ai/startupCheck.js';
import { prisma } from './db.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { setupFts } from './search/fts.js';
import { startScheduler, stopScheduler } from './scheduler.js';
import { startTelegramWorker, stopTelegramWorker } from './integrations/telegram/worker.js';

const main = async () => {
  await setupFts(prisma);
  await verifyAiOnStartup();
  await startTelegramWorker();
  startScheduler();

  const app = buildApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Command Center API ready -> http://localhost:${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close();
    stopScheduler();
    await stopTelegramWorker();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

main().catch((err) => {
  logger.fatal({ err }, 'fatal startup error');
  process.exit(1);
});
