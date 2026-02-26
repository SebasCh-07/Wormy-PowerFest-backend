import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
    lastName: z.string().min(2, 'Apellido debe tener al menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    whatsapp: z.string().regex(/^09\d{8}$/, 'WhatsApp debe tener formato 09XXXXXXXX'),
  }),
});
