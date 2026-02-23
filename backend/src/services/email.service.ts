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

      // Extraer solo el base64 sin el prefijo para el attachment
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
            subject: '🎟️ Tu entrada para Warmi PowerFest',
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
                  <p>Tu registro para <strong>Warmi PowerFest</strong> ha sido confirmado.</p>
                  
                  <div class="qr-container">
                    <h2>Tu Código QR</h2>
                    <img src="cid:qrcode" alt="QR Code" class="qr-code"/>
                    <p class="ticket-id">ID: ${ticketId}</p>
                  </div>
                  
                  <p>Presenta este código QR en la entrada del evento.</p>
                  
                  <div class="footer">
                    <p>Warmi PowerFest - El evento deportivo más divertido del año</p>
                  </div>
                </div>
              </body>
              </html>
            `,
            attachments: [
              {
                filename: 'qr-code.png',
                content: base64Data,
                content_type: 'image/png',
                disposition: 'inline',
                content_id: '<qrcode>'
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

}
