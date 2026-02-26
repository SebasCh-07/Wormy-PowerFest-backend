import { PrismaClient } from '.prisma/client-escaperoom';

export const prismaEscapeRoom = new PrismaClient({
  datasources: {
    db: {
      url: process.env.ESCAPEROOM_DATABASE_URL,
    },
  },
});

// Manejo de desconexión
process.on('beforeExit', async () => {
  await prismaEscapeRoom.$disconnect();
});
