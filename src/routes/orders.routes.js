import { Router } from 'express';
import { body } from 'express-validator';
import * as ordersController from '../controllers/orders.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  [
    body('event_id').isUUID().withMessage('Valid event ID required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item required'),
    body('items.*.ticket_type_id').isUUID().withMessage('Valid ticket type ID required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validate,
  ordersController.createOrder
);

router.get('/', ordersController.getMyOrders);
router.get('/:id', ordersController.getOrder);

export default router;
