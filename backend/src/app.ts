/**
 * Module: Express Application Bootstrap
 * Responsibility: Assembles core middleware pipeline (CORS, body parsing, request logging),
 * registers health and domain routes, and installs 404 and centralized error handlers.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './utils/logger';
import { db } from './db';
import { authRoutes } from './modules/auth/auth.routes';
import { errorHandler } from './middleware/errorHandler';
import { NotFoundError } from './utils/errors';

export function createApp(): Express {
  const app = express();

  // Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Parse incoming JSON payloads
  app.use(express.json({ limit: '100kb' }));

  // Request logger for observable HTTP telemetry
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.path !== '/health') {
      logger.info(`HTTP ${req.method} ${req.path}`);
    }
    next();
  });

  // Health check endpoint verifying database connectivity
  app.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await db.testConnection();
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        database: 'connected',
      });
    } catch (error) {
      next(error);
    }
  });

  // Register domain module routes
  app.use('/auth', authRoutes);

  // Catch unmatched routes and convert to 404 domain error
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Endpoint not found: ${req.method} ${req.path}`));
  });

  // Centralized error handler MUST be the last middleware in the chain
  app.use(errorHandler);

  return app;
}
