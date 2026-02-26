import { Response } from 'express';
import { ApiResponse } from '../types/index';

export const success = <T>(res: Response, data: T, statusCode = 200) => {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  return res.status(statusCode).json(response);
};

export const error = (res: Response, message: string, statusCode = 400) => {
  const response: ApiResponse<never> = {
    success: false,
    error: message,
  };
  return res.status(statusCode).json(response);
};
