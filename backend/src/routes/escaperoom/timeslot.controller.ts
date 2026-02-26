import { Request, Response } from 'express';
import { TimeslotService } from './timeslot.service';
import { success } from '../../services/escaperoom/utils/response';
import { asyncHandler } from '../../middleware/escaperoom/asyncHandler';
import { BadRequestError } from '../../services/escaperoom/utils/errors';

const timeslotService = new TimeslotService();

export const getAvailableSlots = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;

  if (!date || typeof date !== 'string') {
    throw new BadRequestError('Fecha requerida');
  }

  const slots = await timeslotService.getAvailableSlots(date);
  return success(res, slots);
});
