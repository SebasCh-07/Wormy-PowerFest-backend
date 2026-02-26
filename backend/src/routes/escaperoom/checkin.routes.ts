import { Router } from 'express';
import { 
  validateQR, 
  getReservationByQR, 
  checkin, 
  reassignTimeslot, 
  getAvailableTimeslots,
  checkinGroup,
  reassignGroupTimeslot,
  getCheckedInGroups,
  rateGroup
} from './checkin.controller';

const router = Router();

// Legacy endpoint (compatibilidad - hace check-in automático)
router.post('/', validateQR);

// Endpoints individuales
router.post('/validate', getReservationByQR);  // Solo obtener datos sin check-in
router.post('/confirm', checkin);              // Hacer check-in
router.post('/reassign', reassignTimeslot);    // Reasignar turno
router.get('/timeslots', getAvailableTimeslots); // Obtener turnos disponibles

// Endpoints grupales (NUEVOS)
router.post('/group/checkin', checkinGroup);           // Check-in de ambos usuarios
router.post('/group/reassign', reassignGroupTimeslot); // Reasignar turno de ambos
router.get('/groups/checked-in', getCheckedInGroups);  // Obtener grupos para calificar
router.post('/groups/rate', rateGroup);                // Calificar grupo

export default router;
