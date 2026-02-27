"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservationService = void 0;
const prisma_1 = require("../../services/escaperoom/prisma");
const errors_1 = require("../../services/escaperoom/utils/errors");
const uuid_1 = require("uuid");
const qr_service_1 = require("../../services/escaperoom/services/qr.service");
const email_service_1 = require("../../services/escaperoom/services/email.service");
const whatsapp_service_1 = require("../../services/escaperoom/services/whatsapp.service");
const dateHelpers_1 = require("../../services/escaperoom/utils/dateHelpers");
class ReservationService {
    async createReservation(data) {
        // 1. Verificar que el usuario existe y completó la trivia
        const user = await prisma_1.prismaEscapeRoom.user.findUnique({
            where: { id: data.userId },
            include: { reservations: true },
        });
        if (!user) {
            throw new errors_1.NotFoundError('Usuario no encontrado');
        }
        if (!user.triviaCompleted) {
            throw new errors_1.BadRequestError('Debes completar la trivia primero');
        }
        // Verificar si ya tiene una reserva activa (no cancelada)
        const activeReservation = user.reservations.find((r) => r.status !== 'CANCELLED');
        if (activeReservation) {
            throw new errors_1.ConflictError('Ya tienes una reserva activa');
        }
        // 2. Verificar que el turno existe y tiene capacidad disponible
        const timeslot = await prisma_1.prismaEscapeRoom.timeSlot.findUnique({
            where: { id: data.timeslotId },
            include: {
                reservations: {
                    where: {
                        status: {
                            not: 'CANCELLED'
                        }
                    }
                }
            }
        });
        if (!timeslot) {
            throw new errors_1.NotFoundError('Turno no encontrado');
        }
        // Validar capacidad del turno
        const activeReservationsCount = timeslot.reservations.length;
        if (activeReservationsCount >= timeslot.capacity) {
            throw new errors_1.BadRequestError(`Este turno ya está completo (${timeslot.capacity}/${timeslot.capacity} personas)`);
        }
        // 3. Generar código QR único
        const qrCode = (0, uuid_1.v4)();
        const qrImage = await (0, qr_service_1.generateQR)(qrCode);
        // 4. Crear reserva
        const reservation = await prisma_1.prismaEscapeRoom.reservation.create({
            data: {
                userId: data.userId,
                timeslotId: data.timeslotId,
                qrCode,
                createdAt: (0, dateHelpers_1.getEcuadorTime)(),
            },
            include: {
                user: true,
                timeslot: true,
            },
        });
        // 5. Enviar confirmaciones (no bloqueantes)
        console.log('📨 Iniciando envío de notificaciones...');
        const notificationPromises = [];
        // Solo intentar enviar email si está configurado
        if (process.env.ESCAPEROOM_RESEND_API_KEY && process.env.ESCAPEROOM_RESEND_API_KEY !== 're_xxxxxxxxxxxxxxxxxxxxxxxxxx') {
            notificationPromises.push((0, email_service_1.sendReservationEmail)(user.email, reservation, qrCode));
        }
        else {
            console.log('⚠️  Email NO configurado - Saltando envío de email');
        }
        // Solo intentar enviar WhatsApp si está habilitado y configurado
        const whatsappEnabled = process.env.ESCAPEROOM_WHATSAPP_ENABLED === 'true';
        if (whatsappEnabled &&
            process.env.ESCAPEROOM_TWILIO_ACCOUNT_SID &&
            process.env.ESCAPEROOM_TWILIO_AUTH_TOKEN &&
            process.env.ESCAPEROOM_TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
            notificationPromises.push((0, whatsapp_service_1.sendReservationWhatsApp)(user.whatsapp, reservation, qrImage));
        }
        else {
            if (!whatsappEnabled) {
                console.log('⚠️  WhatsApp desactivado por configuración - Saltando envío');
            }
            else {
                console.log('⚠️  WhatsApp NO configurado - Saltando envío de WhatsApp');
            }
        }
        if (notificationPromises.length > 0) {
            Promise.all(notificationPromises)
                .then(() => console.log('✅ Todas las notificaciones configuradas fueron enviadas'))
                .catch((err) => console.error('❌ Error enviando notificaciones:', err));
        }
        else {
            console.log('⚠️  No hay servicios de notificación configurados');
        }
        return {
            ...reservation,
            qrImage,
        };
    }
    async createMultipleReservations(data) {
        const { userIds, timeslotId } = data;
        if (!userIds || userIds.length !== 2) {
            throw new errors_1.BadRequestError('Debes proporcionar exactamente 2 usuarios');
        }
        // 1. Verificar que ambos usuarios existen y completaron la trivia
        const users = await prisma_1.prismaEscapeRoom.user.findMany({
            where: {
                id: {
                    in: userIds
                }
            },
            include: { reservations: true }
        });
        if (users.length !== 2) {
            throw new errors_1.NotFoundError('Uno o más usuarios no fueron encontrados');
        }
        // Verificar que ambos completaron la trivia
        for (const user of users) {
            if (!user.triviaCompleted) {
                throw new errors_1.BadRequestError(`El usuario ${user.firstName} ${user.lastName} debe completar la trivia primero`);
            }
            // Verificar que no tengan reservas activas
            const activeReservation = user.reservations.find(r => r.status !== 'CANCELLED');
            if (activeReservation) {
                throw new errors_1.ConflictError(`El usuario ${user.firstName} ${user.lastName} ya tiene una reserva activa`);
            }
        }
        // 2. Verificar que el turno existe y tiene capacidad para 2 personas
        const timeslot = await prisma_1.prismaEscapeRoom.timeSlot.findUnique({
            where: { id: timeslotId },
            include: {
                reservations: {
                    where: {
                        status: {
                            not: 'CANCELLED'
                        }
                    }
                }
            }
        });
        if (!timeslot) {
            throw new errors_1.NotFoundError('Turno no encontrado');
        }
        const activeReservationsCount = timeslot.reservations.length;
        const availableSpots = timeslot.capacity - activeReservationsCount;
        if (availableSpots < 2) {
            throw new errors_1.BadRequestError(`Este turno no tiene suficiente capacidad (disponibles: ${availableSpots}/2)`);
        }
        // 3. Generar códigos QR únicos para cada persona
        const qrCode1 = (0, uuid_1.v4)();
        const qrCode2 = (0, uuid_1.v4)();
        const qrImage1 = await (0, qr_service_1.generateQR)(qrCode1);
        const qrImage2 = await (0, qr_service_1.generateQR)(qrCode2);
        // 4. Crear ambas reservas en una transacción
        const reservations = await prisma_1.prismaEscapeRoom.$transaction([
            prisma_1.prismaEscapeRoom.reservation.create({
                data: {
                    userId: users[0].id,
                    timeslotId,
                    qrCode: qrCode1,
                    createdAt: (0, dateHelpers_1.getEcuadorTime)(),
                },
                include: {
                    user: true,
                    timeslot: true,
                },
            }),
            prisma_1.prismaEscapeRoom.reservation.create({
                data: {
                    userId: users[1].id,
                    timeslotId,
                    qrCode: qrCode2,
                    createdAt: (0, dateHelpers_1.getEcuadorTime)(),
                },
                include: {
                    user: true,
                    timeslot: true,
                },
            }),
        ]);
        // 5. Enviar notificaciones a ambos usuarios en paralelo
        console.log('📨 Enviando notificaciones a 2 usuarios...');
        const notificationPromises = [];
        const whatsappEnabled = process.env.ESCAPEROOM_WHATSAPP_ENABLED === 'true';
        // Notificaciones para usuario 1
        if (process.env.ESCAPEROOM_RESEND_API_KEY && process.env.ESCAPEROOM_RESEND_API_KEY !== 're_xxxxxxxxxxxxxxxxxxxxxxxxxx') {
            notificationPromises.push((0, email_service_1.sendReservationEmail)(users[0].email, reservations[0], qrCode1));
        }
        if (whatsappEnabled &&
            process.env.ESCAPEROOM_TWILIO_ACCOUNT_SID &&
            process.env.ESCAPEROOM_TWILIO_AUTH_TOKEN &&
            process.env.ESCAPEROOM_TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
            notificationPromises.push((0, whatsapp_service_1.sendReservationWhatsApp)(users[0].whatsapp, reservations[0], qrImage1));
        }
        // Notificaciones para usuario 2
        if (process.env.ESCAPEROOM_RESEND_API_KEY && process.env.ESCAPEROOM_RESEND_API_KEY !== 're_xxxxxxxxxxxxxxxxxxxxxxxxxx') {
            notificationPromises.push((0, email_service_1.sendReservationEmail)(users[1].email, reservations[1], qrCode2));
        }
        if (whatsappEnabled &&
            process.env.ESCAPEROOM_TWILIO_ACCOUNT_SID &&
            process.env.ESCAPEROOM_TWILIO_AUTH_TOKEN &&
            process.env.ESCAPEROOM_TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
            notificationPromises.push((0, whatsapp_service_1.sendReservationWhatsApp)(users[1].whatsapp, reservations[1], qrImage2));
        }
        if (notificationPromises.length > 0) {
            Promise.all(notificationPromises)
                .then(() => console.log('✅ Todas las notificaciones enviadas a ambos usuarios'))
                .catch((err) => console.error('❌ Error enviando notificaciones:', err));
        }
        return {
            reservations: [
                { ...reservations[0], qrImage: qrImage1 },
                { ...reservations[1], qrImage: qrImage2 },
            ]
        };
    }
    async resendQR(data) {
        const { email, newEmail, newWhatsapp, newPartnerEmail, newPartnerWhatsapp, newTimeslotId } = data;
        // 1. Buscar usuario por email
        const user = await prisma_1.prismaEscapeRoom.user.findUnique({
            where: { email },
            include: {
                partner: true,
                reservations: {
                    include: {
                        timeslot: true
                    },
                    where: {
                        status: {
                            not: 'CANCELLED'
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                }
            },
        });
        if (!user) {
            throw new errors_1.NotFoundError('Usuario no encontrado');
        }
        if (!user.triviaCompleted) {
            throw new errors_1.BadRequestError('Debes completar la trivia primero');
        }
        // Obtener la reserva activa más reciente
        const activeReservation = user.reservations[0] || null;
        // Si no tiene reserva, crear una nueva (requiere timeslotId)
        if (!activeReservation) {
            if (!newTimeslotId) {
                throw new errors_1.BadRequestError('Debes seleccionar un turno para crear tu reserva');
            }
            // Verificar que el turno existe
            const timeslot = await prisma_1.prismaEscapeRoom.timeSlot.findUnique({
                where: { id: newTimeslotId },
            });
            if (!timeslot) {
                throw new errors_1.NotFoundError('El turno seleccionado no existe');
            }
            // Generar código QR único
            const qrCode = (0, uuid_1.v4)();
            const qrImage = await (0, qr_service_1.generateQR)(qrCode);
            // Actualizar datos del usuario si se proporcionaron
            const updateUserData = {};
            if (newEmail && newEmail !== email) {
                const existingUser = await prisma_1.prismaEscapeRoom.user.findUnique({
                    where: { email: newEmail },
                });
                if (existingUser && existingUser.id !== user.id) {
                    throw new errors_1.ConflictError('El nuevo email ya está en uso');
                }
                updateUserData.email = newEmail;
            }
            if (newWhatsapp && newWhatsapp !== user.whatsapp) {
                updateUserData.whatsapp = newWhatsapp;
            }
            let updatedUser = user;
            if (Object.keys(updateUserData).length > 0) {
                updatedUser = await prisma_1.prismaEscapeRoom.user.update({
                    where: { id: user.id },
                    data: updateUserData,
                    include: {
                        partner: true,
                        reservations: {
                            include: {
                                timeslot: true
                            },
                            where: {
                                status: {
                                    not: 'CANCELLED'
                                }
                            },
                            orderBy: {
                                createdAt: 'desc'
                            },
                            take: 1
                        }
                    },
                });
            }
            // Crear reserva
            const newReservation = await prisma_1.prismaEscapeRoom.reservation.create({
                data: {
                    userId: user.id,
                    timeslotId: newTimeslotId,
                    qrCode,
                    createdAt: (0, dateHelpers_1.getEcuadorTime)(),
                },
                include: {
                    user: true,
                    timeslot: true,
                },
            });
            console.log(`✅ Primera reserva creada para usuario ${user.id}`);
            // Enviar notificaciones
            console.log('📨 Enviando notificaciones...');
            const notificationPromises = [];
            const whatsappEnabled = process.env.ESCAPEROOM_WHATSAPP_ENABLED === 'true';
            if (process.env.ESCAPEROOM_RESEND_API_KEY && process.env.ESCAPEROOM_RESEND_API_KEY !== 're_xxxxxxxxxxxxxxxxxxxxxxxxxx') {
                notificationPromises.push((0, email_service_1.sendReservationEmail)(updatedUser.email, newReservation, qrCode));
            }
            if (whatsappEnabled &&
                process.env.ESCAPEROOM_TWILIO_ACCOUNT_SID &&
                process.env.ESCAPEROOM_TWILIO_AUTH_TOKEN &&
                process.env.ESCAPEROOM_TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
                notificationPromises.push((0, whatsapp_service_1.sendReservationWhatsApp)(updatedUser.whatsapp, newReservation, qrImage));
            }
            else {
                if (!whatsappEnabled) {
                    console.log('⚠️  WhatsApp desactivado por configuración - Saltando envío');
                }
            }
            if (notificationPromises.length > 0) {
                await Promise.all(notificationPromises)
                    .then(() => console.log('✅ Notificaciones enviadas'))
                    .catch((err) => console.error('❌ Error enviando notificaciones:', err));
            }
            return {
                message: 'Reserva creada y QR enviado exitosamente',
                sentTo: {
                    email: updatedUser.email,
                    whatsapp: updatedUser.whatsapp,
                },
                emailUpdated: newEmail ? true : false,
                whatsappUpdated: newWhatsapp ? true : false,
                timeslotUpdated: false,
                reservationCreated: true,
            };
        }
        // Validar que la reserva no esté usada o cancelada
        if (activeReservation.status === 'USED') {
            throw new errors_1.BadRequestError('No puedes modificar una reserva ya utilizada');
        }
        if (activeReservation.status === 'CANCELLED') {
            throw new errors_1.BadRequestError('No puedes modificar una reserva cancelada');
        }
        // 2. Preparar datos de actualización del usuario
        const updateUserData = {};
        if (newEmail && newEmail !== email) {
            // Verificar que el nuevo email no esté en uso
            const existingUser = await prisma_1.prismaEscapeRoom.user.findUnique({
                where: { email: newEmail },
            });
            if (existingUser && existingUser.id !== user.id) {
                throw new errors_1.ConflictError('El nuevo email ya está en uso');
            }
            updateUserData.email = newEmail;
            console.log(`📧 Email actualizado de ${email} a ${newEmail}`);
        }
        if (newWhatsapp && newWhatsapp !== user.whatsapp) {
            updateUserData.whatsapp = newWhatsapp;
            console.log(`📱 WhatsApp actualizado de ${user.whatsapp} a ${newWhatsapp}`);
        }
        // 3. Validar y preparar actualización de timeslot si se proporciona
        let timeslotUpdated = false;
        if (newTimeslotId && newTimeslotId !== activeReservation.timeslotId) {
            const newTimeslot = await prisma_1.prismaEscapeRoom.timeSlot.findUnique({
                where: { id: newTimeslotId },
            });
            if (!newTimeslot) {
                throw new errors_1.NotFoundError('El nuevo turno no existe');
            }
            console.log(`🕐 Turno actualizado de ${activeReservation.timeslot.startTime} a ${newTimeslot.startTime}`);
            timeslotUpdated = true;
        }
        // 4. Actualizar usuario si hay cambios
        let updatedUser = user;
        if (Object.keys(updateUserData).length > 0) {
            const updated = await prisma_1.prismaEscapeRoom.user.update({
                where: { id: user.id },
                data: updateUserData,
                include: {
                    partner: true,
                    reservations: {
                        include: {
                            timeslot: true
                        },
                        where: {
                            status: {
                                not: 'CANCELLED'
                            }
                        },
                        orderBy: {
                            createdAt: 'desc'
                        },
                        take: 1
                    }
                },
            });
            // Mantener la estructura completa con partner
            updatedUser = {
                ...updated,
                partner: updated.partner || user.partner,
            };
        }
        // 4.1 Actualizar partner si hay cambios y existe
        let updatedPartner = user.partner; // Siempre asignar el partner si existe
        if (user.partner && (newPartnerEmail || newPartnerWhatsapp)) {
            const updatePartnerData = {};
            if (newPartnerEmail && newPartnerEmail !== user.partner.email) {
                const existingUser = await prisma_1.prismaEscapeRoom.user.findUnique({
                    where: { email: newPartnerEmail },
                });
                if (existingUser && existingUser.id !== user.partner.id) {
                    throw new errors_1.ConflictError('El nuevo email del compañero ya está en uso');
                }
                updatePartnerData.email = newPartnerEmail;
                console.log(`📧 Email del compañero actualizado a ${newPartnerEmail}`);
            }
            if (newPartnerWhatsapp && newPartnerWhatsapp !== user.partner.whatsapp) {
                updatePartnerData.whatsapp = newPartnerWhatsapp;
                console.log(`📱 WhatsApp del compañero actualizado a ${newPartnerWhatsapp}`);
            }
            if (Object.keys(updatePartnerData).length > 0) {
                updatedPartner = await prisma_1.prismaEscapeRoom.user.update({
                    where: { id: user.partner.id },
                    data: updatePartnerData,
                });
            }
        }
        // 5. Actualizar AMBAS reservas si hay cambio de timeslot
        let updatedReservation = updatedUser.reservations[0] || activeReservation;
        let partnerReservation = null;
        if (timeslotUpdated && newTimeslotId) {
            // Actualizar reserva del usuario principal
            updatedReservation = await prisma_1.prismaEscapeRoom.reservation.update({
                where: { id: activeReservation.id },
                data: { timeslotId: newTimeslotId },
                include: {
                    user: true,
                    timeslot: true,
                },
            });
            // Si tiene partner, actualizar también su reserva
            if (user.partnerId) {
                const partnerReservationData = await prisma_1.prismaEscapeRoom.reservation.findFirst({
                    where: {
                        userId: user.partnerId,
                        status: {
                            not: 'CANCELLED'
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                });
                if (partnerReservationData) {
                    partnerReservation = await prisma_1.prismaEscapeRoom.reservation.update({
                        where: { id: partnerReservationData.id },
                        data: { timeslotId: newTimeslotId },
                        include: {
                            user: true,
                            timeslot: true,
                        },
                    });
                    console.log(`✅ Turno del compañero también actualizado`);
                }
            }
        }
        // 6. Regenerar imagen QR (mismo código)
        const qrImage = await (0, qr_service_1.generateQR)(activeReservation.qrCode);
        // 7. Preparar objeto de reserva con estructura correcta para los servicios de notificación
        const reservationForNotification = {
            ...updatedReservation,
            user: {
                id: updatedUser.id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                whatsapp: updatedUser.whatsapp,
            },
            timeslot: updatedReservation.timeslot,
        };
        // 8. Reenviar notificaciones a AMBOS usuarios
        console.log('📨 Reenviando notificaciones...');
        const notificationPromises = [];
        // Notificaciones para usuario principal
        const whatsappEnabled = process.env.ESCAPEROOM_WHATSAPP_ENABLED === 'true';
        if (process.env.ESCAPEROOM_RESEND_API_KEY && process.env.ESCAPEROOM_RESEND_API_KEY !== 're_xxxxxxxxxxxxxxxxxxxxxxxxxx') {
            notificationPromises.push((0, email_service_1.sendReservationEmail)(updatedUser.email, reservationForNotification, activeReservation.qrCode));
        }
        if (whatsappEnabled &&
            process.env.ESCAPEROOM_TWILIO_ACCOUNT_SID &&
            process.env.ESCAPEROOM_TWILIO_AUTH_TOKEN &&
            process.env.ESCAPEROOM_TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
            notificationPromises.push((0, whatsapp_service_1.sendReservationWhatsApp)(updatedUser.whatsapp, reservationForNotification, qrImage));
        }
        else {
            if (!whatsappEnabled) {
                console.log('⚠️  WhatsApp desactivado por configuración - Saltando envío');
            }
        }
        // Notificaciones para partner si existe (SIEMPRE, no solo cuando se actualiza el turno)
        if (updatedPartner) {
            // Buscar la reserva del partner
            const partnerReservationData = await prisma_1.prismaEscapeRoom.reservation.findFirst({
                where: {
                    userId: updatedPartner.id,
                    status: {
                        not: 'CANCELLED'
                    }
                },
                include: {
                    user: true,
                    timeslot: true,
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            if (partnerReservationData) {
                const partnerQrImage = await (0, qr_service_1.generateQR)(partnerReservationData.qrCode);
                console.log(`📨 Enviando también al compañero: ${updatedPartner.email}`);
                if (process.env.ESCAPEROOM_RESEND_API_KEY && process.env.ESCAPEROOM_RESEND_API_KEY !== 're_xxxxxxxxxxxxxxxxxxxxxxxxxx') {
                    notificationPromises.push((0, email_service_1.sendReservationEmail)(updatedPartner.email, partnerReservationData, partnerReservationData.qrCode));
                }
                if (whatsappEnabled &&
                    process.env.ESCAPEROOM_TWILIO_ACCOUNT_SID &&
                    process.env.ESCAPEROOM_TWILIO_AUTH_TOKEN &&
                    process.env.ESCAPEROOM_TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
                    notificationPromises.push((0, whatsapp_service_1.sendReservationWhatsApp)(updatedPartner.whatsapp, partnerReservationData, partnerQrImage));
                }
            }
        }
        if (notificationPromises.length > 0) {
            await Promise.all(notificationPromises)
                .then(() => console.log('✅ QR reenviado exitosamente a ambos usuarios'))
                .catch((err) => console.error('❌ Error reenviando notificaciones:', err));
        }
        else {
            console.log('⚠️  No hay servicios de notificación configurados');
        }
        return {
            message: 'QR reenviado exitosamente',
            sentTo: {
                email: updatedUser.email,
                whatsapp: updatedUser.whatsapp,
            },
            partnerSentTo: updatedPartner ? {
                email: updatedPartner.email,
                whatsapp: updatedPartner.whatsapp,
            } : null,
            emailUpdated: newEmail ? true : false,
            whatsappUpdated: newWhatsapp ? true : false,
            timeslotUpdated,
        };
    }
}
exports.ReservationService = ReservationService;
