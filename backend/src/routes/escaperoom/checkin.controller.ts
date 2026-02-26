import { Request, Response } from 'express';
import { CheckinService } from './checkin.service';
import { success } from '../../services/escaperoom/utils/response';
import { asyncHandler } from '../../middleware/escaperoom/asyncHandler';

const checkinService = new CheckinService();

// Obtener datos de reserva por QR (sin hacer check-in)
export const getReservationByQR = asyncHandler(async (req: Request, res: Response) => {
  const { qrCode } = req.body;
  const reservation = await checkinService.getReservationByQR(qrCode);
  return success(res, reservation);
});

// Hacer check-in (marcar como USED)
export const checkin = asyncHandler(async (req: Request, res: Response) => {
  const { qrCode } = req.body;
  const reservation = await checkinService.checkin(qrCode);
  return success(res, reservation);
});

// Reasignar turno
export const reassignTimeslot = asyncHandler(async (req: Request, res: Response) => {
  const { qrCode, newTimeslotId } = req.body;
  const reservation = await checkinService.reassignTimeslot(qrCode, newTimeslotId);
  return success(res, reservation);
});

// Obtener turnos disponibles del día
export const getAvailableTimeslots = asyncHandler(async (req: Request, res: Response) => {
  const timeslots = await checkinService.getAvailableTimeslots();
  return success(res, timeslots);
});

// Legacy endpoint (compatibilidad)
export const validateQR = asyncHandler(async (req: Request, res: Response) => {
  const { qrCode } = req.body;
  const reservation = await checkinService.validateQR(qrCode);
  return success(res, reservation);
});

// Check-in grupal (ambas personas)
export const checkinGroup = asyncHandler(async (req: Request, res: Response) => {
  const { qrCode1, qrCode2 } = req.body;
  const result = await checkinService.checkinGroup(qrCode1, qrCode2);
  return success(res, result);
});

// Reasignar turno grupal (ambas personas)
export const reassignGroupTimeslot = asyncHandler(async (req: Request, res: Response) => {
  const { qrCode1, qrCode2, newTimeslotId } = req.body;
  const result = await checkinService.reassignGroupTimeslot(qrCode1, qrCode2, newTimeslotId);
  return success(res, result);
});

// Obtener grupos con check-in (para calificar)
export const getCheckedInGroups = asyncHandler(async (req: Request, res: Response) => {
  const groups = await checkinService.getCheckedInGroups();
  return success(res, groups);
});

// Calificar grupo
export const rateGroup = asyncHandler(async (req: Request, res: Response) => {
  const { reservationId1, reservationId2, rating } = req.body;
  const result = await checkinService.rateGroup(reservationId1, reservationId2, rating);
  return success(res, result);
});
