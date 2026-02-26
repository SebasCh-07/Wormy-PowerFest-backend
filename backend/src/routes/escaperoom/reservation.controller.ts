import { Request, Response } from 'express';
import { ReservationService } from './reservation.service';
import { success } from '../../services/escaperoom/utils/response';
import { asyncHandler } from '../../middleware/escaperoom/asyncHandler';

const reservationService = new ReservationService();

export const createReservation = asyncHandler(async (req: Request, res: Response) => {
  const reservation = await reservationService.createReservation(req.body);
  return success(res, reservation, 201);
});

export const createMultipleReservations = asyncHandler(async (req: Request, res: Response) => {
  const reservations = await reservationService.createMultipleReservations(req.body);
  return success(res, reservations, 201);
});

export const resendQR = asyncHandler(async (req: Request, res: Response) => {
  const result = await reservationService.resendQR(req.body);
  return success(res, result);
});
