import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve('src/db/database.json');

// Ensure db directory exists
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initial mockup seeders
const defaultData = {
  users: [
    {
      id: 1,
      nombre: 'Carlos Alberto Méndez',
      cui: '1234 56789 1234',
      rol: 'Docente',
      email: 'cmendez@uni.edu.gt',
      telefono: '5555-1234'
    },
    {
      id: 2,
      nombre: 'Ana Lucía Pérez',
      cui: '5678 90123 4567',
      rol: 'Estudiante',
      email: 'aperez@uni.edu.gt',
      telefono: '5555-5678'
    },
    {
      id: 3,
      nombre: 'Roberto Díaz',
      cui: '9012 34567 8901',
      rol: 'Administrativo',
      email: 'rdiaz@uni.edu.gt',
      telefono: '5555-9012'
    }
  ],
  vehicles: [
    {
      placa: 'P-001ABC',
      tipo_placa: 'Particular',
      marca: 'Toyota',
      modelo: 'Corolla',
      anio: 2021,
      color: 'Plata',
      usuario_id: 1
    },
    {
      placa: 'C-002DEF',
      tipo_placa: 'Comercial',
      marca: 'Honda',
      modelo: 'CR-V',
      anio: 2019,
      color: 'Negro',
      usuario_id: 2
    },
    {
      placa: 'M-003GHI',
      tipo_placa: 'Motocicleta',
      marca: 'Yamaha',
      modelo: 'FZ150',
      anio: 2022,
      color: 'Rojo',
      usuario_id: 3
    }
  ],
  marbetes: [
    {
      id: 1,
      placa: 'P-001ABC',
      codigo_marbete: 'MRB-2026-1001',
      tipo_marbete: 'Docente',
      plan: 'Anual',
      fecha_emision: '2026-01-01',
      fecha_caducidad: '2026-12-31',
      token_verificacion: 'tok_carlos123'
    },
    {
      id: 2,
      placa: 'C-002DEF',
      codigo_marbete: 'MRB-2026-1002',
      tipo_marbete: 'Estudiante',
      plan: 'Mensual',
      fecha_emision: '2026-05-01',
      fecha_caducidad: '2026-05-31',
      token_verificacion: 'tok_ana456'
    },
    {
      id: 3,
      placa: 'M-003GHI',
      codigo_marbete: 'MRB-2026-1003',
      tipo_marbete: 'Administrativo',
      plan: 'Mensual',
      fecha_emision: '2026-04-01',
      fecha_caducidad: '2026-04-30',
      token_verificacion: 'tok_roberto789'
    }
  ],
  payments: [
    {
      id: 1,
      marbete_id: 1,
      fecha_pago: '2026-01-01',
      monto: 750,
      plan_tipo: 'Anual',
      transaccion_id: 'TXN-739102',
      estado_pago: 'Completado'
    },
    {
      id: 2,
      marbete_id: 2,
      fecha_pago: '2026-05-01',
      monto: 50,
      plan_tipo: 'Mensual',
      transaccion_id: 'TXN-102947',
      estado_pago: 'Completado'
    },
    {
      id: 3,
      marbete_id: 3,
      fecha_pago: '2026-04-01',
      monto: 75,
      plan_tipo: 'Mensual',
      transaccion_id: 'TXN-394857',
      estado_pago: 'Completado'
    }
  ],
  access_logs: [
    {
      id: 1,
      placa: 'P-001ABC',
      fecha_acceso: '2026-05-28T08:15:22.000Z',
      garita: 'Entrada Principal',
      estado_acceso: 'Autorizado',
      detalle: 'Marbete vigente'
    },
    {
      id: 2,
      placa: 'M-003GHI',
      fecha_acceso: '2026-05-28T09:40:11.000Z',
      garita: 'Garita Norte',
      estado_acceso: 'Denegado',
      detalle: 'Marbete vencido desde 2026-04-30'
    }
  ]
};

// Load or initialize DB file
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDb(defaultData);
      return defaultData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading JSON DB, using defaults', err);
    return defaultData;
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export const jsonDb = {
  // Read all records from a table
  findAll: (table) => {
    const db = readDb();
    return db[table] || [];
  },

  // Find a record by field
  findOne: (table, filterFn) => {
    const db = readDb();
    const list = db[table] || [];
    return list.find(filterFn);
  },

  // Find all matching a filter function
  findMany: (table, filterFn) => {
    const db = readDb();
    const list = db[table] || [];
    return list.filter(filterFn);
  },

  // Insert a new record
  insert: (table, record) => {
    const db = readDb();
    if (!db[table]) db[table] = [];
    
    // Auto-increment ID if applicable
    if (record.id === undefined) {
      const ids = db[table].map(x => x.id).filter(id => typeof id === 'number');
      record.id = ids.length > 0 ? Math.max(...ids) + 1 : 1;
    }

    db[table].push(record);
    writeDb(db);
    return record;
  },

  // Update a record
  update: (table, filterFn, updates) => {
    const db = readDb();
    const list = db[table] || [];
    const index = list.findIndex(filterFn);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates };
      writeDb(db);
      return list[index];
    }
    return null;
  },

  // Delete a record
  delete: (table, filterFn) => {
    const db = readDb();
    const list = db[table] || [];
    const filtered = list.filter(item => !filterFn(item));
    db[table] = filtered;
    writeDb(db);
    return list.length !== filtered.length;
  },

  // Reset db to default values
  reset: () => {
    writeDb(defaultData);
    return defaultData;
  }
};
