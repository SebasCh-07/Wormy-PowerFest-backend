# 📋 Especificaciones para el Backend - Wormy PowerFest

## 🎯 Resumen
El backend debe manejar registros de asistentes, generar códigos QR, y enviar notificaciones por email y WhatsApp.

---

## 🗄️ Base de Datos (Neon PostgreSQL)

### Tabla: `registrations`

```sql
CREATE TABLE registrations (
  id VARCHAR(255) PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  sports TEXT[] NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  check_in_time TIMESTAMP NULL,
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email ON registrations(email);
CREATE INDEX idx_status ON registrations(status);
```

### Estados posibles:
- `PENDING` - Registrado pero no ha llegado
- `CHECKED_IN` - Ya hizo check-in en el evento
- `NO_SHOW` - No se presentó

---

## 📡 API Endpoints

### Base URL
```
http://localhost:3000/api
```

### CORS
Permitir requests desde: `http://localhost:5173` (frontend)

---

## 🔵 1. Crear Registro

### `POST /api/registrations`

**Request Body:**
```json
{
  "firstName": "Alex",
  "lastName": "Rivera",
  "phone": "+34612345678",
  "email": "alex@example.com",
  "sports": ["Correr", "Gimnasio"]
}
```

**Validaciones:**
- `firstName`: requerido, string, min 2 caracteres
- `lastName`: requerido, string, min 2 caracteres
- `phone`: requerido, formato internacional (+34...)
- `email`: requerido, formato email válido
- `sports`: array de strings, mínimo 1 elemento

**Proceso:**
1. Validar datos
2. Generar ID único (ej: `cuid` o `uuid`)
3. Guardar en base de datos con status `PENDING`
4. Generar código QR con el ID
5. Enviar email con QR (usando Resend)
6. Enviar WhatsApp con QR (usando Twilio)
7. Retornar datos del registro

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx123456",
    "firstName": "Alex",
    "lastName": "Rivera",
    "phone": "+34612345678",
    "email": "alex@example.com",
    "sports": ["Correr", "Gimnasio"],
    "status": "PENDING",
    "registrationDate": "2024-01-15T10:30:00Z",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS..."
  },
  "notifications": {
    "email": {
      "sent": true,
      "messageId": "xxx"
    },
    "whatsapp": {
      "sent": true,
      "messageId": "xxx"
    }
  }
}
```

**Response 400 (Error):**
```json
{
  "success": false,
  "error": "Validation error",
  "details": {
    "email": "Invalid email format"
  }
}
```

---

## 🔵 2. Obtener Todos los Registros

### `GET /api/registrations`

**Query Parameters (opcionales):**
- `status` - Filtrar por estado (PENDING, CHECKED_IN, NO_SHOW)
- `limit` - Límite de resultados (default: 100)
- `offset` - Para paginación (default: 0)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx123456",
      "firstName": "Alex",
      "lastName": "Rivera",
      "phone": "+34612345678",
      "email": "alex@example.com",
      "sports": ["Correr", "Gimnasio"],
      "status": "PENDING",
      "checkInTime": null,
      "registrationDate": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

## 🔵 3. Obtener Registro por ID

### `GET /api/registrations/:id`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx123456",
    "firstName": "Alex",
    "lastName": "Rivera",
    "phone": "+34612345678",
    "email": "alex@example.com",
    "sports": ["Correr", "Gimnasio"],
    "status": "PENDING",
    "checkInTime": null,
    "registrationDate": "2024-01-15T10:30:00Z"
  }
}
```

**Response 404:**
```json
{
  "success": false,
  "error": "Registration not found"
}
```

---

## 🔵 4. Verificar Ticket (Check-in)

### `POST /api/verify`

**Request Body:**
```json
{
  "ticketId": "clxxx123456"
}
```

**Proceso:**
1. Buscar registro por ID
2. Si no existe → retornar error 404
3. Si ya tiene check-in → retornar "already_used"
4. Si está PENDING → actualizar a CHECKED_IN y guardar timestamp
5. Retornar datos del asistente

**Response 200 (Éxito):**
```json
{
  "success": true,
  "status": "success",
  "data": {
    "id": "clxxx123456",
    "firstName": "Alex",
    "lastName": "Rivera",
    "phone": "+34612345678",
    "email": "alex@example.com",
    "sports": ["Correr", "Gimnasio"],
    "status": "CHECKED_IN",
    "checkInTime": "2024-01-15T14:30:00Z",
    "registrationDate": "2024-01-15T10:30:00Z"
  }
}
```

**Response 200 (Ya usado):**
```json
{
  "success": true,
  "status": "already_used",
  "data": {
    "id": "clxxx123456",
    "firstName": "Alex",
    "lastName": "Rivera",
    "checkInTime": "2024-01-15T14:30:00Z"
  }
}
```

**Response 404:**
```json
{
  "success": false,
  "status": "not_found",
  "error": "Ticket not found"
}
```

---

## 🔵 5. Obtener Estadísticas

