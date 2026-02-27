import { prismaEscapeRoom as prisma } from '../../services/escaperoom/prisma';
import { NotFoundError, BadRequestError } from '../../services/escaperoom/utils/errors';
import { getEcuadorTime, getEcuadorDate, getEcuadorTimeComponents, isSameDay } from '../../services/escaperoom/utils/dateHelpers';
import { generateQR } from '../../services/escaperoom/services/qr.service';
import { sendReservationEmail } from '../../services/escaperoom/services/email.service';
import { sendReservationWhatsApp } from '../../services/escaperoom/services/whatsapp.service';

export class CheckinService {
  // Validar QR sin hacer check-in (solo obtener datos)
  async getReservationByQR(qrCode: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { qrCode },
      include: {
        user: true,
        timeslot: true,
      },
    });

    if (!reservation) {
      throw new NotFoundError('Código QR no válido. No se encontró ninguna reserva asociada a este código. Verifica que el QR sea correcto o contacta al personal del evento.');
    }

    if (reservation.status === 'USED') {
      const usedDate = reservation.checkedInAt 
        ? new Date(reservation.checkedInAt).toLocaleString('es-ES', { 
            dateStyle: 'short', 
            timeStyle: 'short',
            timeZone: 'America/Guayaquil'
          })
        : 'fecha desconocida';
      throw new BadRequestError(`Este código QR ya fue utilizado el ${usedDate}. Cada QR solo puede usarse una vez. Si necesitas ayuda, contacta al personal del evento.`);
    }

    if (reservation.status === 'CANCELLED') {
      throw new BadRequestError('Esta reserva fue cancelada previamente y no puede ser utilizada. Por favor, crea una nueva reserva o contacta al personal del evento.');
    }

    return reservation;
  }

  // Hacer check-in (marcar como USED)
  async checkin(qrCode: string) {
    const reservation = await this.getReservationByQR(qrCode);

    // Marcar como usado
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: 'USED',
        checkedInAt: getEcuadorTime(),
      },
      include: {
        user: true,
        timeslot: true,
      },
    });

    return updated;
  }

  // Reasignar turno y reenviar notificaciones
  async reassignTimeslot(qrCode: string, newTimeslotId: string) {
    const reservation = await this.getReservationByQR(qrCode);

    // Verificar que el nuevo turno existe
    const newTimeslot = await prisma.timeSlot.findUnique({
      where: { id: newTimeslotId },
    });

    if (!newTimeslot) {
      throw new NotFoundError('El turno seleccionado no existe o ya no está disponible. Por favor, actualiza la lista de turnos y selecciona otro horario.');
    }

    // Actualizar reserva con nuevo turno
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: { timeslotId: newTimeslotId },
      include: {
        user: true,
        timeslot: true,
      },
    });

    // Regenerar imagen QR (mismo código)
    const qrImage = await generateQR(reservation.qrCode);

    // Reenviar notificaciones
    console.log('📨 Reenviando notificaciones por reasignación de turno...');
    const notificationPromises = [];
    const whatsappEnabled = process.env.WHATSAPP_ENABLED === 'true';
    
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_xxxxxxxxxxxxxxxxxxxxxxxxxx') {
      notificationPromises.push(
        sendReservationEmail(updated.user.email, updated, reservation.qrCode)
      );
    }
    
    if (
      whatsappEnabled &&
      process.env.TWILIO_ACCOUNT_SID && 
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    ) {
      notificationPromises.push(
        sendReservationWhatsApp(updated.user.whatsapp, updated, qrImage)
      );
    } else {
      if (!whatsappEnabled) {
        console.log('⚠️  WhatsApp desactivado por configuración - Saltando envío');
      }
    }
    
    if (notificationPromises.length > 0) {
      await Promise.all(notificationPromises)
        .then(() => console.log('✅ Notificaciones enviadas'))
        .catch((err) => console.error('❌ Error enviando notificaciones:', err));
    }

    return updated;
  }

  // Obtener turnos disponibles del día actual
  async getAvailableTimeslots() {
    const { year, month, day } = getEcuadorDate();
    
    // Obtener todos los turnos
    const allTimeslots = await prisma.timeSlot.findMany({
      orderBy: { startTime: 'asc' },
    });

    // Filtrar turnos del día actual
    const todayTimeslots = allTimeslots.filter((slot) => {
      const slotDate = new Date(slot.date);
      return (
        slotDate.getUTCFullYear() === year &&
        slotDate.getUTCMonth() === month &&
        slotDate.getUTCDate() === day
      );
    });

    // Filtrar turnos futuros (desde hora actual en adelante)
    const { hour: currentHour, minute: currentMinute } = getEcuadorTimeComponents();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    const futureSlots = todayTimeslots.filter((slot) => {
      const [startHour, startMinute] = slot.startTime.split(':').map(Number);
      const slotTimeInMinutes = startHour * 60 + startMinute;
      return slotTimeInMinutes >= currentTimeInMinutes;
    });

    return futureSlots;
  }

  // Validar QR (método legacy para compatibilidad)
  async validateQR(qrCode: string) {
    return this.checkin(qrCode);
  }

  // Hacer check-in de AMBAS personas del grupo
  async checkinGroup(qrCode1: string, qrCode2: string) {
    // Obtener ambas reservas
    const reservation1 = await this.getReservationByQR(qrCode1);
    const reservation2 = await this.getReservationByQR(qrCode2);

    // Verificar que ambos usuarios sean partners
    if (reservation1.user.partnerId !== reservation2.user.id || 
        reservation2.user.partnerId !== reservation1.user.id) {
      throw new BadRequestError(`Los códigos QR escaneados no pertenecen al mismo grupo. ${reservation1.user.firstName} y ${reservation2.user.firstName} no están registrados como compañeros. Verifica que ambos QR sean del mismo grupo.`);
    }

    // Hacer check-in de ambos en una transacción
    const checkinTime = getEcuadorTime();
    const [updated1, updated2] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id: reservation1.id },
        data: {
          status: 'USED',
          checkedInAt: checkinTime,
        },
        include: {
          user: true,
          timeslot: true,
        },
      }),
      prisma.reservation.update({
        where: { id: reservation2.id },
        data: {
          status: 'USED',
          checkedInAt: checkinTime,
        },
        include: {
          user: true,
          timeslot: true,
        },
      }),
    ]);

    console.log(`✅ Check-in grupal completado para ${updated1.user.firstName} y ${updated2.user.firstName}`);

    return {
      reservation1: updated1,
      reservation2: updated2,
    };
  }

  // Reasignar turno de AMBAS personas del grupo
  async reassignGroupTimeslot(qrCode1: string, qrCode2: string, newTimeslotId: string) {
    // Obtener ambas reservas
    const reservation1 = await this.getReservationByQR(qrCode1);
    const reservation2 = await this.getReservationByQR(qrCode2);

    // Verificar que ambos usuarios sean partners
    if (reservation1.user.partnerId !== reservation2.user.id || 
        reservation2.user.partnerId !== reservation1.user.id) {
      throw new BadRequestError(`Los códigos QR escaneados no pertenecen al mismo grupo. ${reservation1.user.firstName} y ${reservation2.user.firstName} no están registrados como compañeros. Verifica que ambos QR sean del mismo grupo.`);
    }

    // Verificar que el nuevo turno existe
    const newTimeslot = await prisma.timeSlot.findUnique({
      where: { id: newTimeslotId },
    });

    if (!newTimeslot) {
      throw new NotFoundError('El turno seleccionado no existe o ya no está disponible. Por favor, actualiza la lista de turnos y selecciona otro horario.');
    }

    // Actualizar ambas reservas con nuevo turno
    const [updated1, updated2] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id: reservation1.id },
        data: { timeslotId: newTimeslotId },
        include: {
          user: true,
          timeslot: true,
        },
      }),
      prisma.reservation.update({
        where: { id: reservation2.id },
        data: { timeslotId: newTimeslotId },
        include: {
          user: true,
          timeslot: true,
        },
      }),
    ]);

    // Regenerar imágenes QR
    const qrImage1 = await generateQR(reservation1.qrCode);
    const qrImage2 = await generateQR(reservation2.qrCode);

    // Reenviar notificaciones a ambos usuarios
    console.log('📨 Reenviando notificaciones a ambos usuarios...');
    const notificationPromises = [];
    const whatsappEnabled = process.env.WHATSAPP_ENABLED === 'true';
    
    // Usuario 1
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_xxxxxxxxxxxxxxxxxxxxxxxxxx') {
      notificationPromises.push(
        sendReservationEmail(updated1.user.email, updated1, reservation1.qrCode)
      );
    }
    
    if (
      whatsappEnabled &&
      process.env.TWILIO_ACCOUNT_SID && 
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    ) {
      notificationPromises.push(
        sendReservationWhatsApp(updated1.user.whatsapp, updated1, qrImage1)
      );
    }

    // Usuario 2
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_xxxxxxxxxxxxxxxxxxxxxxxxxx') {
      notificationPromises.push(
        sendReservationEmail(updated2.user.email, updated2, reservation2.qrCode)
      );
    }
    
    if (
      whatsappEnabled &&
      process.env.TWILIO_ACCOUNT_SID && 
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    ) {
      notificationPromises.push(
        sendReservationWhatsApp(updated2.user.whatsapp, updated2, qrImage2)
      );
    }
    
    if (notificationPromises.length > 0) {
      await Promise.all(notificationPromises)
        .then(() => console.log('✅ Notificaciones enviadas a ambos usuarios'))
        .catch((err) => console.error('❌ Error enviando notificaciones:', err));
    }

    return {
      reservation1: updated1,
      reservation2: updated2,
    };
  }

  // Obtener grupos que ya hicieron check-in (para calificar)
  async getCheckedInGroups() {
    // Obtener todas las reservas con check-in que NO han sido calificadas
    const reservations = await prisma.reservation.findMany({
      where: {
        status: 'USED',
        checkedInAt: { not: null },
        interestRating: null, // Solo grupos sin calificar
      },
      include: {
        user: {
          include: {
            partner: true,
          },
        },
        timeslot: true,
      },
      orderBy: {
        checkedInAt: 'desc',
      },
    });

    // Agrupar por partnerId para evitar duplicados
    const groups = new Map();
    
    for (const reservation of reservations) {
      const user = reservation.user;
      
      // Si el usuario tiene partner, usar el ID menor como clave del grupo
      if (user.partnerId) {
        const groupKey = user.id < user.partnerId ? user.id : user.partnerId;
        
        if (!groups.has(groupKey)) {
          // Buscar la reserva del partner
          const partnerReservation = reservations.find(
            r => r.userId === user.partnerId
          );

          if (partnerReservation) {
            groups.set(groupKey, {
              user1: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                reservationId: reservation.id,
              },
              user2: {
                id: user.partner!.id,
                firstName: user.partner!.firstName,
                lastName: user.partner!.lastName,
                email: user.partner!.email,
                reservationId: partnerReservation.id,
              },
              timeslot: {
                date: reservation.timeslot.date,
                startTime: reservation.timeslot.startTime,
                endTime: reservation.timeslot.endTime,
              },
              checkedInAt: reservation.checkedInAt,
            });
          }
        }
      }
    }

    return Array.from(groups.values());
  }

  // Calificar grupo (asignar rating a ambas reservas)
  async rateGroup(reservationId1: string, reservationId2: string, rating: number) {
    // Validar rating (1 = No interesado, 2 = Poco, 3 = Bastante)
    if (![1, 2, 3].includes(rating)) {
      throw new BadRequestError(`Calificación inválida. El valor debe ser 1 (No interesado), 2 (Poco interesado) o 3 (Bastante interesado). Valor recibido: ${rating}`);
    }

    const ratedTime = getEcuadorTime();

    // Actualizar ambas reservas con el rating
    const [updated1, updated2] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id: reservationId1 },
        data: {
          interestRating: rating,
          ratedAt: ratedTime,
        },
        include: {
          user: true,
        },
      }),
      prisma.reservation.update({
        where: { id: reservationId2 },
        data: {
          interestRating: rating,
          ratedAt: ratedTime,
        },
        include: {
          user: true,
        },
      }),
    ]);

    console.log(`✅ Grupo calificado: ${updated1.user.firstName} y ${updated2.user.firstName} - Rating: ${rating}`);

    return {
      reservation1: updated1,
      reservation2: updated2,
      rating,
    };
  }
}
