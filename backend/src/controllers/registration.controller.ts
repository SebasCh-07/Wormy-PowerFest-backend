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

      if (!data.firstName || !data.lastName || !data.email || !data.phone || !data.sports) {
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

      const validSports = ['Correr', 'Nadar', 'Gimnasio', 'Ninguno'];
      if (!Array.isArray(data.sports) || data.sports.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Debe seleccionar al menos un deporte'
        });
      }

      const invalidSports = data.sports.filter(s => !validSports.includes(s));
      if (invalidSports.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Deportes inválidos seleccionados'
        });
      }

      const existingEmail = await registrationService.getRegistrationByEmail(data.email);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: 'Este email ya está registrado'
        });
      }

      if (data.birthDate) {
        const birthDate = new Date(data.birthDate);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();


        if (isNaN(birthDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Fecha de nacimiento inválida'
          })
        }


        if (age < 5 || age > 120) {
          return res.status(400).json({
            success: false,
            error: 'La edad debe estar entre 5 y 120 años'
          })
        }
      }
      if (data.gender) {
        const validGenders = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
        if (!validGenders.includes(data.gender)) {
          return res.status(400).json({
            success: false,
            error: 'Género inválido'
          });
        }
      }

      if (data.profession && data.profession.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'La profesión no puede tener más de 100 caracteres'
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

  async sendWhatsApp(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          error: 'El teléfono es requerido'
        });
      }

      // Validar teléfono
      const phoneRegex = /^09\d{8}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          error: 'El teléfono debe tener 10 dígitos y empezar con 09'
        });
      }

      const registration = await registrationService.getRegistrationById(id);

      if (!registration) {
        return res.status(404).json({
          success: false,
          error: 'Registro no encontrado'
        });
      }

      // Enviar por WhatsApp
      const whatsappResult = await emailService.sendQRWhatsApp(
        phone,
        registration.firstName,
        registration.id
      );

      res.json({
        success: true,
        message: 'QR enviado por WhatsApp exitosamente',
        notification: whatsappResult
      });
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      res.status(500).json({
        success: false,
        error: 'Error al enviar WhatsApp'
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
}
