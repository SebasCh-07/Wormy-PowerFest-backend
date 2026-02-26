import { Request, Response } from 'express';
import { TriviaService } from './trivia.service';
import { asyncHandler } from '../../middleware/escaperoom/asyncHandler';
import { success } from '../../services/escaperoom/utils/response';

const triviaService = new TriviaService();

export const getQuestions = asyncHandler(async (req: Request, res: Response) => {
  const questions = await triviaService.getQuestions();
  return success(res, questions);
});

export const validateAnswers = asyncHandler(async (req: Request, res: Response) => {
  const result = await triviaService.validateAnswers(req.body);
  return success(res, result);
});
