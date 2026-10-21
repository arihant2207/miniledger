/**
 * Module: Summary Express Routes
 * Responsibility: Mounts summary endpoints, protected by authentication middleware.
 */

import { Router } from 'express';
import { summaryController } from './summary.controller';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  asyncHandler(summaryController.getSummary)
);

export const summaryRoutes = router;
