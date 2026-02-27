import { Request, Response } from 'express';
import { ScanService } from '../services/scan.service';
import { ValidateQRDTO, ScanQRDTO } from '../types';

const scanService = new ScanService();

export class ScanController {
  async validate(req: Request, res: Response) {
    try {
      const { qr_code, mode }: ValidateQRDTO = req.body;

      if (!qr_code || !mode) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'QR code y mode son requeridos'
          }
        });
      }

      if (!['entrada', 'entrega', 'completo', 'sorteo'].includes(mode)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_MODE',
            message: 'Modo de escaneo no válido'
          }
        });
      }

      const result = await scanService.validateQR(qr_code, mode);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error validating QR:', error);
      
      // Manejar errores específicos
      if (error.message?.includes('no encontrado') || error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'QR_NOT_FOUND',
            message: 'Código QR no encontrado'
          }
        });
      }
      
      if (error.message?.includes('ya fue utilizado') || error.message?.includes('already used')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'QR_ALREADY_USED',
            message: 'Este código QR ya fue utilizado'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'Error al validar código QR'
        }
      });
    }
  }

  async entrada(req: Request, res: Response) {
    try {
      const { qr_code, scanned_at, device_id }: ScanQRDTO = req.body;

      if (!qr_code) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'QR code es requerido'
          }
        });
      }

      const result = await scanService.scanEntrada(qr_code, scanned_at, device_id);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error scanning entrada:', error);
      
      if (error.message?.includes('no encontrado') || error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'QR_NOT_FOUND',
            message: 'Código QR no encontrado'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'Error al procesar entrada'
        }
      });
    }
  }

  async entrega(req: Request, res: Response) {
    try {
      const { qr_code, scanned_at, device_id }: ScanQRDTO = req.body;

      if (!qr_code) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'QR code es requerido'
          }
        });
      }

      const result = await scanService.scanEntrega(qr_code, scanned_at, device_id);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error scanning entrega:', error);
      
      if (error.message?.includes('no encontrado') || error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'QR_NOT_FOUND',
            message: 'Código QR no encontrado'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'Error al procesar entrega'
        }
      });
    }
  }

  async completo(req: Request, res: Response) {
    try {
      const { qr_code, scanned_at, device_id }: ScanQRDTO = req.body;

      if (!qr_code) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'QR code es requerido'
          }
        });
      }

      const result = await scanService.scanCompleto(qr_code, scanned_at, device_id);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error scanning completo:', error);
      
      if (error.message?.includes('no encontrado') || error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'QR_NOT_FOUND',
            message: 'Código QR no encontrado'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'Error al procesar escaneo completo'
        }
      });
    }
  }

  async sorteo(req: Request, res: Response) {
    try {
      const { qr_code, scanned_at, device_id }: ScanQRDTO = req.body;

      if (!qr_code) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'QR code es requerido'
          }
        });
      }

      const result = await scanService.scanSorteo(qr_code, scanned_at, device_id);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error scanning sorteo:', error);
      
      if (error.message?.includes('no encontrado') || error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'QR_NOT_FOUND',
            message: 'Código QR no encontrado'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'Error al procesar sorteo'
        }
      });
    }
  }

  async history(req: Request, res: Response) {
    try {
      const { date, mode, limit } = req.query;
      const result = await scanService.getHistory(
        date as string,
        mode as string,
        limit ? parseInt(limit as string) : 50
      );
      res.json(result);
    } catch (error: any) {
      console.error('Error fetching history:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'Error al obtener historial'
        }
      });
    }
  }

  async stats(req: Request, res: Response) {
    try {
      const { date } = req.query;
      const result = await scanService.getStats(date as string);
      res.json(result);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'Error al obtener estadísticas'
        }
      });
    }
  }
}
