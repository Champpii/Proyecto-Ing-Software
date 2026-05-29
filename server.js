import express from 'express';
import path from 'path';
import apiRouter from './src/routes/api.js';
import webhookRouter from './src/routes/webhooks.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.resolve('src/public')));

// Mount routers
app.use('/api', apiRouter);
app.use('/api/webhooks', webhookRouter);

// Fallback HTML router for frontend routing
app.get('*', (req, res, next) => {
  // If requesting API routes, skip static fallback
  if (req.url.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.resolve('src/public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err);
  res.status(500).json({
    success: false,
    message: 'Ha ocurrido un error inesperado en el servidor.'
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`   SISTEMA DE CONTROL DE ACCESO VEHICULAR UNIVERSITARIO`);
  console.log(`======================================================`);
  console.log(`    Servidor Express corriendo exitosamente.`);
  console.log(`    Acceso al portal: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
