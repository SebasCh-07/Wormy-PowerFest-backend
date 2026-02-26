import { Router } from 'express';
import {
  getRegistrationStatus,
  setRegistrationControl,
  resetToAutomatic,
  getTimeslotConfig,
  setTimeslotConfig,
  generateTimeslots,
  clearTimeslots,
  getUsersData,
} from './admin.controller';

const router = Router();

// Control de registro
router.get('/registration-status', getRegistrationStatus);
router.post('/registration-control', setRegistrationControl);
router.delete('/registration-control', resetToAutomatic);

// Configuración de turnos
router.get('/timeslot-config', getTimeslotConfig);
router.post('/timeslot-config', setTimeslotConfig);

// Gestión de turnos
router.post('/generate-timeslots', generateTimeslots);
router.delete('/timeslots', clearTimeslots);

// Exportación de datos
router.get('/users-data', getUsersData);

export default router;
