/**
 * Module: Summary Express Routes
 * Responsibility: Mounts summary endpoints, protected by authentication middleware.
 */

import { Router } from 'express';
import { summaryController } from './summary.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  summaryController.getSummary as unknown as (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void
);

export const summaryRoutes = router;
