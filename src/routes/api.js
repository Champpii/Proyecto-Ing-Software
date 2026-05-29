import express from 'express';
import { authController } from '../controllers/authController.js';
import { marbeteController } from '../controllers/marbeteController.js';
import { paymentController } from '../controllers/paymentController.js';
import { jsonDb } from '../db/jsonDb.js';
import fs from 'fs';

const router = express.Router();

// Authentication
router.post('/auth/login', authController.login);

// Payments & Purchases
router.post('/marbetes/pago', paymentController.procesarPago);

// Inquiries
router.get('/marbetes/consulta/:placa', marbeteController.consultarPorPlaca);

// Verification (Public, used by QR Code)
router.get('/marbetes/verificar/:token', marbeteController.verificarToken);

// Notifications (Inspection drawer for demo)
router.get('/notifications/emails', marbeteController.obtenerNotificaciones);

// Webhook simulation inspector route (Allows the frontend to show webhook history)
router.get('/notifications/webhooks', (req, res) => {
  try {
    const LOG_FILE = 'src/db/webhook_logs.json';
    if (!fs.existsSync(LOG_FILE)) return res.json({ success: true, webhooks: [] });
    const data = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    return res.json({ success: true, webhooks: data });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Error reading webhooks log.' });
  }
});

// Database reset endpoint (For demo usability)
router.post('/db/reset', (req, res) => {
  try {
    jsonDb.reset();
    // Also delete notification files if they exist to keep it clean
    if (fs.existsSync('src/db/sent_emails.json')) fs.unlinkSync('src/db/sent_emails.json');
    if (fs.existsSync('src/db/webhook_logs.json')) fs.unlinkSync('src/db/webhook_logs.json');
    
    return res.json({ success: true, message: 'Base de datos reiniciada con éxito.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al reiniciar base de datos.' });
  }
});

export default router;
