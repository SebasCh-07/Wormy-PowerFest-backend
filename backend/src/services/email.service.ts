import QRCode from 'qrcode';

export class EmailService {
  async sendQREmail(email: string, firstName: string, lastName: string, ticketId: string) {
    try {
      console.log('📧 Intentando enviar email a:', email);
      console.log('🔑 RESEND_API_KEY configurado:', !!process.env.RESEND_API_KEY);
      
      // Generar QR como imagen base64
      const qrCodeDataURL = await QRCode.toDataURL(ticketId, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Extraer solo el base64 sin el prefijo "data:image/png;base64,"
      const base64Data = qrCodeDataURL.split(',')[1];

      // Si tienes Resend configurado
      if (process.env.RESEND_API_KEY) {
        console.log('✅ Resend configurado, enviando email...');
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
            to: email,
            subject: '🎟️ Tu entrada para Wormy PowerFest',
            html: `
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
                  <h1 class="header">¡Hola ${firstName}! 🐛</h1>
                  <p>Tu registro para <strong>Wormy PowerFest</strong> ha sido confirmado.</p>
                  
                  <div class="qr-container">
                    <h2>Tu Código QR</h2>
                    <img src="cid:qrcode" alt="QR Code" class="qr-code"/>
                    <p class="ticket-id">ID: ${ticketId}</p>
                  </div>
                  
                  <p>Presenta este código QR en la entrada del evento.</p>
                  
                  <div class="footer">
                    <p>Wormy PowerFest - El evento deportivo más divertido del año</p>
                    <p>Si tienes alguna pregunta, responde a este email.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
            attachments: [
              {
                filename: 'qr-code.png',
                content: base64Data,
                content_id: 'qrcode'
              }
            ]
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          console.log('✅ Email enviado exitosamente. ID:', data.id);
          return { sent: true, messageId: data.id };
        } else {
          const errorText = await response.text();
          console.error('❌ Error sending email with Resend:', errorText);
          return { sent: false, error: 'Error al enviar email' };
        }
      }

      // Fallback: Si no hay Resend, usar SMTP con nodemailer
      console.log('⚠️ Resend no configurado. Configura RESEND_API_KEY en .env');
      return { sent: false, error: 'Email service no configurado' };
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return { sent: false, error: 'Error al enviar email' };
    }
  }

  async sendQRWhatsApp(phone: string, firstName: string, ticketId: string) {
    try {
      console.log('📱 Intentando enviar WhatsApp a:', phone);
      console.log('🔑 TWILIO configurado:', !!process.env.TWILIO_ACCOUNT_SID);

      // Si tienes Twilio configurado
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
        
        // Formatear número de teléfono (asumiendo formato Ecuador 09XXXXXXXX -> +593XXXXXXXXX)
        let formattedPhone = phone;
        if (phone.startsWith('09')) {
          formattedPhone = '+593' + phone.substring(1);
        }
        const to = `whatsapp:${formattedPhone}`;

        const message = `🎟️ *¡Hola ${firstName}!*

Tu registro para *Wormy PowerFest* ha sido confirmado exitosamente.

🆔 *ID de Ticket:* ${ticketId}

📧 Revisa tu email para ver tu código QR.

📱 Presenta tu código QR en la entrada del evento.

¡Nos vemos pronto! 🐛💪`;

        console.log('📤 Enviando WhatsApp a:', to);

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: from,
              To: to,
              Body: message,
            }),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          console.log('✅ WhatsApp enviado exitosamente. SID:', data.sid);
          return { sent: true, messageId: data.sid };
        } else {
          const error = await response.text();
          console.error('❌ Error sending WhatsApp with Twilio:', error);
          return { sent: false, error: 'Error al enviar WhatsApp' };
        }
      }

      // Fallback: Si no hay Twilio configurado
      console.log('⚠️ Twilio no configurado. Configura TWILIO_* en .env');
      return { sent: false, error: 'WhatsApp service no configurado' };
    } catch (error) {
      console.error('❌ Error sending WhatsApp:', error);
      return { sent: false, error: 'Error al enviar WhatsApp' };
    }
  }
}
