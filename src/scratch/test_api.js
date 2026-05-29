/**
 * Automated Testing Script for API Business Logic, Pricing & Database Layers
 * Run this using: node src/scratch/test_api.js
 */

import { jsonDb } from '../db/jsonDb.js';
import { pricingService } from '../services/pricingService.js';
import { qrService } from '../services/qrService.js';

async function runTests() {
  console.log('==================================================');
  console.log('  INICIANDO PRUEBAS AUTOMATIZADAS DE API & LOGIC  ');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // TEST 1: Database Operations
  try {
    console.log('--- Probando Capa de Persistencia (JSON Database) ---');
    
    // Clean initial DB check
    const users = jsonDb.findAll('users');
    assert(users.length >= 3, 'La base de datos contiene los usuarios iniciales del sembrado');
    
    const docUser = jsonDb.findOne('users', u => u.rol === 'Docente');
    assert(docUser.nombre === 'Carlos Alberto Méndez', 'Búsqueda por rol Docente devuelve a Carlos Alberto Méndez');

    // Insert new test user
    const newUser = jsonDb.insert('users', {
      nombre: 'Prueba Integracion',
      cui: '9999 99999 9999',
      rol: 'Estudiante',
      email: 'test@universidad.edu.gt',
      telefono: '1234-5678'
    });
    
    const searchUser = jsonDb.findOne('users', u => u.email === 'test@universidad.edu.gt');
    assert(searchUser !== null && searchUser.nombre === 'Prueba Integracion', 'Inserción y recuperación de usuario exitosa');

    // Clean up inserted user
    jsonDb.delete('users', u => u.id === searchUser.id);
    const postDeleteUser = jsonDb.findOne('users', u => u.id === searchUser.id);
    assert(postDeleteUser === undefined, 'Eliminación del usuario de prueba correcta');
    
  } catch (err) {
    console.error('[ERROR EN TEST 1]', err);
    failed++;
  }

  // TEST 2: Pricing and Validity Service
  try {
    console.log('\n--- Probando Capa de Negocio (Pricing & Dates Service) ---');
    
    // Test Student calculations
    const studentCostMonth = pricingService.calculateCost('Estudiante', 'mensual');
    assert(studentCostMonth === 50, 'Cálculo de marbete mensual para Estudiante es Q50.00');

    const studentCostYear = pricingService.calculateCost('Estudiante', 'anual');
    assert(studentCostYear === 500, 'Cálculo de marbete anual para Estudiante es Q500.00 (2 meses de ahorro)');

    // Test Admin calculations
    const adminCostMonth = pricingService.calculateCost('Administrativo', 'mensual');
    assert(adminCostMonth === 75, 'Cálculo de marbete mensual para Administrativo es Q75.00');

    const adminCostYear = pricingService.calculateCost('Docente', 'anual');
    assert(adminCostYear === 750, 'Cálculo de marbete anual para Docente es Q750.00');

    // Test status and days remaining
    const today = new Date();
    
    // 10 days in the future
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 10);
    const statusFuture = pricingService.getStatusAndDaysRemaining(futureDate);
    assert(statusFuture.estado === 'Vigente' && statusFuture.diasRestantes === 10, 'Fecha futura de 10 días se clasifica como Vigente con 10 días restantes');

    // 5 days in the future
    const warningDate = new Date(today);
    warningDate.setDate(today.getDate() + 5);
    const statusWarning = pricingService.getStatusAndDaysRemaining(warningDate);
    assert(statusWarning.estado === 'Por vencer' && statusWarning.diasRestantes === 5, 'Fecha futura de 5 días se clasifica como Por vencer con 5 días restantes');

    // 1 day in the past
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 1);
    const statusPast = pricingService.getStatusAndDaysRemaining(pastDate);
    assert(statusPast.estado === 'Vencido' && statusPast.diasRestantes === -1, 'Fecha pasada de 1 día se clasifica como Vencido con -1 días restantes');

  } catch (err) {
    console.error('[ERROR EN TEST 2]', err);
    failed++;
  }

  // TEST 3: QR Code Generator
  try {
    console.log('\n--- Probando Generación de Códigos QR ---');
    
    const testUrl = 'http://localhost:3000/verificar.html?token=tok_test';
    const qrURI = await qrService.generateDataURI(testUrl);
    
    assert(qrURI.startsWith('data:image/png;base64,'), 'Generación correcta de QR en formato Base64 PNG Data URI');
    
    const qrSVG = await qrService.generateSVG(testUrl);
    assert(qrSVG.includes('<svg') && qrSVG.includes('</svg>'), 'Generación correcta de QR en formato vector SVG nativo');
    
  } catch (err) {
    console.error('[ERROR EN TEST 3]', err);
    failed++;
  }

  // SUMMARY
  console.log('\n==================================================');
  console.log('            RESUMEN DE VERIFICACIÓN               ');
  console.log('==================================================');
  console.log(`  PRUEBAS EXITOSAS: ${passed}`);
  console.log(`  PRUEBAS FALLIDAS: ${failed}`);
  console.log('==================================================');
  
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('  ¡Felicidades! Todas las capas superaron el test.');
    console.log('==================================================\n');
  }
}

runTests();
