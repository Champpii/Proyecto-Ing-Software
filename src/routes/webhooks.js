import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const LOG_FILE = path.resolve('src/db/webhook_logs.json');

/**
 * Webhook Receiver Endpoint
 * Accepts transaction success events from mock payment gateways.
 */
router.post('/pasarela-pago', (req, res) => {
  try {
    const payload = req.body;
    console.log('[Webhook Receiver] Incoming webhook notification received!');
    console.log('[Webhook Receiver] Event:', payload.event);
    console.log('[Webhook Receiver] Payload:', JSON.stringify(payload, null, 2));

    // Save webhook execution details to local log
    let existingLogs = [];
    if (fs.existsSync(LOG_FILE)) {
      try {
        existingLogs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
      } catch (e) {}
    }

    existingLogs.unshift({
      id: 'WH-REC-' + Date.now(),
      timestamp: new Date().toISOString(),
      url: '/api/webhooks/pasarela-pago',
      payload,
      status: '200 OK (Recibido y Procesado)'
    });

    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.writeFileSync(LOG_FILE, JSON.stringify(existingLogs, null, 2), 'utf8');

    return res.status(200).json({
      success: true,
      message: 'Notificación de webhook recibida y registrada exitosamente'
    });
  } catch (err) {
    console.error('[Webhook Receiver] Error processing webhook:', err);
    return res.status(500).json({ success: false, message: 'Webhook processing failed.' });
  }
});

export default router;