### `GET /api/stats`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "checkedIn": 45,
    "pending": 100,
    "noShow": 5,
    "sportsCount": 120,
    "recentScans": [
      {
        "id": "clxxx123456",
        "firstName": "Alex",
        "lastName": "Rivera",
        "checkInTime": "2024-01-15T14:30:00Z",
        "sports": ["Correr"]
      }
    ]
  }
}
```

**Cálculos:**
- `total`: Total de registros
- `checkedIn`: Registros con status CHECKED_IN
- `pending`: Registros con status PENDING
- `noShow`: Registros con status NO_SHOW
- `sportsCount`: Personas que seleccionaron al menos un deporte (no "Ninguno")
- `recentScans`: Últimos 10 check-ins ordenados por fecha descendente

---

## 📧 Envío de Email (Resend)

### Configuración
```env
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=onboarding@resend.dev
```

### Template del Email

**Asunto:** `🎟️ Tu entrada para Wormy PowerFest`

**HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { color: #E91E8C; }
    .qr-container { 
      background: #f5f5f5; 
      padding: 30px; 
      border-radius: 10px; 
      text-align: center; 
      margin: 20px 0;
    }
    .qr-code { max-width: 300px; }
    .ticket-id { 
      font-family: monospace; 
      color: #666; 
      font-size: 14px;
      margin-top: 10px;
    }
    .footer { 
      color: #666; 
      font-size: 12px; 
      margin-top: 30px; 
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="header">¡Hola {{firstName}}! 🐛</h1>
    <p>Tu registro para <strong>Wormy PowerFest</strong> ha sido confirmado.</p>
    
    <div class="qr-container">
      <h2>Tu Código QR</h2>
      <img src="{{qrCodeDataUrl}}" alt="QR Code" class="qr-code"/>
      <p class="ticket-id">ID: {{ticketId}}</p>
    </div>
    
    <p><strong>Deportes seleccionados:</strong> {{sports}}</p>
    
    <p>Presenta este código QR en la entrada del evento.</p>
    
    <div class="footer">
      <p>Wormy PowerFest - El evento deportivo más divertido del año</p>
      <p>Si tienes alguna pregunta, responde a este email.</p>
    </div>
  </div>
</body>
</html>
```

**Variables a reemplazar:**
- `{{firstName}}` - Nombre del asistente
- `{{qrCodeDataUrl}}` - Data URL del QR en base64
- `{{ticketId}}` - ID del ticket
- `{{sports}}` - Lista de deportes separados por coma

---

## 📱 Envío de WhatsApp (Twilio)

### Configuración
```env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Mensaje de WhatsApp

**Texto:**
```
🎟️ ¡Hola {{firstName}}!

Tu registro para Wormy PowerFest ha sido confirmado.

🆔 ID: {{ticketId}}
🏃 Deportes: {{sports}}

Presenta tu código QR en la entrada del evento.

¡Nos vemos pronto! 🐛
```

**Adjunto:**
- Imagen del código QR (debe ser URL pública o data URL)

**Nota:** En modo Sandbox de Twilio, el usuario debe haber activado su número primero enviando un mensaje al número de Twilio.

---

## 🔐 Generación de QR Code

### Librería recomendada: `qrcode`

```bash
npm install qrcode
```

### Código de ejemplo:
```javascript
import QRCode from 'qrcode';

async function generateQR(ticketId) {
  try {
    // Generar como Data URL (base64)
    const qrDataUrl = await QRCode.toDataURL(ticketId, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR:', error);
    throw error;
  }
}
```

---

## ⚠️ Manejo de Errores

### Errores comunes a manejar:

1. **Validación de datos**
   - Status: 400
   - Retornar detalles específicos del error

2. **Registro no encontrado**
   - Status: 404
   - Mensaje claro

3. **Error de base de datos**
   - Status: 500
   - Log del error (no exponer detalles al cliente)

4. **Error al enviar email/WhatsApp**
   - No fallar el registro
   - Log del error
   - Retornar en `notifications` que falló

---

## 🔄 Variables de Entorno Necesarias

```env
# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Server
PORT=3000
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:5173

# Resend
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=onboarding@resend.dev

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# App
APP_NAME=Wormy PowerFest
APP_URL=http://localhost:5173
```

---

## ✅ Checklist de Implementación

- [ ] Configurar base de datos Neon PostgreSQL
- [ ] Crear tabla `registrations`
- [ ] Implementar endpoint POST `/api/registrations`
- [ ] Implementar endpoint GET `/api/registrations`
- [ ] Implementar endpoint GET `/api/registrations/:id`
- [ ] Implementar endpoint POST `/api/verify`
- [ ] Implementar endpoint GET `/api/stats`
- [ ] Integrar generación de QR code
- [ ] Integrar Resend para emails
- [ ] Integrar Twilio para WhatsApp
- [ ] Configurar CORS
- [ ] Manejo de errores
- [ ] Testing de endpoints

---

## 🧪 Testing

### Probar con cURL:

```bash
# Crear registro
curl -X POST http://localhost:3000/api/registrations \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "phone": "+34612345678",
    "email": "test@example.com",
    "sports": ["Correr"]
  }'

# Verificar ticket
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"ticketId": "clxxx123456"}'

# Obtener estadísticas
curl http://localhost:3000/api/stats
```

---

¿Necesitas alguna aclaración o detalle adicional?
