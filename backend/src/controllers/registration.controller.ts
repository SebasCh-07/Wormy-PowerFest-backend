import { Request, Response } from 'express';
import { RegistrationService } from '../services/registration.service';
import { EmailService } from '../services/email.service';
import { CreateRegistrationDTO } from '../types';

const registrationService = new RegistrationService();
const emailService = new EmailService();

export class RegistrationController {
  async create(req: Request, res: Response) {
    try {
      const data: CreateRegistrationDTO = req.body;

      if (!data.firstName || !data.lastName || !data.email || !data.phone) {
        return res.status(400).json({
          success: false,
          error: 'Todos los campos son requeridos'
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return res.status(400).json({
          success: false,
          error: 'Email inválido'
        });
      }

      const phoneRegex = /^09\d{8}$/;
      if (!phoneRegex.test(data.phone)) {
        return res.status(400).json({
          success: false,
          error: 'El teléfono debe tener 10 dígitos y empezar con 09'
        });
      }

      const validSports = ['Correr', 'Nadar', 'Gimnasio', 'Baile', 'Futbol', 'Basket', 'Ninguno'];
      if (data.sports && data.sports.length > 0) {
        if (!Array.isArray(data.sports)) {
          return res.status(400).json({
            success: false,
            error: 'El campo deportes debe ser un array'
          });
        }

        const invalidSports = data.sports.filter(s => !validSports.includes(s));
        if (invalidSports.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Deportes inválidos seleccionados'
          });
        }
      }

      const existingEmail = await registrationService.getRegistrationByEmail(data.email);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: 'Este email ya está registrado'
        });
      }

      // Validar cédula ecuatoriana si se proporciona
      if (data.cedula) {
        const cedulaRegex = /^\d{10}$/;
        if (!cedulaRegex.test(data.cedula)) {
          return res.status(400).json({
            success: false,
            error: 'La cédula debe tener 10 dígitos'
          });
        }

        // Validación del dígito verificador
        const digits = data.cedula.split('').map(Number);
        const province = parseInt(data.cedula.substring(0, 2));
        
        if (province < 1 || province > 24) {
          return res.status(400).json({
            success: false,
            error: 'Cédula inválida: código de provincia incorrecto'
          });
        }

        const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        let sum = 0;

        for (let i = 0; i < 9; i++) {
          let value = digits[i] * coefficients[i];
          if (value >= 10) value -= 9;
          sum += value;
        }

        const verifier = sum % 10 === 0 ? 0 : 10 - (sum % 10);
        
        if (verifier !== digits[9]) {
          return res.status(400).json({
            success: false,
            error: 'Cédula inválida: dígito verificador incorrecto'
          });
        }

        // Validar que la cédula no esté duplicada
        const existingCedula = await registrationService.getRegistrationByCedula(data.cedula);
        if (existingCedula) {
          return res.status(409).json({
            success: false,
            error: 'Esta cédula ya está registrada'
          });
        }
      }

      // Validar edad si se proporciona
      if (data.edad !== undefined) {
        if (typeof data.edad !== 'number' || data.edad < 5 || data.edad > 120) {
          return res.status(400).json({
            success: false,
            error: 'La edad debe estar entre 5 y 120 años'
          });
        }
      }

      // Validar sector si se proporciona
      if (data.sector && data.sector.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'El sector no puede tener más de 100 caracteres'
        });
      }
      const registration = await registrationService.createRegistration(data);

      // Enviar QR solo por email
      const emailResult = await emailService.sendQREmail(
        registration.email,
        registration.firstName,
        registration.lastName,
        registration.id
      );

      res.status(201).json({
        success: true,
        data: registration,
        notifications: {
          email: emailResult
        }
      });
    } catch (error) {
      console.error('Error creating registration:', error);
      res.status(500).json({
        success: false,
        error: 'Error al crear registro'
      });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const { status, limit, offset } = req.query;
      const registrations = await registrationService.getAllRegistrations(
        status as string,
        limit ? parseInt(limit as string) : undefined,
        offset ? parseInt(offset as string) : undefined
      );

      res.json({
        success: true,
        data: registrations,
        total: registrations.length
      });
    } catch (error) {
      console.error('Error fetching registrations:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener registros'
      });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const registration = await registrationService.getRegistrationById(id);

      if (!registration) {
        return res.status(404).json({
          success: false,
          error: 'Registro no encontrado'
        });
      }

      res.json({
        success: true,
        data: registration
      });
    } catch (error) {
      console.error('Error fetching registration:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener registro'
      });
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      const stats = await registrationService.getStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener estadísticas'
      });
    }
  }

  async resendQR(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const registration = await registrationService.getRegistrationById(id);

      if (!registration) {
        return res.status(404).json({
          success: false,
          error: 'Registro no encontrado'
        });
      }

      // Reenviar solo por email
      const emailResult = await emailService.sendQREmail(
        registration.email,
        registration.firstName,
        registration.lastName,
        registration.id
      );

      res.json({
        success: true,
        message: 'QR reenviado exitosamente',
        notifications: {
          email: emailResult
        }
      });
    } catch (error) {
      console.error('Error resending QR:', error);
      res.status(500).json({
        success: false,
        error: 'Error al reenviar QR'
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { email, phone } = req.body;

      // Validar que al menos uno de los campos esté presente
      if (!email && !phone) {
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar al menos email o phone para actualizar'
        });
      }

      // Validar email si se proporciona
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            success: false,
            error: 'Email inválido'
          });
        }
      }

      // Validar teléfono si se proporciona
      if (phone) {
        const phoneRegex = /^09\d{8}$/;
        if (!phoneRegex.test(phone)) {
          return res.status(400).json({
            success: false,
            error: 'El teléfono debe tener 10 dígitos y empezar con 09'
          });
        }
      }

      // Actualizar registro
      const updated = await registrationService.updateRegistration(id, { email, phone });

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: 'Registro no encontrado'
        });
      }

      // Reenviar QR con los nuevos datos
      const emailResult = await emailService.sendQREmail(
        updated.email,
        updated.firstName,
        updated.lastName,
        updated.id
      );

      res.json({
        success: true,
        data: updated,
        notifications: {
          email: emailResult
        }
      });
    } catch (error) {
      console.error('Error updating registration:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar registro'
      });
    }
  }

  async sendAltEmail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'El email es requerido'
        });
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Email inválido'
        });
      }

      const registration = await registrationService.getRegistrationById(id);

      if (!registration) {
        return res.status(404).json({
          success: false,
          error: 'Registro no encontrado'
        });
      }

      // Enviar a email alternativo
      const emailResult = await emailService.sendQREmail(
        email,
        registration.firstName,
        registration.lastName,
        registration.id
      );

      res.json({
        success: true,
        message: 'QR enviado al correo alternativo exitosamente',
        notification: emailResult
      });
    } catch (error) {
      console.error('Error sending alternative email:', error);
      res.status(500).json({
        success: false,
        error: 'Error al enviar email'
      });
    }
  }

  async searchByCedula(req: Request, res: Response) {
    try {
      const { cedula } = req.query;

      if (!cedula || typeof cedula !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'La cédula es requerida'
        });
      }

      // Validar formato de cédula
      const cedulaRegex = /^\d{10}$/;
      if (!cedulaRegex.test(cedula)) {
        return res.status(400).json({
          success: false,
          error: 'La cédula debe tener 10 dígitos'
        });
      }

      const registration = await registrationService.getRegistrationByCedula(cedula);

      if (!registration) {
        return res.status(404).json({
          success: false,
          error: 'No se encontró ningún registro con esta cédula'
        });
      }

      res.json({
        success: true,
        data: registration
      });
    } catch (error) {
      console.error('Error searching by cedula:', error);
      res.status(500).json({
        success: false,
        error: 'Error al buscar registro'
      });
    }
  }
}
