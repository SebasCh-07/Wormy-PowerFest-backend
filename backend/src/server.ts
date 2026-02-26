import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import registrationRoutes from './routes/registration.routes';
import verificationRoutes from './routes/verification.routes';
import statsRoutes from './routes/stats.routes';
import scanRoutes from './routes/scan.routes';
import { errorHandler } from './middleware/errorHandler';

// Rutas EscapeRoom
import escaperoomUserRoutes from './routes/escaperoom/user.routes';
import escaperoomTriviaRoutes from './routes/escaperoom/trivia.routes';
import escaperoomTimeslotRoutes from './routes/escaperoom/timeslot.routes';
import escaperoomReservationRoutes from './routes/escaperoom/reservation.routes';
import escaperoomCheckinRoutes from './routes/escaperoom/checkin.routes';
import escaperoomAdminRoutes from './routes/escaperoom/admin.routes';
import { errorHandler as escaperoomErrorHandler } from './middleware/escaperoom/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://wpowerfests.vercel.app',
  credentials: true,
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'wpowerfest', timestamp: new Date().toISOString() });
});

app.get('/escaperoom/health', (req, res) => {
  res.json({ status: 'ok', service: 'escaperoom', timestamp: new Date().toISOString() });
});

// Rutas wpowerfest
app.use('/api/registrations', registrationRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/scan', scanRoutes);

// Rutas escaperoom (con prefijo /escaperoom/api)
app.use('/escaperoom/api/users', escaperoomUserRoutes);
app.use('/escaperoom/api/trivia', escaperoomTriviaRoutes);
app.use('/escaperoom/api/timeslots', escaperoomTimeslotRoutes);
app.use('/escaperoom/api/reservations', escaperoomReservationRoutes);
app.use('/escaperoom/api/checkin', escaperoomCheckinRoutes);
app.use('/escaperoom/api/admin', escaperoomAdminRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Base de datos wpowerfest conectada');
    
    // Conectar base de datos de escaperoom
    const { prismaEscapeRoom } = await import('./services/escaperoom/prisma');
    await prismaEscapeRoom.$connect();
    console.log('✅ Base de datos escaperoom conectada');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🎮 wpowerfest API: http://localhost:${PORT}/api`);
      console.log(`🔐 EscapeRoom API: http://localhost:${PORT}/escaperoom/api`);
    });
  } catch (error) {
    console.error('❌ Error conectando a las bases de datos:', error);
    process.exit(1);
  }
}

startServer();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  const { prismaEscapeRoom } = await import('./services/escaperoom/prisma');
  await prismaEscapeRoom.$disconnect();
  process.exit(0);
});
