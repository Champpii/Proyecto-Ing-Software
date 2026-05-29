import { jsonDb } from '../db/jsonDb.js';
import { pricingService } from '../services/pricingService.js';
import { qrService } from '../services/qrService.js';
import { notificationService } from '../services/notificationService.js';

export const marbeteController = {
  /**
   * Search and retrieve full marbete details by license plate
   */
  consultarPorPlaca: async (req, res) => {
    try {
      const placa = (req.params.placa || '').trim().toUpperCase();
      
      if (!placa) {
        return res.status(400).json({ success: false, message: 'Número de placa requerido.' });
      }

      // Find vehicle
      const vehicle = jsonDb.findOne('vehicles', v => v.placa === placa);
      if (!vehicle) {
        return res.status(404).json({ 
          success: false, 
          message: `No se encontró ningún vehículo registrado con la placa ${placa}.` 
        });
      }

      // Find owner
      const owner = jsonDb.findOne('users', u => u.id === vehicle.usuario_id);
      
      // Find active marbete
      const marbete = jsonDb.findOne('marbetes', m => m.placa === placa);
      if (!marbete) {
        return res.json({
          success: true,
          vehicle,
          owner,
          marbete: null,
          message: 'El vehículo está registrado pero no posee ningún marbete contratado.'
        });
      }

      // Recalculate status and days remaining in real-time
      const { estado, diasRestantes } = pricingService.getStatusAndDaysRemaining(marbete.fecha_caducidad);
      
      // Update DB if state changed
      if (marbete.estado !== estado) {
        jsonDb.update('marbetes', m => m.id === marbete.id, { estado });
        marbete.estado = estado;
      }
      
      marbete.diasRestantes = diasRestantes;

      // Get payments history
      const payments = jsonDb.findMany('payments', p => p.marbete_id === marbete.id);
      
      // Get access audit logs
      const accessLogs = jsonDb.findMany('access_logs', a => a.placa === placa);

      // Generate verification URL and QR Code
      const protocol = req.protocol;
      const host = req.get('host');
      const verificationUrl = `${protocol}://${host}/verificar.html?token=${marbete.token_verificacion}`;
      
      // Add QR SVG & PNG to payload
      const qrDataURI = await qrService.generateDataURI(verificationUrl);

      return res.json({
        success: true,
        owner,
        vehicle,
        marbete: {
          ...marbete,
          qrCode: qrDataURI,
          verificationUrl
        },
        payments: payments.sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago)),
        accessLogs: accessLogs.sort((a, b) => new Date(b.fecha_acceso) - new Date(a.fecha_acceso))
      });
    } catch (err) {
      console.error('Error consulting marbete:', err);
      return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  },

  /**
   * Verify marbete validity using the token embedded in QR code (Public endpoint)
   */
  verificarToken: async (req, res) => {
    try {
      const token = req.params.token;
      
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token de verificación requerido.' });
      }

      const marbete = jsonDb.findOne('marbetes', m => m.token_verificacion === token);
      if (!marbete) {
        // Record unauthorized access audit log
        jsonDb.insert('access_logs', {
          placa: 'DESCONOCIDO',
          fecha_acceso: new Date().toISOString(),
          garita: 'Garita de Control QR',
          estado_acceso: 'Denegado',
          detalle: `Escaneo de QR con token inválido: ${token}`
        });

        return res.status(404).json({ 
          success: false, 
          message: 'Código de marbete no válido o no registrado en el sistema.' 
        });
      }

      const vehicle = jsonDb.findOne('vehicles', v => v.placa === marbete.placa);
      const owner = jsonDb.findOne('users', u => u.id === vehicle.usuario_id);
      
      // Calculate real-time status
      const { estado, diasRestantes } = pricingService.getStatusAndDaysRemaining(marbete.fecha_caducidad);
      
      // Add audit log for this QR scan
      jsonDb.insert('access_logs', {
        placa: marbete.placa,
        fecha_acceso: new Date().toISOString(),
        garita: 'Garita de Control QR',
        estado_acceso: estado === 'Vencido' ? 'Denegado' : 'Autorizado',
        detalle: `Código QR verificado. Estado: ${estado} (${diasRestantes} días restantes)`
      });

      return res.json({
        success: true,
        estado,
        diasRestantes,
        marbete: {
          codigo: marbete.codigo_marbete,
          tipo: marbete.tipo_marbete,
          plan: marbete.plan,
          desde: marbete.fecha_emision,
          hasta: marbete.fecha_caducidad
        },
        vehicle: {
          placa: vehicle.placa,
          tipo: vehicle.tipo_placa,
          marca: vehicle.marca,
          modelo: vehicle.modelo,
          color: vehicle.color
        },
        owner: {
          nombre: owner.nombre,
          rol: owner.rol
        }
      });
    } catch (err) {
      console.error('Error verifying token:', err);
      return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  },

  /**
   * Get all mock email notifications
   */
  obtenerNotificaciones: (req, res) => {
    try {
      const emails = notificationService.getSentEmails();
      return res.json({ success: true, emails });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Error al leer notificaciones.' });
    }
  }
};
