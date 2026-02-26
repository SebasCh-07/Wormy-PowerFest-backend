import { Router } from 'express';
import { getAvailableSlots } from './timeslot.controller';

const router = Router();

router.get('/', getAvailableSlots);

export default router;
