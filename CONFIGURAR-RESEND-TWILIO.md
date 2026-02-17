# 📧📱 Configurar Resend y Twilio para envío automático de QR

## 🎯 Objetivo
Configurar los servicios para que cuando alguien se registre, reciba automáticamente el código QR por:
- ✉️ Email (usando Resend)
- 📱 WhatsApp (usando Twilio)

---

## 📧 Paso 1: Configurar Resend (Email)

### 1.1 Crear cuenta en Resend
1. Ve a: https://resend.com/signup
2. Regístrate con tu email
3. Verifica tu cuenta

### 1.2 Obtener API Key
1. Ve a: https://resend.com/api-keys
2. Click en "Create API Key"
3. Dale un nombre (ej: "Wormy PowerFest")
4. Copia la API key (empieza con `re_`)

### 1.3 Configurar dominio (opcional pero recomendado)
Si quieres enviar desde tu propio dominio:
1. Ve a: https://resend.com/domains
2. Click en "Add Domain"
3. Ingresa tu dominio (ej: `tudominio.com`)
4. Sigue las instrucciones para agregar los registros DNS

**Nota:** Si no tienes dominio, puedes usar `onboarding@resend.dev` (viene por defecto)

### 1.4 Actualizar .env
```env
RESEND_API_KEY=re_tu_api_key_real_aqui
FROM_EMAIL=onboarding@resend.dev
# O si configuraste tu dominio:
# FROM_EMAIL=noreply@tudominio.com
```

---

## 📱 Paso 2: Configurar Twilio (WhatsApp)

### 2.1 Crear cuenta en Twilio
1. Ve a: https://www.twilio.com/try-twilio
2. Regístrate (te dan $15 de crédito gratis)
3. Verifica tu número de teléfono

### 2.2 Obtener credenciales
1. Ve al Dashboard: https://console.twilio.com
2. Copia tu `Account SID` (empieza con `AC`)
3. Copia tu `Auth Token` (click en "Show" para verlo)

### 2.3 Configurar WhatsApp Sandbox (para pruebas)
1. Ve a: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Sigue las instrucciones para activar el Sandbox
3. Envía un mensaje desde tu WhatsApp al número de Twilio con el código que te dan
4. Ejemplo: Envía `join [código]` a `+1 415 523 8886`

### 2.4 Actualizar .env
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token_aqui
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

**Nota:** El número `+14155238886` es el número del Sandbox. Para producción necesitas un número aprobado.

---

## 🧪 Paso 3: Probar el envío

### 3.1 Reiniciar el servidor
```bash
cd backend
npm run dev
```

### 3.2 Hacer un registro de prueba
```bash
curl -X POST http://localhost:3003/api/registrations \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Usuario",
    "phone": "0987654321",
    "email": "tu-email@gmail.com",
    "sports": ["Correr"]
  }'
```

### 3.3 Verificar
- ✅ Deberías recibir un email con el QR
- ✅ Deberías recibir un WhatsApp con el QR

---

## ⚠️ Limitaciones del Sandbox de Twilio

En modo Sandbox (gratis):
- Solo puedes enviar mensajes a números que hayas verificado
- Cada número debe enviar el mensaje `join [código]` primero
- Aparece un prefijo en los mensajes

Para producción:
1. Necesitas una cuenta de pago
2. Solicitar aprobación de WhatsApp Business
3. Configurar un número dedicado

---

## 🔍 Troubleshooting

### Email no llega
- ✅ Verifica que `RESEND_API_KEY` esté correcta
- ✅ Revisa la consola del servidor para errores
- ✅ Verifica tu carpeta de spam
- ✅ Prueba con otro email

### WhatsApp no llega
- ✅ Verifica que hayas hecho el `join` en el Sandbox
- ✅ Verifica que `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN` estén correctos
- ✅ Verifica que el número de teléfono esté en formato correcto (09XXXXXXXX)
- ✅ Revisa los logs de Twilio: https://console.twilio.com/us1/monitor/logs/sms

### Ver logs en el servidor
El servidor mostrará mensajes como:
```
✅ Email enviado exitosamente
✅ WhatsApp enviado exitosamente
```

O errores si algo falla:
```
⚠️ Resend no configurado
⚠️ Twilio no configurado
```

---

## 💰 Costos

### Resend
- **Gratis:** 3,000 emails/mes
- **Pro:** $20/mes - 50,000 emails

### Twilio
- **Crédito inicial:** $15 gratis
- **WhatsApp:** ~$0.005 por mensaje
- Con $15 puedes enviar ~3,000 mensajes

---

## 🚀 Siguiente paso

Una vez configurado, cada vez que alguien se registre desde el frontend:
1. Se crea el registro en la base de datos
2. Se genera el código QR
3. Se envía automáticamente por email
4. Se envía automáticamente por WhatsApp

¡Todo automático! 🎉
