import { jsonDb } from '../db/jsonDb.js';
import { pricingService } from '../services/pricingService.js';
import { qrService } from '../services/qrService.js';
import { notificationService } from '../services/notificationService.js';

export const paymentController = {
  /**
   * Process a complete marbete purchase
   */
  procesarPago: async (req, res) => {
    try {
      const {
        nombre,
        cui,
        email,
        telefono,
        rol,
        placa,
        tipo_placa,
        marca,
        modelo,
        anio,
        color,
        tipo_marbete,
        plan,
        tarjeta_numero // only for simulation
      } = req.body;

      // Basic validations
      if (!nombre || !email || !rol || !placa || !tipo_placa || !tipo_marbete || !plan) {
        return res.status(400).json({ 
          success: false, 
          message: 'Faltan campos obligatorios para procesar el registro y pago.' 
        });
      }

      const formattedPlaca = placa.trim().toUpperCase();

      // 1. Calculate Cost and Validity Dates
      const cost = pricingService.calculateCost(tipo_marbete, plan);
      const { emissionDate, expiryDate } = pricingService.calculateValidityDates(plan);
      const { estado, diasRestantes } = pricingService.getStatusAndDaysRemaining(expiryDate);

      // 2. Handle Owner (User) upsert
      let owner = jsonDb.findOne('users', u => u.cui === cui || u.email === email);
      if (!owner) {
        owner = jsonDb.insert('users', {
          nombre,
          cui: cui || 'N/A',
          rol,
          email,
          telefono: telefono || 'N/A'
        });
      } else {
        // Update details if owner already exists
        owner = jsonDb.update('users', u => u.id === owner.id, {
          nombre,
          rol,
          telefono: telefono || owner.telefono
        });
      }

      // 3. Handle Vehicle upsert
      let vehicle = jsonDb.findOne('vehicles', v => v.placa === formattedPlaca);
      if (!vehicle) {
        vehicle = jsonDb.insert('vehicles', {
          placa: formattedPlaca,
          tipo_placa,
          marca: marca || 'N/A',
          modelo: modelo || 'N/A',
          anio: parseInt(anio) || new Date().getFullYear(),
          color: color || 'N/A',
          usuario_id: owner.id
        });
      } else {
        // Transfer ownership or update vehicle details
        vehicle = jsonDb.update('vehicles', v => v.placa === formattedPlaca, {
          tipo_placa,
          marca: marca || vehicle.marca,
          modelo: modelo || vehicle.modelo,
          color: color || vehicle.color,
          usuario_id: owner.id
        });
      }

      // 4. Handle Marbete creation/renewal
      let marbete = jsonDb.findOne('marbetes', m => m.placa === formattedPlaca);
      const token = 'tok_' + Math.random().toString(36).substring(2, 15);
      const mrbCode = `MRB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const marbeteData = {
        placa: formattedPlaca,
        codigo_marbete: mrbCode,
        tipo_marbete,
        plan,
        fecha_emision: emissionDate.toISOString().split('T')[0],
        fecha_caducidad: expiryDate.toISOString().split('T')[0],
        token_verificacion: token
      };

      if (!marbete) {
        marbete = jsonDb.insert('marbetes', marbeteData);
      } else {
        // If it exists, overwrite/renew
        marbete = jsonDb.update('marbetes', m => m.id === marbete.id, marbeteData);
      }

      // 5. Register Payment
      const txnId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);
      const payment = jsonDb.insert('payments', {
        marbete_id: marbete.id,
        fecha_pago: new Date().toISOString().split('T')[0],
        monto: cost,
        plan_tipo: plan,
        transaccion_id: txnId,
        estado_pago: 'Completado'
      });

      // 6. Record Initial Access Log for verification audit trail
      jsonDb.insert('access_logs', {
        placa: formattedPlaca,
        fecha_acceso: new Date().toISOString(),
        garita: 'Sistema de Registro',
        estado_acceso: 'Autorizado',
        detalle: `Pago inicial registrado con éxito. Código: ${mrbCode}`
      });

      // 7. Generate Verification QR code
      const protocol = req.protocol;
      const host = req.get('host');
      const verificationUrl = `${protocol}://${host}/verificar.html?token=${token}`;
      const qrDataURI = await qrService.generateDataURI(verificationUrl);

      // 8. Trigger Simulated Email Notification (async)
      const emailBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1e3a8a; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 20px;">Comprobante de Pago de Marbete</h1>
            <p style="margin: 4px 0 0 0; opacity: 0.8;">Universidad - Control de Acceso Vehicular</p>
          </div>
          <div style="padding: 24px;">
            <p>Estimado(a) <strong>${nombre}</strong>,</p>
            <p>Le confirmamos que hemos procesado exitosamente el pago para el marbete de su vehículo.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 6px 0; color: #64748b;">Código de Marbete:</td><td style="padding: 6px 0; font-weight: bold; text-align: right;">${mrbCode}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Placa del Vehículo:</td><td style="padding: 6px 0; font-weight: bold; text-align: right; font-family: monospace;">${formattedPlaca}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Vehículo:</td><td style="padding: 6px 0; text-align: right;">${marca} ${modelo} (${color})</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Plan Contratado:</td><td style="padding: 6px 0; text-align: right;">${plan === 'anual' ? 'Anual' : 'Mensual'}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Total Pagado:</td><td style="padding: 6px 0; font-weight: bold; color: #2563eb; text-align: right;">Q${cost}.00</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Vigencia:</td><td style="padding: 6px 0; text-align: right; font-size: 12px;">${marbeteData.fecha_emision} al ${marbeteData.fecha_caducidad}</td></tr>
              </table>
            </div>

            <div style="text-align: center; margin: 24px 0;">
              <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;">Código QR de Verificación Institucional:</p>
              <img src="${qrDataURI}" alt="Código QR" style="width: 150px; height: 150px; border: 1px solid #cbd5e1; padding: 8px; border-radius: 6px;" />
              <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Este QR será escaneado en las garitas de ingreso para autorizar su acceso.</p>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            Este es un correo automático generado por la demo del Sistema de Marbetes Universitarios.
          </div>
        </div>
      `;

      await notificationService.sendEmail({
        to: email,
        subject: `[Confirmación de Pago] Marbete de Acceso Vehicular - ${formattedPlaca}`,
        body: emailBody,
        metadata: {
          mrbCode,
          placa: formattedPlaca,
          cost,
          expiryDate: marbeteData.fecha_caducidad
        }
      });

      // 9. Simulated Webhook trigger to show interoperability. We will call a local service that models a webhook trigger.
      // We can make an actual local fetch to our own webhook router `/api/webhooks/pasarela-pago` or run a handler directly.
      // Running it directly ensures 100% stability, and we can log the integration.
      try {
        const webhookPayload = {
          event: 'charge.successful',
          data: {
            transaction_id: txnId,
            amount: cost,
            currency: 'GTQ',
            reference_plate: formattedPlaca,
            marbete_code: mrbCode,
            timestamp: new Date().toISOString()
          }
        };

        // We can simulate sending webhook by logging it to a special log file `src/db/webhook_logs.json`!
        const WEBHOOK_LOG = 'src/db/webhook_logs.json';
        let logs = [];
        try {
          if (fs.existsSync(WEBHOOK_LOG)) {
            logs = JSON.parse(fs.readFileSync(WEBHOOK_LOG, 'utf8'));
          }
        } catch (e) {}
        logs.unshift({
          id: 'WH-' + Date.now(),
          timestamp: new Date().toISOString(),
          url: `${protocol}://${host}/api/webhooks/pasarela-pago`,
          payload: webhookPayload,
          status: '200 OK (Simulado)'
        });
        fs.writeFileSync(WEBHOOK_LOG, JSON.stringify(logs, null, 2), 'utf8');
        console.log(`[Webhook Simulator] Dispatched transaction webhook to: ${protocol}://${host}/api/webhooks/pasarela-pago`);
      } catch (whErr) {
        console.error('Failed to trigger simulated webhook:', whErr);
      }

      // Return full payment success packet
      return res.json({
        success: true,
        message: '¡Pago y registro completados con éxito!',
        transactionId: txnId,
        monto: cost,
        marbete: {
          id: marbete.id,
          codigo: mrbCode,
          placa: formattedPlaca,
          tipo: tipo_marbete,
          plan,
          desde: marbeteData.fecha_emision,
          hasta: marbeteData.fecha_caducidad,
          estado,
          diasRestantes,
          qrCode: qrDataURI,
          verificationUrl
        },
        vehicle: {
          placa: formattedPlaca,
          tipo: tipo_placa,
          marca,
          modelo,
          color
        },
        owner: {
          nombre,
          cui,
          rol,
          email
        }
      });
    } catch (err) {
      console.error('Error processing payment:', err);
      return res.status(500).json({ success: false, message: 'Error al procesar el pago en el servidor.' });
    }
  }
};
