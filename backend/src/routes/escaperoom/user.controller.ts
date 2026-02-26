import { Request, Response } from 'express';
import { UserService } from './user.service';
import { success } from '../../services/escaperoom/utils/response';
import { asyncHandler } from '../../middleware/escaperoom/asyncHandler';

const userService = new UserService();

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body);
  return success(res, user, 201);
});

export const registerMultipleUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await userService.createMultipleUsers(req.body);
  return success(res, users, 201);
});

export const searchUserByEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.query;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Email es requerido',
    });
  }

  const user = await userService.getUserByEmail(email);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'Usuario no encontrado',
    });
  }

  return success(res, user);
});
