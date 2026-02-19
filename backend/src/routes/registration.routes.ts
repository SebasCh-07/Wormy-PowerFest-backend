import { Router } from 'express';
import { RegistrationController } from '../controllers/registration.controller';

const router = Router();
const controller = new RegistrationController();

router.post('/', (req, res) => controller.create(req, res));
router.get('/', (req, res) => controller.getAll(req, res));
router.get('/:id', (req, res) => controller.getById(req, res));
router.patch('/:id', (req, res) => controller.update(req, res));
router.post('/:id/resend', (req, res) => controller.resendQR(req, res));
router.post('/:id/send-whatsapp', (req, res) => controller.sendWhatsApp(req, res));
router.post('/:id/send-alt-email', (req, res) => controller.sendAltEmail(req, res));

export default router;
