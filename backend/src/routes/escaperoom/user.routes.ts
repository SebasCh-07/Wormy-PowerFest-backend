import { Router } from 'express';
import { registerUser, registerMultipleUsers, searchUserByEmail } from './user.controller';
import { validate } from '../../middleware/escaperoom/validation';
import { createUserSchema } from './user.validator';
import { validateRegistrationTime } from '../../middleware/escaperoom/registrationTimeValidator';

const router = Router();

// BLOQUEADO: Solo se permite registro de 2 personas
// router.post('/register', validateRegistrationTime, validate(createUserSchema), registerUser);
router.post('/register-multiple', validateRegistrationTime, registerMultipleUsers);
router.get('/search', validateRegistrationTime, searchUserByEmail);

export default router;
