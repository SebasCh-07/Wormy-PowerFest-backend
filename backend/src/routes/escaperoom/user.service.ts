import { prismaEscapeRoom as prisma } from '../../services/escaperoom/prisma';
import { CreateUserDto } from './user.types';
import { ConflictError, BadRequestError } from '../../services/escaperoom/utils/errors';
import { getEcuadorTime } from '../../services/escaperoom/utils/dateHelpers';

export class UserService {
  async createUser(data: CreateUserDto) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError('El email ya está registrado');
    }

    return await prisma.user.create({
      data: {
        ...data,
        createdAt: getEcuadorTime(),
      },
    });
  }

  async createMultipleUsers(data: { users: CreateUserDto[] }) {
    const { users } = data;

    if (!users || users.length !== 2) {
      throw new BadRequestError('Debes registrar exactamente 2 personas');
    }

    // Validar que los emails sean diferentes
    if (users[0].email === users[1].email) {
      throw new BadRequestError('Los emails deben ser diferentes');
    }

    // Verificar que ningún email esté registrado Y que no tengan partnerId previo
    const existingUsers = await prisma.user.findMany({
      where: {
        email: {
          in: [users[0].email, users[1].email]
        }
      }
    });

    if (existingUsers.length > 0) {
      // Verificar si alguno ya tiene partner (ya participó)
      const usersWithPartner = existingUsers.filter(u => u.partnerId !== null);
      if (usersWithPartner.length > 0) {
        const participatedEmails = usersWithPartner.map(u => u.email).join(', ');
        throw new ConflictError(`No se puede registrar el grupo. Los siguientes emails ya participaron en otro grupo: ${participatedEmails}. Cada persona solo puede participar una vez.`);
      }

      const existingEmails = existingUsers.map(u => u.email).join(', ');
      throw new ConflictError(`No se puede completar el registro. Los siguientes emails ya están registrados en el sistema: ${existingEmails}. Por favor, verifica los datos ingresados.`);
    }

    // Crear ambos usuarios en una transacción y vincularlos como partners
    const createdUsers = await prisma.$transaction(async (tx) => {
      // Crear primer usuario
      const user1 = await tx.user.create({
        data: {
          ...users[0],
          createdAt: getEcuadorTime(),
        },
      });

      // Crear segundo usuario vinculado al primero
      const user2 = await tx.user.create({
        data: {
          ...users[1],
          createdAt: getEcuadorTime(),
          partnerId: user1.id, // Vincular al primer usuario
        },
      });

      // Actualizar primer usuario con el partnerId del segundo
      const updatedUser1 = await tx.user.update({
        where: { id: user1.id },
        data: { partnerId: user2.id },
      });

      return [updatedUser1, user2];
    });

    return createdUsers;
  }

  async getUserById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  async getUserByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        whatsapp: true,
        triviaCompleted: true,
        createdAt: true,
        partnerId: true,
        partner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            whatsapp: true,
            triviaCompleted: true,
          }
        },
        reservations: {
          select: {
            id: true,
            qrCode: true,
            status: true,
            timeslotId: true,
          },
          where: {
            status: {
              not: 'CANCELLED'
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        },
      },
    });
  }
}
