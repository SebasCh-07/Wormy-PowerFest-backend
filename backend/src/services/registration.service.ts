import { PrismaClient, Status } from '@prisma/client';
import { CreateRegistrationDTO } from '../types';

const prisma = new PrismaClient();

export class RegistrationService {
  async createRegistration(data: CreateRegistrationDTO) {
    return await prisma.registration.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        sports: data.sports,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        gender: data.gender || null,
        profession: data.profession || null,
      },
    });
  }

  async getAllRegistrations(status?: string, limit?: number, offset?: number) {
    const where = status ? { status: status as Status } : {};

    return await prisma.registration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getRegistrationById(id: string) {
    return await prisma.registration.findUnique({
      where: { id },
    });
  }

  async getRegistrationByEmail(email: string) {
    return await prisma.registration.findFirst({
      where: { email },
    });
  }

  async updateRegistration(id: string, data: { email?: string; phone?: string }) {
    try {
      return await prisma.registration.update({
        where: { id },
        data: {
          ...(data.email && { email: data.email }),
          ...(data.phone && { phone: data.phone }),
        },
      });
    } catch (error) {
      return null;
    }
  }

  async checkIn(id: string) {
    return await prisma.registration.update({
      where: { id },
      data: {
        status: Status.CHECKED_IN,
        checkInTime: new Date(),
      },
    });
  }

  async getStats() {
    const [total, checkedIn, pending, noShow, allRegistrations, recentScans] = await Promise.all([
      prisma.registration.count(),
      prisma.registration.count({ where: { status: Status.CHECKED_IN } }),
      prisma.registration.count({ where: { status: Status.PENDING } }),
      prisma.registration.count({ where: { status: Status.NO_SHOW } }),
      prisma.registration.findMany({ select: { sports: true } }),
      prisma.registration.findMany({
        where: { status: Status.CHECKED_IN },
        orderBy: { checkInTime: 'desc' },
        take: 10,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          checkInTime: true,
          sports: true,
        },
      }),
    ]);

    const sportCounts = new Map<string, number>();
    let totalSportsCount = 0;

    allRegistrations.forEach(reg => {
      reg.sports.forEach(sport => {
        sportCounts.set(sport, (sportCounts.get(sport) || 0) + 1);
        totalSportsCount++;
      });
    });

    const sportBreakdown: Record<string, number> = {
      'Correr': sportCounts.get('Correr') || 0,
      'Nadar': sportCounts.get('Nadar') || 0,
      'Gimnasio': sportCounts.get('Gimnasio') || 0,
      'Ninguno': sportCounts.get('Ninguno') || 0,
    };

    return {
      total,
      checkedIn,
      pending,
      noShow,
      sportsCount: totalSportsCount,
      sportBreakdown,
      recentScans,
    };
  }
}
