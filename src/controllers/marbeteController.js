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

      // Find vehicle - Adaptado con await pasándole los parámetros explícitos para Supabase
      const vehicle = await jsonDb.findOne('vehicles', v => v.placa === placa, 'placa', placa);
      if (!vehicle) {
        return res.status(404).json({ 
          success: false, 
          message: `No se encontró ningún vehículo registrado con la placa ${placa}.` 
        });
      }

      // Find owner - Adaptado con await
      const owner = await jsonDb.findOne('users', u => u.id === vehicle.usuario_id, 'id', vehicle.usuario_id);
      
      // Find active marbete - Adaptado con await
      const marbete = await jsonDb.findOne('marbetes', m => m.placa === placa, 'placa', placa);
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
      
      // Update DB if state changed - Adaptado con await
      if (marbete.estado !== estado) {
        await jsonDb.update('marbetes', m => m.id === marbete.id, { estado }, 'id', marbete.id);
        marbete.estado = estado;
      }
      
      marbete.diasRestantes = diasRestantes;

      // Get payments history - Adaptado con await
      const payments = await jsonDb.findMany('payments', p => p.marbete_id === marbete.id);
      
      // Get access audit logs - Adaptado con await
      const accessLogs = await jsonDb.findMany('access_logs', a => a.placa === placa);

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
       payments: Array.isArray(payments) ? payments.sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago)) : [],
        accessLogs: Array.isArray(accessLogs) ? accessLogs.sort((a, b) => new Date(b.fecha_acceso) - new Date(a.fecha_acceso)) : []
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

      // Find marbete - Adaptado con await
      const marbete = await jsonDb.findOne('marbetes', m => m.token_verificacion === token, 'token_verificacion', token);
      if (!marbete) {
        // Record unauthorized access audit log - Adaptado con await
        await jsonDb.insert('access_logs', {
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

      // Find vehicle y owner - Adaptado con await
      const vehicle = await jsonDb.findOne('vehicles', v => v.placa === marbete.placa, 'placa', marbete.placa);
      const owner = await jsonDb.findOne('users', u => u.id === vehicle.usuario_id, 'id', vehicle.usuario_id);
      
      // Calculate real-time status
      const { estado, diasRestantes } = pricingService.getStatusAndDaysRemaining(marbete.fecha_caducidad);
      
      // Add audit log for this QR scan - Adaptado con await
      await jsonDb.insert('access_logs', {
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