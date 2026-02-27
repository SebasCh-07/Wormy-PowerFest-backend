"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_escaperoom_1 = require(".prisma/client-escaperoom");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
// Cargar .env explícitamente desde la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
async function main() {
    if (!process.env.ESCAPEROOM_DATABASE_URL) {
        console.error('❌ ESCAPEROOM_DATABASE_URL no está definida');
        process.exit(1);
    }
    console.log('✅ ESCAPEROOM_DATABASE_URL cargada correctamente');
    const prisma = new client_escaperoom_1.PrismaClient();
    // Limpiar datos existentes
    await prisma.reservation.deleteMany();
    await prisma.timeSlot.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
    await prisma.user.deleteMany();
    console.log('🗑️  Datos anteriores eliminados');
    // Crear preguntas de trivia
    const questions = [
        {
            text: '¿Cuál es la capital de Ecuador?',
            order: 1,
            answers: [
                { text: 'Quito', isCorrect: true },
                { text: 'Guayaquil', isCorrect: false },
                { text: 'Cuenca', isCorrect: false },
                { text: 'Ambato', isCorrect: false },
            ],
        },
        {
            text: '¿Cuántos continentes hay en el mundo?',
            order: 2,
            answers: [
                { text: '5', isCorrect: false },
                { text: '6', isCorrect: false },
                { text: '7', isCorrect: true },
                { text: '8', isCorrect: false },
            ],
        },
        {
            text: '¿Cuál es el planeta más grande del sistema solar?',
            order: 3,
            answers: [
                { text: 'Marte', isCorrect: false },
                { text: 'Júpiter', isCorrect: true },
                { text: 'Saturno', isCorrect: false },
                { text: 'Neptuno', isCorrect: false },
            ],
        },
        {
            text: '¿Cuál es el océano más grande del mundo?',
            order: 4,
            answers: [
                { text: 'Atlántico', isCorrect: false },
                { text: 'Índico', isCorrect: false },
                { text: 'Pacífico', isCorrect: true },
                { text: 'Ártico', isCorrect: false },
            ],
        },
        {
            text: '¿En qué año llegó el hombre a la Luna?',
            order: 5,
            answers: [
                { text: '1965', isCorrect: false },
                { text: '1969', isCorrect: true },
                { text: '1972', isCorrect: false },
                { text: '1975', isCorrect: false },
            ],
        },
    ];
    for (const q of questions) {
        await prisma.question.create({
            data: {
                text: q.text,
                order: q.order,
                answers: {
                    create: q.answers,
                },
            },
        });
    }
    console.log('✅ 5 preguntas de trivia creadas');
    // Crear configuración de turnos
    console.log('📋 Creando configuración de turnos...');
    const eventDates = [
        new Date('2026-02-27T12:00:00.000Z'),
        new Date('2026-02-28T12:00:00.000Z'),
        new Date('2026-03-01T12:00:00.000Z'),
    ];
    const durationMinutes = 15;
    const startHour = 8;
    const endHour = 20;
    const slotsPerDay = Math.floor(((endHour - startHour) * 60) / durationMinutes);
    await prisma.timeslotConfig.create({
        data: {
            eventDates,
            durationMinutes,
            startHour,
            endHour,
            slotsPerDay,
            updatedBy: 'seed',
        },
    });
    console.log('✅ Configuración de turnos creada');
    // Crear turnos según configuración
    console.log('📋 Generando turnos...');
    console.log(`⚙️  Generando con:`);
    console.log(`   - Fechas: ${eventDates.length} días`);
    console.log(`   - Duración: ${durationMinutes} minutos por turno`);
    console.log(`   - Horario: ${startHour}:00 - ${endHour}:00`);
    let totalSlots = 0;
    for (const date of eventDates) {
        let currentMinute = startHour * 60;
        const endMinute = endHour * 60;
        while (currentMinute + durationMinutes <= endMinute) {
            const startHourCalc = Math.floor(currentMinute / 60);
            const startMinuteCalc = currentMinute % 60;
            const endMinuteCalc = currentMinute + durationMinutes;
            const endHourCalc = Math.floor(endMinuteCalc / 60);
            const endMinuteCalcMod = endMinuteCalc % 60;
            const startTime = `${startHourCalc.toString().padStart(2, '0')}:${startMinuteCalc.toString().padStart(2, '0')}`;
            const endTime = `${endHourCalc.toString().padStart(2, '0')}:${endMinuteCalcMod.toString().padStart(2, '0')}`;
            await prisma.timeSlot.create({
                data: {
                    date,
                    startTime,
                    endTime,
                },
            });
            totalSlots++;
            currentMinute += durationMinutes;
        }
    }
    const calculatedSlotsPerDay = Math.floor(totalSlots / eventDates.length);
    console.log(`✅ ${totalSlots} turnos creados (${calculatedSlotsPerDay} por día)`);
    console.log('🎉 Seed completado exitosamente');
    await prisma.$disconnect();
}
main()
    .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
});
