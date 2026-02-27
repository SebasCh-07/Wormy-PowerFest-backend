import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../services/escaperoom/utils/errors';
import { error } from '../../services/escaperoom/utils/response';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return error(res, err.message, err.statusCode);
  }

  // Manejar errores de Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    // Violación de constraint único (email duplicado, etc.)
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'campo';
      const fieldNames: Record<string, string> = {
        email: 'correo electrónico',
        whatsapp: 'número de WhatsApp',
        qrCode: 'código QR',
      };
      const friendlyField = fieldNames[field] || field;
      return error(res, `No se puede completar la operación. El ${friendlyField} ya está registrado en el sistema. Por favor, verifica los datos ingresados.`, 409);
    }
    
    // Registro no encontrado
    if (err.code === 'P2025') {
      return error(res, 'No se encontró el registro solicitado. Es posible que haya sido eliminado o no exista. Por favor, actualiza la página e intenta nuevamente.', 404);
    }
    
    // Violación de foreign key
    if (err.code === 'P2003') {
      const field = err.meta?.field_name || 'referencia';
      return error(res, `Error de integridad de datos. La ${field} proporcionada no es válida o no existe en el sistema.`, 400);
    }

    // Timeout de conexión
    if (err.code === 'P1008') {
      return error(res, 'La operación tardó demasiado tiempo. Por favor, verifica tu conexión a internet e intenta nuevamente.', 408);
    }

    // Error de conexión a la base de datos
    if (err.code === 'P1001' || err.code === 'P1002') {
      return error(res, 'No se pudo conectar con la base de datos. Por favor, intenta nuevamente en unos momentos.', 503);
    }
  }

  // Manejar errores de validación de Prisma
  if (err.name === 'PrismaClientValidationError') {
    return error(res, 'Los datos proporcionados no son válidos. Por favor, verifica que todos los campos requeridos estén completos y tengan el formato correcto.', 400);
  }

  console.error('Error no manejado:', err);
  return error(res, 'Ocurrió un error inesperado en el servidor. Por favor, intenta nuevamente. Si el problema persiste, contacta al personal del evento.', 500);
};
