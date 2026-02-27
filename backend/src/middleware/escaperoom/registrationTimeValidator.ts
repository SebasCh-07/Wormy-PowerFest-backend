import { Request, Response, NextFunction } from 'express';
import { prismaEscapeRoom as prisma } from '../../services/escaperoom/prisma';
import { getEcuadorHour, getEcuadorDate, formatDateES } from '../../services/escaperoom/utils/dateHelpers';

/**
 * Middleware para validar si el registro está abierto
 * Verifica:
 * 1. Override manual desde RegistrationControl
 * 2. Fechas válidas del evento (desde TimeslotConfig)
 * 3. Horario válido (desde TimeslotConfig)
 */
export const validateRegistrationTime = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Verificar si hay override manual (para desarrollo)
    const manualOverride = await prisma.registrationControl.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (manualOverride) {
      if (!manualOverride.isOpen) {
        return res.status(403).json({
          success: false,
          error: 'Registro cerrado manualmente',
          reason: manualOverride.reason,
        });
      }
      // Override dice que está abierto, permitir acceso
      return next();
    }

    // 2. Validación automática por fecha/hora
    const { year, month, day } = getEcuadorDate();
    const hour = getEcuadorHour();

    // Obtener fechas válidas de la configuración o usar por defecto
    const config = await prisma.timeslotConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    const validDates =
      config?.eventDates && config.eventDates.length > 0
        ? config.eventDates
        : [
            new Date('2026-02-27T12:00:00.000Z'),
            new Date('2026-02-28T12:00:00.000Z'),
            new Date('2026-03-01T12:00:00.000Z'),
          ];

    const startHour = config?.startHour ?? 8;
    const endHour = config?.endHour ?? 20;

    // Comparar solo año, mes y día
    const isValidDate = validDates.some((date) => {
      const eventDate = new Date(date);
      return (
        eventDate.getUTCFullYear() === year &&
        eventDate.getUTCMonth() === month &&
        eventDate.getUTCDate() === day
      );
    });

    if (!isValidDate) {
      // Buscar la próxima fecha válida que sea mayor o igual a hoy
      const currentDate = new Date(Date.UTC(year, month, day));
      const futureDates = validDates
        .map(d => new Date(d))
        .filter(eventDate => {
          const eventUTC = new Date(Date.UTC(
            eventDate.getUTCFullYear(),
            eventDate.getUTCMonth(),
            eventDate.getUTCDate()
          ));
          return eventUTC >= currentDate;
        })
        .sort((a, b) => a.getTime() - b.getTime());

      const nextDate = futureDates.length > 0 ? futureDates[0] : validDates[0];
      const nextDateFormatted = formatDateES(new Date(nextDate));
      return res.status(403).json({
        success: false,
        error: 'Registro cerrado. Solo disponible en las fechas del evento',
        nextOpening: `${nextDateFormatted} ${startHour}:00`,
      });
    }

    // Verificar horario válido
    if (hour < startHour || hour >= endHour) {
      const nextOpening =
        hour >= endHour
          ? `Mañana ${startHour}:00`
          : `Hoy ${startHour}:00`;

      return res.status(403).json({
        success: false,
        error: `Registro cerrado. Horario: ${startHour}:00 - ${endHour}:00`,
        nextOpening,
      });
    }

    // Todo OK, permitir acceso
    next();
  } catch (error: any) {
    console.error('Error en validación de horario:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error al validar horario de registro',
    });
  }
};
