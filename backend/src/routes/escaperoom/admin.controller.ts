import { Request, Response } from 'express';
import { success, error } from '../../services/escaperoom/utils/response';
import { asyncHandler } from '../../middleware/escaperoom/asyncHandler';
import { AdminService } from './admin.service';

const adminService = new AdminService();

// ==================== CONTROL DE REGISTRO ====================

/**
 * GET /api/admin/registration-status
 * Obtiene el estado actual del registro (manual override + configuración de turnos)
 */
export const getRegistrationStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = await adminService.getRegistrationStatus();
  return success(res, status);
});

/**
 * POST /api/admin/registration-control
 * Controla manualmente la apertura/cierre del registro
 */
export const setRegistrationControl = asyncHandler(async (req: Request, res: Response) => {
  const { isOpen, reason, adminEmail } = req.body;
  
  const control = await adminService.setRegistrationControl(isOpen, reason, adminEmail);
  return success(res, control);
});

/**
 * DELETE /api/admin/registration-control
 * Elimina el control manual y vuelve al modo automático
 */
export const resetToAutomatic = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.resetToAutomatic();
  return success(res, result);
});

// ==================== CONFIGURACIÓN DE TURNOS ====================

/**
 * GET /api/admin/timeslot-config
 * Obtiene la configuración actual de turnos
 */
export const getTimeslotConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await adminService.getTimeslotConfig();
  return success(res, config);
});

/**
 * POST /api/admin/timeslot-config
 * Guarda la configuración de turnos
 */
export const setTimeslotConfig = asyncHandler(async (req: Request, res: Response) => {
  const { eventDates, durationMinutes, startHour, endHour, adminEmail } = req.body;
  
  // Validaciones
  if (!eventDates || eventDates.length !== 3) {
    return error(res, 'Debe seleccionar exactamente 3 fechas', 400);
  }
  
  if (durationMinutes < 1) {
    return error(res, 'Duración debe ser mayor a 0', 400);
  }
  
  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
    return error(res, 'Horas deben estar entre 0 y 23', 400);
  }
  
  if (startHour >= endHour) {
    return error(res, 'Hora de inicio debe ser menor a hora de fin', 400);
  }
  
  // Convertir strings de fechas a objetos Date (mediodía UTC para evitar cambios de día)
  const parsedDates = eventDates.map((dateStr: string) => new Date(dateStr + 'T12:00:00.000Z'));
  
  const config = await adminService.setTimeslotConfig({
    eventDates: parsedDates,
    durationMinutes,
    startHour,
    endHour,
    adminEmail,
  });
  
  return success(res, config);
});

// ==================== GESTIÓN DE TURNOS ====================

/**
 * POST /api/admin/generate-timeslots
 * Genera turnos según la configuración guardada
 */
export const generateTimeslots = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.generateTimeslots();
  return success(res, result);
});

/**
 * DELETE /api/admin/timeslots
 * Elimina todos los turnos (valida que no haya reservas)
 */
export const clearTimeslots = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.clearTimeslots();
  return success(res, result);
});

// ==================== EXPORTACIÓN DE DATOS ====================

/**
 * GET /api/admin/users-data
 * Obtiene datos de usuarios para exportación
 */
export const getUsersData = asyncHandler(async (req: Request, res: Response) => {
  const data = await adminService.getUsersData();
  return success(res, data);
});
