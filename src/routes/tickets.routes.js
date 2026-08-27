import { Router } from 'express';
import * as ticketsController from '../controllers/tickets.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/event', ticketsController.getEvent);
router.get('/my', authenticate, ticketsController.getMyTickets);
router.get('/:id', authenticate, ticketsController.getTicket);
router.get('/:id/qr', authenticate, ticketsController.getTicketQr);

export default router;
