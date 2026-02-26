import { Router } from 'express';
import { createReservation, createMultipleReservations, resendQR } from './reservation.controller';

const router = Router();

router.post('/', createReservation);
router.post('/multiple', createMultipleReservations);
router.post('/resend', resendQR);

export default router;
