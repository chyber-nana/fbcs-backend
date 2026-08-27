import { Router } from 'express';
import * as attendeeController from '../controllers/attendee.controller.js';
import { authenticate, requireAttendee } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireAttendee);
router.get('/dashboard', attendeeController.getDashboard);

export default router;
