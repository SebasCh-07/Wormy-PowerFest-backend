import QRCode from 'qrcode';

export const generateQR = async (data: string): Promise<string> => {
  try {
    // Genera QR en formato base64
    const qrImage = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
    });
    return qrImage;
  } catch (error) {
    console.error('Error generando QR:', error);
    throw new Error('No se pudo generar el código QR');
  }
};
