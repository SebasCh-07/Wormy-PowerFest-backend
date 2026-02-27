import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Manejar errores de Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    // Violación de constraint único
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'campo';
      const fieldNames: Record<string, string> = {
        email: 'correo electrónico',
        whatsapp: 'número de WhatsApp',
        qrCode: 'código QR',
      };
      const friendlyField = fieldNames[field] || field;
      return res.status(409).json({
        error: `No se puede completar la operación. El ${friendlyField} ya está registrado en el sistema. Por favor, verifica los datos ingresados.`
      });
    }
    
    // Registro no encontrado
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'No se encontró el registro solicitado. Es posible que haya sido eliminado o no exista. Por favor, actualiza la página e intenta nuevamente.'
      });
    }
    
    // Violación de foreign key
    if (err.code === 'P2003') {
      const field = err.meta?.field_name || 'referencia';
      return res.status(400).json({
        error: `Error de integridad de datos. La ${field} proporcionada no es válida o no existe en el sistema.`
      });
    }

    // Timeout de conexión
    if (err.code === 'P1008') {
      return res.status(408).json({
        error: 'La operación tardó demasiado tiempo. Por favor, verifica tu conexión a internet e intenta nuevamente.'
      });
    }

    // Error de conexión a la base de datos
    if (err.code === 'P1001' || err.code === 'P1002') {
      return res.status(503).json({
        error: 'No se pudo conectar con la base de datos. Por favor, intenta nuevamente en unos momentos.'
      });
    }
  }

  // Manejar errores de validación de Prisma
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      error: 'Los datos proporcionados no son válidos. Por favor, verifica que todos los campos requeridos estén completos y tengan el formato correcto.'
    });
  }

  res.status(500).json({
    error: 'Ocurrió un error inesperado en el servidor. Por favor, intenta nuevamente. Si el problema persiste, contacta al soporte técnico.',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};
