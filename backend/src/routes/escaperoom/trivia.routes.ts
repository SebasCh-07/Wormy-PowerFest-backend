import { Router } from 'express';
import { getQuestions, validateAnswers } from './trivia.controller';
import { validateRegistrationTime } from '../../middleware/escaperoom/registrationTimeValidator';

const router = Router();

router.get('/questions', validateRegistrationTime, getQuestions);
router.post('/validate', validateRegistrationTime, validateAnswers);

export default router;
