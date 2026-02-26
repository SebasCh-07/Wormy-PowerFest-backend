import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { error } from '../../services/escaperoom/utils/response';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = err.issues.map((e: any) => e.message).join(', ') || 'Error de validación';
        return error(res, messages, 400);
      }
      console.error('Error en validación:', err);
      return error(res, 'Error de validación', 400);
    }
  };
};
