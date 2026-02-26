import { prismaEscapeRoom as prisma } from '../../services/escaperoom/prisma';
import { isSameDay, parseDate } from '../../services/escaperoom/utils/dateHelpers';

export class TimeslotService {
  async getAvailableSlots(date: string) {
    // Parsear la fecha correctamente (mediodía UTC)
    const targetDate = parseDate(date);
    
    // Obtener todos los turnos y filtrar por fecha
    const allSlots = await prisma.timeSlot.findMany({
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        _count: {
          select: { reservations: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Filtrar turnos que coincidan con la fecha objetivo
    const slots = allSlots.filter((slot) => isSameDay(new Date(slot.date), targetDate));
    
    return slots;
  }
}
