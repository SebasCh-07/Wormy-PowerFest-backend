import dotenv from 'dotenv';

// Cargar variables de entorno lo antes posible
dotenv.config();

// Validar variables críticas
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL no está definida en el archivo .env');
  process.exit(1);
}

console.log('✅ Variables de entorno cargadas correctamente');
