/**
 * Module: Server Entrypoint
 * Responsibility: Initializes database connectivity, binds Express app to network port,
 * and handles process lifecycle signals (SIGTERM, SIGINT) for graceful shutdown.
 */

import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { db } from './db';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 MiniLedger backend listening on port ${env.PORT} (${env.NODE_ENV})`);
});

// Graceful shutdown handling
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed. Draining database connections...');
    try {
      await db.closePool();
      logger.info('Graceful shutdown completed successfully.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database pool shutdown', { error: (err as Error).message });
      process.exit(1);
    }
  });

  // Force shutdown after timeout if pending requests stall
  setTimeout(() => {
    logger.error('Shutdown timed out. Forcing process termination.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason: String(reason) });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { message: error.message, stack: error.stack });
  process.exit(1);
});
