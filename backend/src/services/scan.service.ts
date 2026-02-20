import { PrismaClient } from '@prisma/client';
import { ScanMode } from '../types';

const prisma = new PrismaClient();

export class ScanService {
  async validateQR(qr_code: string, mode: ScanMode) {
    const registration = await prisma.registration.findUnique({
      where: { id: qr_code },
    });

    if (!registration) {
      return {
        success: false,
        error: {
          code: 'INVALID_QR',
          message: 'Código QR no válido o no existe'
        }
      };
    }

    const canScan = this.canScanMode(registration, mode);

    const eligible_for_sorteo =
      registration.entradaScanned === true &&
      registration.entregaScanned === true &&
      registration.sorteoScanned === false;

    return {
      success: true,
      data: {
        participant_id: registration.id,
        name: `${registration.firstName} ${registration.lastName}`,
        email: registration.email,
        registration_date: registration.registrationDate,
        status: {
          entrada: registration.entradaScanned,
          entrega: registration.entregaScanned,
          completo: registration.completoScanned,
          sorteo: registration.sorteoScanned
        },
        can_scan: canScan.can,
        eligible_for_sorteo: eligible_for_sorteo,
        message: canScan.message
      }
    };
  }

  async scanEntrada(qr_code: string, scanned_at?: string, device_id?: string) {
    const registration = await prisma.registration.findUnique({
      where: { id: qr_code },
    });

    if (!registration) {
      return {
        success: false,
        error: {
          code: 'INVALID_QR',
          message: 'Código QR no válido'
        }
      };
    }

    if (registration.entradaScanned) {
      return {
        success: false,
        error: {
          code: 'ALREADY_ENTERED',
          message: 'El participante ya registró su entrada'
        }
      };
    }

    const updated = await prisma.registration.update({
      where: { id: qr_code },
      data: {
        entradaScanned: true,
        entradaTime: scanned_at ? new Date(scanned_at) : new Date(),
        status: 'CHECKED_IN',
        checkInTime: scanned_at ? new Date(scanned_at) : new Date()
      }
    });

    return {
      success: true,
      data: {
        scan_id: `scan-${Date.now()}`,
        participant_id: updated.id,
        name: `${updated.firstName} ${updated.lastName}`,
        mode: 'entrada',
        timestamp: updated.entradaTime,
        message: 'Entrada registrada exitosamente'
      }
    };
  }

  async scanEntrega(qr_code: string, scanned_at?: string, device_id?: string) {
    const registration = await prisma.registration.findUnique({
      where: { id: qr_code },
    });

    if (!registration) {
      return {
        success: false,
        error: {
          code: 'INVALID_QR',
          message: 'Código QR no válido'
        }
      };
    }

    if (!registration.entradaScanned) {
      return {
        success: false,
        error: {
          code: 'NOT_ENTERED',
          message: 'El participante debe registrar entrada primero'
        }
      };
    }

    if (registration.entregaScanned) {
      return {
        success: false,
        error: {
          code: 'ALREADY_SCANNED',
          message: 'El pasaporte ya fue entregado'
        }
      };
    }

    const updated = await prisma.registration.update({
      where: { id: qr_code },
      data: {
        entregaScanned: true,
        entregaTime: scanned_at ? new Date(scanned_at) : new Date()
      }
    });

    return {
      success: true,
      data: {
        scan_id: `scan-${Date.now()}`,
        participant_id: updated.id,
        name: `${updated.firstName} ${updated.lastName}`,
        mode: 'entrega',
        timestamp: updated.entregaTime,
        message: 'Entrega de pasaporte registrada'
      }
    };
  }

  async scanCompleto(qr_code: string, scanned_at?: string, device_id?: string) {
    const registration = await prisma.registration.findUnique({
      where: { id: qr_code },
    });

    if (!registration) {
      return {
        success: false,
        error: {
          code: 'INVALID_QR',
          message: 'Código QR no válido'
        }
      };
    }

    if (!registration.entregaScanned) {
      return {
        success: false,
        error: {
          code: 'PASSPORT_NOT_DELIVERED',
          message: 'El pasaporte debe ser entregado primero'
        }
      };
    }

    if (registration.completoScanned) {
      return {
        success: false,
        error: {
          code: 'ALREADY_SCANNED',
          message: 'El pasaporte ya fue marcado como completo'
        }
      };
    }

    const updated = await prisma.registration.update({
      where: { id: qr_code },
      data: {
        completoScanned: true,
        completoTime: scanned_at ? new Date(scanned_at) : new Date()
      }
    });

    return {
      success: true,
      data: {
        scan_id: `scan-${Date.now()}`,
        participant_id: updated.id,
        name: `${updated.firstName} ${updated.lastName}`,
        mode: 'completo',
        timestamp: updated.completoTime,
        message: 'Pasaporte completado exitosamente'
      }
    };
  }

