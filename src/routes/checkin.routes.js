import { Router } from 'express';
import { body } from 'express-validator';
import * as checkinController from '../controllers/checkin.controller.js';
import { authenticate, requireStaff } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { checkinLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(authenticate, requireStaff);

router.post(
  '/verify',
  checkinLimiter,
  [body('qr_token').notEmpty().withMessage('QR token required')],
  validate,
  checkinController.verifyQr
);

router.post(
  '/check-in',
  checkinLimiter,
  [body('qr_token').notEmpty().withMessage('QR token required')],
  validate,
  checkinController.performCheckIn
);

export default router;
