import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import registrationRoutes from './routes/registration.routes';
import verificationRoutes from './routes/verification.routes';
import statsRoutes from './routes/stats.routes';
import scanRoutes from './routes/scan.routes';
import { errorHandler } from './middleware/errorHandler';

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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/registrations', registrationRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/scan', scanRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Base de datos conectada exitosamente');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    process.exit(1);
  }
}

startServer();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