  async scanSorteo(qr_code: string, scanned_at?: string, device_id?: string) {
    const registration = await prisma.registration.findUnique({
      where: { id: qr_code },
    });

    if (!registration) {
      return {
        success: false,
        error: {
          code: 'INVALID_QR',
          message: 'Código QR no válido'
        }
      };
    }

    // Validación 1: Debe tener entrada registrada
    if (!registration.entradaScanned) {
      return {
        success: false,
        error: {
          code: 'NOT_ENTERED',
          message: 'El participante debe registrar entrada primero'
        }
      };
    }

    // Validación 2: Debe tener pasaporte entregado
    if (!registration.entregaScanned) {
      return {
        success: false,
        error: {
          code: 'PASSPORT_NOT_DELIVERED',
          message: 'El participante debe recoger su pasaporte primero'
        }
      };
    }

    // Validación 3: No debe haber participado antes
    if (registration.sorteoScanned) {
      return {
        success: false,
        error: {
          code: 'ALREADY_PARTICIPATED',
          message: 'El participante ya está participando en el sorteo'
        }
      };
    }

    // Actualizar registro
    const updated = await prisma.registration.update({
      where: { id: qr_code },
      data: {
        sorteoScanned: true,
        sorteoTime: scanned_at ? new Date(scanned_at) : new Date()
      }
    });

    return {
      success: true,
      data: {
        scan_id: `scan-${Date.now()}`,
        participant_id: updated.id,
        name: `${updated.firstName} ${updated.lastName}`,
        mode: 'sorteo',
        timestamp: updated.sorteoTime,
        message: 'Participación en sorteo registrada exitosamente'
      }
    };
  }

  async getHistory(date?: string, mode?: string, limit: number = 50) {
    const where: any = {};

    if (mode === 'entrada') {
      where.entradaScanned = true;
    } else if (mode === 'entrega') {
      where.entregaScanned = true;
    } else if (mode === 'completo') {
      where.completoScanned = true;
    } else if (mode === 'sorteo') {
      where.sorteoScanned = true;
    }

    const registrations = await prisma.registration.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: 'desc' }
    });

    const scans = registrations.map(reg => {
      let timestamp = reg.updatedAt;
      if (mode === 'entrada' && reg.entradaTime) timestamp = reg.entradaTime;
      if (mode === 'entrega' && reg.entregaTime) timestamp = reg.entregaTime;
      if (mode === 'completo' && reg.completoTime) timestamp = reg.completoTime;
      if (mode === 'sorteo' && reg.sorteoTime) timestamp = reg.sorteoTime;

      return {
        scan_id: `scan-${reg.id}`,
        participant_id: reg.id,
        name: `${reg.firstName} ${reg.lastName}`,
        mode: mode || 'entrada',
        timestamp,
        status: 'valid'
      };
    });

    return {
      success: true,
      data: {
        total: scans.length,
        scans
      }
    };
  }

  async getStats(date?: string) {
    const [entrada, entrega, completo, sorteo, total] = await Promise.all([
      prisma.registration.count({ where: { entradaScanned: true } }),
      prisma.registration.count({ where: { entregaScanned: true } }),
      prisma.registration.count({ where: { completoScanned: true } }),
      prisma.registration.count({ where: { sorteoScanned: true } }),
      prisma.registration.count()
    ]);

    const totalScans = entrada + entrega + completo + sorteo;

    return {
      success: true,
      data: {
        date: date || new Date().toISOString().split('T')[0],
        total_scans: totalScans,
        by_mode: {
          entrada,
          entrega,
          completo,
          sorteo
        },
        valid_scans: totalScans,
        invalid_scans: 0,
        sorteo_participants: sorteo,
        last_updated: new Date().toISOString()
      }
    };
  }

  private canScanMode(registration: any, mode: ScanMode) {
    if (mode === 'entrada') {
      if (registration.entradaScanned) {
        return { can: false, message: 'Ya se registró la entrada' };
      }
      return { can: true, message: 'Puede registrar entrada' };
    }

    if (mode === 'entrega') {
      if (!registration.entradaScanned) {
        return { can: false, message: 'Debe registrar entrada primero' };
      }
      if (registration.entregaScanned) {
        return { can: false, message: 'El pasaporte ya fue entregado' };
      }
      return { can: true, message: 'Puede entregar pasaporte' };
    }

    if (mode === 'completo') {
      if (!registration.entregaScanned) {
        return { can: false, message: 'Debe entregar pasaporte primero' };
      }
      if (registration.completoScanned) {
        return { can: false, message: 'El pasaporte ya está completo' };
      }
      return { can: true, message: 'Puede marcar como completo' };
    }

    if (mode === 'sorteo') {
      if (!registration.entradaScanned) {
        return { can: false, message: 'Debe registrar entrada primero' };
      }
      if (!registration.entregaScanned) {
        return { can: false, message: 'Debe recoger su pasaporte primero' };
      }
      if (registration.sorteoScanned) {
        return { can: false, message: 'Ya está participando en el sorteo' };
      }
      return { can: true, message: 'Puede registrar participación en sorteo' };
    }

    return { can: false, message: 'Modo inválido' };
  }
}
