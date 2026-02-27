import { Request, Response } from 'express';
import { RegistrationService } from '../services/registration.service';
import { VerifyTicketDTO } from '../types';

const registrationService = new RegistrationService();

export class VerificationController {
  async verify(req: Request, res: Response) {
    try {
      const { ticketId }: VerifyTicketDTO = req.body;

      if (!ticketId) {
        return res.status(400).json({ 
          success: false,
          error: 'Ticket ID es requerido' 
        });
      }

      const registration = await registrationService.getRegistrationById(ticketId);

      if (!registration) {
        return res.status(404).json({ 
          success: false,
          status: 'not_found',
          message: 'Ticket no encontrado' 
        });
      }

      if (registration.status === 'CHECKED_IN') {
        return res.json({
          success: true,
          status: 'already_used',
          message: 'Este ticket ya fue usado',
          data: {
            id: registration.id,
            firstName: registration.firstName,
            lastName: registration.lastName,
            checkInTime: registration.checkInTime,
            status: registration.status
          }
        });
      }

      const updatedRegistration = await registrationService.checkIn(ticketId);

      res.json({
        success: true,
        status: 'success',
        message: 'Check-in exitoso',
        data: {
          id: updatedRegistration.id,
          firstName: updatedRegistration.firstName,
          lastName: updatedRegistration.lastName,
          phone: updatedRegistration.phone,
          email: updatedRegistration.email,
          sports: updatedRegistration.sports,
          status: updatedRegistration.status,
          checkInTime: updatedRegistration.checkInTime,
          registrationDate: updatedRegistration.registrationDate
        }
      });
    } catch (error: any) {
      console.error('Error verifying ticket:', error);
      
      if (error.message?.includes('no encontrado') || error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Ticket no encontrado'
        });
      }
      
      res.status(500).json({ 
        success: false,
        error: error.message || 'Error al verificar ticket' 
      });
    }
  }
}
