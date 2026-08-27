import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/stats', adminController.getStats);
router.get('/charts/revenue', adminController.getRevenueChart);
router.get('/charts/sales', adminController.getSalesChart);
router.get('/charts/ticket-types', adminController.getTicketTypeDistribution);
router.get('/activity', adminController.getRecentActivity);
router.get('/orders', adminController.getAllOrders);
router.get('/tickets', adminController.getAllTickets);
router.post('/tickets/:id/cancel', adminController.cancelTicket);
router.post('/tickets/:id/refund', adminController.refundTicket);
router.get('/export/attendees', adminController.exportAttendees);

export default router;
