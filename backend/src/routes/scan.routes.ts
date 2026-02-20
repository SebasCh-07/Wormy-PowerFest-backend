import { Router } from 'express';
import { ScanController } from '../controllers/scan.controller';

const router = Router();
const controller = new ScanController();

router.post('/validate', (req, res) => controller.validate(req, res));
router.post('/entrada', (req, res) => controller.entrada(req, res));
router.post('/entrega', (req, res) => controller.entrega(req, res));
router.post('/completo', (req, res) => controller.completo(req, res));
router.post('/sorteo', (req, res) => controller.sorteo(req, res));
router.get('/history', (req, res) => controller.history(req, res));
router.get('/stats', (req, res) => controller.stats(req, res));

export default router;
