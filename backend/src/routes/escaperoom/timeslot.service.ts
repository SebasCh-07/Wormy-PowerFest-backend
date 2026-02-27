import { prismaEscapeRoom as prisma } from '../../services/escaperoom/prisma';
import { isSameDay, parseDate } from '../../services/escaperoom/utils/dateHelpers';

export class TimeslotService {
  async getAvailableSlots(date: string) {
    // Parsear la fecha correctamente (mediodía UTC)
    const targetDate = parseDate(date);
    
    // Obtener todos los turnos con sus reservas activas
    const allSlots = await prisma.timeSlot.findMany({
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        capacity: true,
        reservations: {
          where: {
            status: {
              not: 'CANCELLED'
            }
          },
          select: {
            id: true
          }
        }
      },
      orderBy: { startTime: 'asc' },
    });

    // Filtrar turnos que coincidan con la fecha objetivo y calcular disponibilidad
    const slots = allSlots
      .filter((slot) => isSameDay(new Date(slot.date), targetDate))
      .map((slot) => ({
        id: slot.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        capacity: slot.capacity,
        reservedCount: slot.reservations.length,
        availableSpots: slot.capacity - slot.reservations.length,
        isAvailable: slot.reservations.length < slot.capacity
      }));
    
    return slots;
  }
}
