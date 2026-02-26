import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../services/escaperoom/utils/errors';
import { error } from '../../services/escaperoom/utils/response';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return error(res, err.message, err.statusCode);
  }

  console.error('Error no manejado:', err);
  return error(res, 'Error interno del servidor', 500);
};
