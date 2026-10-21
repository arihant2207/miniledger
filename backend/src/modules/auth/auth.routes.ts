/**
 * Module: Auth Express Routes
 * Responsibility: Mounts authentication endpoints with edge validation middleware.
 */

import { Router } from 'express';
import { authController } from './auth.controller';
import { validateBody } from '../../middleware/validate';
import { requestOtpSchema, verifyOtpSchema } from './auth.validation';

const router = Router();

router.post('/request-otp', validateBody(requestOtpSchema), authController.requestOtp);
router.post('/verify-otp', validateBody(verifyOtpSchema), authController.verifyOtp);

export const authRoutes = router;
