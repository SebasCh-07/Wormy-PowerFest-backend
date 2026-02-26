import { prismaEscapeRoom as prisma } from '../../services/escaperoom/prisma';
import { ValidateTriviaDto } from './trivia.types';
import { NotFoundError, BadRequestError } from '../../services/escaperoom/utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { generateQR } from '../../services/escaperoom/services/qr.service';
import { sendReservationEmail } from '../../services/escaperoom/services/email.service';
import { sendReservationWhatsApp } from '../../services/escaperoom/services/whatsapp.service';
import { getEcuadorDate, getEcuadorTime, getEcuadorTimeComponents, isSameDay } from '../../services/escaperoom/utils/dateHelpers';

export class TriviaService {
  async getQuestions() {
    const questions = await prisma.question.findMany({
      orderBy: { order: 'asc' },
      include: {
        answers: {
          select: {
            id: true,
            text: true,
          },
        },
      },
    });

    return questions;
  }

  async validateAnswers(data: ValidateTriviaDto) {
    const { userId, answers } = data;

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { partner: true },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    // Verificar que se respondieron exactamente 5 preguntas
    if (answers.length !== 5) {
      throw new BadRequestError('Debes responder las 5 preguntas');
    }

    // Validar cada respuesta
    let allCorrect = true;
    for (const answer of answers) {
      const correctAnswer = await prisma.answer.findFirst({
        where: {
          questionId: answer.questionId,
          id: answer.answerId,
          isCorrect: true,
        },
      });

      if (!correctAnswer) {
        allCorrect = false;
        break;
      }
    }

    // Si todas son correctas, actualizar triviaCompleted en AMBAS personas del grupo
    if (allCorrect) {
      const updatePromises = [
        prisma.user.update({
          where: { id: userId },
          data: { triviaCompleted: true },
        })
      ];

      // Si tiene partner, también marcar su trivia como completada
      if (user.partnerId) {
        updatePromises.push(
          prisma.user.update({
            where: { id: user.partnerId },
            data: { triviaCompleted: true },
          })
        );
      }

      await Promise.all(updatePromises);
      
      console.log(`✅ Trivia completada para usuario ${userId}${user.partnerId ? ` y su compañero ${user.partnerId}` : ''}`);
    }

    return {
      correct: allCorrect,
      message: allCorrect
        ? 'Trivia completada correctamente. Ahora selecciona tu turno.'
        : 'Algunas respuestas son incorrectas',
    };
  }

  /**
   * DEPRECATED: Ya no se usa - Se mantiene por compatibilidad
   * Crea una reserva automáticamente después de completar la trivia
   * - Busca el primer turno disponible del día actual (en zona horaria de Ecuador)
   * - Genera un código QR único
   * - Envía el QR por email y WhatsApp
   */
  private async createAutoReservation(userId: string) {
    console.log(`🎫 Creando reserva automática para usuario ${userId}...`);

    // Obtener datos del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    // Obtener fecha actual en Ecuador
    const { year, month, day } = getEcuadorDate();
    console.log(`📅 Buscando turnos para: ${year}-${month + 1}-${day} (Ecuador)`);

    // Obtener todos los turnos y filtrar por fecha actual
    const allTimeslots = await prisma.timeSlot.findMany({
      orderBy: { startTime: 'asc' },
    });

    // Filtrar turnos que coincidan con la fecha actual de Ecuador
    const todayTimeslots = allTimeslots.filter((slot) => {
      const slotDate = new Date(slot.date);
      return (
        slotDate.getUTCFullYear() === year &&
        slotDate.getUTCMonth() === month &&
        slotDate.getUTCDate() === day
      );
    });

    if (todayTimeslots.length === 0) {
      throw new BadRequestError('No hay turnos disponibles para hoy');
    }

    // Obtener hora y minutos actuales en Ecuador
    const { hour: currentHour, minute: currentMinute } = getEcuadorTimeComponents();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    console.log(`🕐 Hora actual Ecuador: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);

    // Buscar el turno que corresponde a la hora actual o el siguiente disponible
    let timeslot = todayTimeslots.find((slot) => {
      // Parsear startTime (formato "HH:MM")
      const [startHour, startMinute] = slot.startTime.split(':').map(Number);
      const [endHour, endMinute] = slot.endTime.split(':').map(Number);
      
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;
      
      // El turno actual es aquel donde la hora actual está entre start y end
      return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
    });

    // Si no hay turno actual (por ejemplo, entre turnos), buscar el siguiente
    if (!timeslot) {
      timeslot = todayTimeslots.find((slot) => {
        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        const startTimeInMinutes = startHour * 60 + startMinute;
        return currentTimeInMinutes < startTimeInMinutes;
      });
    }

    // Si aún no hay turno, tomar el primero (fallback)
    if (!timeslot) {
      timeslot = todayTimeslots[0];
    }

    console.log(`✅ Turno asignado: ${timeslot.startTime} - ${timeslot.endTime}`);

    // Generar código QR único
    const qrCode = uuidv4();
    console.log(`🔑 Código QR generado: ${qrCode}`);

    // Generar imagen QR
    const qrImage = await generateQR(qrCode);

    // Crear reserva en la base de datos
    const reservation = await prisma.reservation.create({
      data: {
        userId,
        timeslotId: timeslot.id,
        qrCode,
        createdAt: getEcuadorTime(),
      },
      include: {
        user: true,
        timeslot: true,
      },
    });

    console.log(`✅ Reserva creada con ID: ${reservation.id}`);

    // Enviar notificaciones
    try {
      // Enviar email
      await sendReservationEmail(user.email, reservation, qrCode);
      console.log(`📧 Email enviado a ${user.email}`);
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      // No lanzar error, continuar con WhatsApp
    }

    try {
      // Enviar WhatsApp
      await sendReservationWhatsApp(user.whatsapp, reservation, qrImage);
      console.log(`📱 WhatsApp enviado a ${user.whatsapp}`);
    } catch (error) {
      console.error('❌ Error enviando WhatsApp:', error);
      // No lanzar error, la reserva ya está creada
    }

    console.log(`🎉 Reserva automática completada para ${user.firstName} ${user.lastName}`);

    return reservation;
  }
}
