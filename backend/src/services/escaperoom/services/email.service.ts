import QRCode from 'qrcode';

export const sendReservationEmail = async (
  to: string,
  reservation: any,
  qrCode: string
) => {
  const { user, timeslot } = reservation;
  
  try {
    console.log('📧 Intentando enviar email a:', to);
    console.log('🔑 ESCAPEROOM_RESEND_API_KEY configurado:', !!process.env.ESCAPEROOM_RESEND_API_KEY);
    console.log('🔑 API Key (primeros 10 chars):', process.env.ESCAPEROOM_RESEND_API_KEY?.substring(0, 10));
    console.log('📨 FROM_EMAIL:', process.env.ESCAPEROOM_FROM_EMAIL);

    // Generar QR como imagen base64
    const qrCodeDataURL = await QRCode.toDataURL(qrCode, {
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
    if (process.env.ESCAPEROOM_RESEND_API_KEY) {
      console.log('✅ Resend configurado, enviando email...');
      
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.ESCAPEROOM_RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.ESCAPEROOM_FROM_EMAIL || 'Escape Room <info@krakedev.com>',
          to: to,
          subject: '🎉 Confirmación de Reserva - Escape Room',
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; 
                    padding: 30px 20px; 
                    text-align: center; 
                    border-radius: 10px 10px 0 0; 
                  }
                  .header h1 { margin: 0; font-size: 28px; }
                  .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                  .info-box { 
                    background: white; 
                    padding: 25px; 
                    border-radius: 8px; 
                    margin: 20px 0;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  }
                  .info-box h2 { margin-top: 0; color: #667eea; font-size: 20px; }
                  .qr-container { 
                    background: white;
                    padding: 30px; 
                    border-radius: 10px; 
                    text-align: center; 
                    margin: 20px 0;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  }
                  .qr-code { max-width: 300px; border: 3px solid #667eea; border-radius: 8px; }
                  .qr-id { 
                    font-family: monospace; 
                    color: #666; 
                    font-size: 12px;
                    margin-top: 10px;
                    word-break: break-all;
                  }
                  .warning-box {
                    background: #fef3c7; 
                    padding: 15px; 
                    border-left: 4px solid #f59e0b; 
                    border-radius: 4px;
                    margin: 20px 0;
                  }
                  .footer { 
                    text-align: center; 
                    margin-top: 30px; 
                    color: #6b7280; 
                    font-size: 12px;
                    border-top: 1px solid #ddd;
                    padding-top: 20px;
                  }
                  .detail-row { margin: 10px 0; }
                  .detail-label { font-weight: bold; color: #667eea; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🎉 ¡Reserva Confirmada!</h1>
                  </div>
                  <div class="content">
                    <p>Hola <strong>${user.firstName} ${user.lastName}</strong>,</p>
                    <p>Tu reserva para el <strong>Escape Room</strong> ha sido confirmada exitosamente.</p>
                    
                    <div class="info-box">
                      <h2>📅 Detalles de tu Reserva</h2>
                      <div class="detail-row">
                        <span class="detail-label">Fecha:</span> 
                        ${new Date(timeslot.date).toLocaleDateString('es-ES', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Horario:</span> 
                        ${timeslot.startTime} - ${timeslot.endTime}
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Duración:</span> 
                        15 minutos
                      </div>
                    </div>

                    <div class="qr-container">
                      <h2 style="color: #667eea; margin-top: 0;">Tu Código QR</h2>
                      <img src="cid:qrcode" alt="Código QR de Reserva" class="qr-code"/>
                      <p class="qr-id">ID: ${qrCode}</p>
                      <p style="margin-top: 15px; color: #666;">Presenta este código en la entrada del evento</p>
                    </div>

                    <div class="warning-box">
                      <strong>⚠️ Importante:</strong>
                      <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Este código QR es de un solo uso</li>
                        <li>Guarda este email para presentarlo en la entrada</li>
                      </ul>
                    </div>

                    <div class="footer">
                      <p style="font-size: 14px; margin-bottom: 10px;">¡Nos vemos pronto en el Escape Room! 🔐</p>
                      <p style="color: #9ca3af;">
                        Expo Educativa 2026 | 27-28 Feb y 1 Mar
                      </p>
                    </div>
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
        console.error('❌ Error enviando email con Resend:', errorText);
        return { sent: false, error: 'Error al enviar email' };
      }
    }

    // Fallback: Si no hay Resend configurado
    console.log('⚠️ Resend no configurado. Configura RESEND_API_KEY en .env');
    return { sent: false, error: 'Servicio de email no configurado' };

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    return { sent: false, error: 'Error al enviar email' };
  }
};
