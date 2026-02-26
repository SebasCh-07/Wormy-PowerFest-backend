// Asegurar que las variables de entorno estén cargadas
import './env';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ 
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
