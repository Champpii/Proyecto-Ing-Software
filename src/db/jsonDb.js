import { createClient } from '@supabase/supabase-js';

// Inicialización del cliente de Supabase leyendo el archivo .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[SupabaseError] Faltan las variables de entorno SUPABASE_URL o SUPABASE_KEY en el .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const jsonDb = {
  // 1. Buscar todos los registros de una tabla
  findAll: async (table) => {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error(`Error en findAll para la tabla ${table}:`, err.message);
      return [];
    }
  },

  // 2. Buscar un registro que coincida con la placa
  findOne: async (table, filterFn, queryKey = 'placa', queryValue = '') => {
    try {
      // Intenta consultar directamente a Supabase usando el campo clave (ej: placa)
      if (queryValue) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq(queryKey, queryValue)
          .maybeSingle();
        
        if (!error && data) return data;
      }

      // Sistema de respaldo por si se filtra usando funciones personalizadas de JavaScript
      const { data: allData } = await supabase.from(table).select('*');
      if (!filterFn || typeof filterFn !== 'function') return null;
      // No pasar la función directamente a .find por motivos de seguridad/linting
      return (allData || []).find(item => filterFn(item));
    } catch (err) {
      console.error(`Error en findOne para la tabla ${table}:`, err.message);
      return null;
    }
  },

  // 3. Buscar múltiples registros que cumplan con una condición
  findMany: async (table, filterFn) => {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;
      return (data || []).filter(filterFn);
    } catch (err) {
      console.error(`Error en findMany para la tabla ${table}:`, err.message);
      return [];
    }
  },

  // 4. Insertar un nuevo registro en Supabase
  insert: async (table, record) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .insert([record])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error(`Error en insert para la tabla ${table}:`, err.message);
      return record;
    }
  },

  // 5. Actualizar un registro en Supabase
  update: async (table, filterFn, updates, queryKey = 'placa', queryValue = '') => {
    try {
      if (queryValue) {
        const { data, error } = await supabase
          .from(table)
          .update(updates)
          .eq(queryKey, queryValue)
          .select()
          .maybeSingle();
        
        if (!error && data) return data;
      }
      return null;
    } catch (err) {
      console.error(`Error en update para la tabla ${table}:`, err.message);
      return null;
    }
  },

  // 6. Eliminar un registro de Supabase
  delete: async (table, filterFn, queryKey = 'placa', queryValue = '') => {
    try {
      if (queryValue) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq(queryKey, queryValue);
        
        return !error;
      }
      return false;
    } catch (err) {
      console.error(`Error en delete para la tabla ${table}:`, err.message);
      return false;
    }
  },

  // 7. Reiniciar Base de Datos (Limpiar tabla para la demo)
  reset: async () => {
    try {
      await supabase.from('marbetes').delete().neq('id', 0);
      console.log('Tabla marbetes limpiada en Supabase con éxito.');
      return {};
    } catch (err) {
      console.error('Error al reiniciar la base de datos en Supabase:', err.message);
      return {};
    }
  }
};