import { Router } from 'express';
import { body } from 'express-validator';
import * as paymentsController from '../controllers/payments.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { paymentLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.get('/public-key', paymentsController.getPublicKey);
router.post('/webhook', paymentsController.handleWebhook);

router.post(
  '/initialize',
  authenticate,
  paymentLimiter,
  [body('order_id').isUUID().withMessage('Valid order ID required')],
  validate,
  paymentsController.initializePayment
);

router.get('/verify', authenticate, paymentsController.verifyPayment);

export default router;
