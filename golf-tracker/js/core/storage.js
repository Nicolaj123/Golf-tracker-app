// ============================================================
// STORAGE.JS
// Única puerta de entrada/salida a la persistencia de datos.
// Ningún otro módulo debe tocar localStorage ni Supabase directamente.
//
// MODO LOCAL (sin GT_CONFIG cargado): funciona exactamente igual
// que en las etapas anteriores — todo vive en LocalStorage, sync.
//
// MODO CUENTA (con GT_CONFIG + sesión iniciada): los datos del
// usuario se cargan UNA VEZ a un caché en memoria (initFromSupabase,
// llamado por app.js antes de montar la app), y desde ahí getAll/
// getById siguen siendo síncronos — ningún módulo de UI tuvo que
// cambiar por esto. Las escrituras (insert/update/remove) aplican
// primero al caché (la UI responde al instante, como siempre) y
// después sincronizan con Supabase en segundo plano ("optimistic
// writes"). Si la sincronización falla, se avisa por toast pero no
// se revierte el caché — mantiene la experiencia simple; el dato
// queda pendiente de reintento en la próxima escritura o recarga.
// ============================================================

(function (GT) {
  'use strict';

  const schema = GT.schema;
  const utils = GT.utils;

  let db = null;
  let currentUserId = null;

  function cloudMode() {
    return GT.auth && GT.auth.isCloudMode();
  }

  // ------------------------------------------------------------
  // MODO LOCAL (LocalStorage) — idéntico a etapas anteriores
  // ------------------------------------------------------------
  function loadLocal() {
    if (db) return db;
    try {
      const raw = localStorage.getItem(schema.DB_KEY);
      if (!raw) { db = schema.emptyDatabase(); persistLocal(); return db; }
      db = migrate(JSON.parse(raw));
      return db;
    } catch (err) {
      console.error('[storage] Error leyendo LocalStorage, se crea una base nueva.', err);
      db = schema.emptyDatabase();
      persistLocal();
      return db;
    }
  }

  function persistLocal() {
    try {
      localStorage.setItem(schema.DB_KEY, JSON.stringify(db));
      return true;
    } catch (err) {
      console.error('[storage] Error guardando en LocalStorage (¿espacio agotado?).', err);
      return false;
    }
  }

  function migrate(data) {
    const migrated = data;
    if (!migrated.schemaVersion) migrated.schemaVersion = 1;
    migrated.schemaVersion = schema.SCHEMA_VERSION;
    return migrated;
  }

  // ------------------------------------------------------------
  // MODO CUENTA (Supabase) — carga inicial + sync en segundo plano
  // ------------------------------------------------------------
  const CLOUD_TABLES = [schema.COLLECTIONS.SESSIONS, schema.COLLECTIONS.ROUNDS, schema.COLLECTIONS.CLUBS, schema.COLLECTIONS.GOALS];

  /** Se llama una sola vez, después del login, antes de montar la app. */
  async function initFromSupabase(userId) {
    currentUserId = userId;
    db = schema.emptyDatabase();
    const client = GT.auth.getClient();

    for (const table of CLOUD_TABLES) {
      const { data, error } = await client.from(table).select('*').eq('user_id', userId).order('created_at', { ascending: true });
      if (error) {
        console.error('[storage] Error cargando "' + table + '" desde Supabase', error);
        continue;
      }
      db[table] = (data || []).map(fromRow);
    }

    const { data: settingsRow, error: settingsError } = await client.from(schema.COLLECTIONS.SETTINGS).select('*').eq('user_id', userId).maybeSingle();
    if (settingsError) console.error('[storage] Error cargando settings', settingsError);
    db.settings = settingsRow ? { theme: settingsRow.theme, units: settingsRow.units, handicap: settingsRow.handicap } : { theme: 'light', units: 'metric', handicap: null };
    if (!settingsRow) {
      await client.from(schema.COLLECTIONS.SETTINGS).upsert({ user_id: userId, theme: 'light', units: 'metric', handicap: null });
    }

    return db;
  }

  // Supabase guarda columnas planas; nuestro modelo usa objetos anidados
  // (payload, condiciones, holes, etc). fromRow/toRow traducen entre las dos formas.
  function fromRow(row) {
    const record = Object.assign({}, row.payload || {}, {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
    return record;
  }

  function toRow(collection, id, record, userId) {
    const payload = Object.assign({}, record);
    delete payload.id; delete payload.createdAt; delete payload.updatedAt;
    return { id: id, user_id: userId, payload: payload, updated_at: new Date().toISOString() };
  }

  async function cloudWrite(promise, label) {
    try {
      const { error } = await promise;
      if (error) throw error;
    } catch (err) {
      console.error('[storage] Error sincronizando con la nube (' + label + ')', err);
      utils.showToast('No se pudo sincronizar con la nube — reintentá más tarde');
    }
  }

  // ------------------------------------------------------------
  // API pública — idéntica en ambos modos
  // ------------------------------------------------------------
  function ensureLoaded() {
    if (cloudMode()) return db || schema.emptyDatabase(); // debería estar cargado por initFromSupabase antes de usar la app
    return loadLocal();
  }

  function getAll(collection) {
    const data = ensureLoaded();
    return data[collection] || [];
  }

  function getById(collection, id) {
    return getAll(collection).find((item) => item.id === id) || null;
  }

  function insert(collection, record) {
    const data = ensureLoaded();
    const now = new Date().toISOString();
    const withMeta = Object.assign({ id: utils.generateId(collection), createdAt: now }, record, { updatedAt: now });
    data[collection].push(withMeta);

    if (cloudMode()) {
      const client = GT.auth.getClient();
      cloudWrite(client.from(collection).insert(toRow(collection, withMeta.id, withMeta, currentUserId)), 'insert ' + collection);
    } else {
      persistLocal();
    }
    return withMeta;
  }

  function update(collection, id, patch) {
    const data = ensureLoaded();
    const idx = data[collection].findIndex((item) => item.id === id);
    if (idx === -1) return null;
    data[collection][idx] = Object.assign({}, data[collection][idx], patch, { updatedAt: new Date().toISOString() });
    const updated = data[collection][idx];

    if (cloudMode()) {
      const client = GT.auth.getClient();
      const row = toRow(collection, id, updated, currentUserId);
      cloudWrite(client.from(collection).update({ payload: row.payload, updated_at: row.updated_at }).eq('id', id).eq('user_id', currentUserId), 'update ' + collection);
    } else {
      persistLocal();
    }
    return updated;
  }

  function remove(collection, id) {
    const data = ensureLoaded();
    const before = data[collection].length;
    data[collection] = data[collection].filter((item) => item.id !== id);
    const removed = data[collection].length < before;

    if (cloudMode()) {
      const client = GT.auth.getClient();
      cloudWrite(client.from(collection).delete().eq('id', id).eq('user_id', currentUserId), 'delete ' + collection);
    } else {
      persistLocal();
    }
    return removed;
  }

  function getSettings() {
    return ensureLoaded().settings;
  }

  function updateSettings(patch) {
    const data = ensureLoaded();
    data.settings = Object.assign({}, data.settings, patch);

    if (cloudMode()) {
      const client = GT.auth.getClient();
      cloudWrite(client.from(schema.COLLECTIONS.SETTINGS).upsert(Object.assign({ user_id: currentUserId }, data.settings)), 'update settings');
    } else {
      persistLocal();
    }
    return data.settings;
  }

  function getFullSnapshot() {
    return JSON.parse(JSON.stringify(ensureLoaded()));
  }

  /** Reemplaza todos los datos por un snapshot importado. En modo cuenta, además re-sincroniza todo con Supabase en segundo plano. */
  function restoreSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || !Array.isArray(snapshot.sessions)) {
      throw new Error('El archivo de backup no tiene el formato esperado.');
    }
    db = migrate(snapshot);

    if (cloudMode()) {
      bulkResyncToCloud();
    } else {
      persistLocal();
    }
    return db;
  }

  function wipeDatabase() {
    db = schema.emptyDatabase();
    if (cloudMode()) {
      bulkResyncToCloud();
    } else {
      persistLocal();
    }
    return db;
  }

  async function bulkResyncToCloud() {
    const client = GT.auth.getClient();
    try {
      for (const table of CLOUD_TABLES) {
        await client.from(table).delete().eq('user_id', currentUserId);
        const rows = (db[table] || []).map((r) => toRow(table, r.id, r, currentUserId));
        if (rows.length) await client.from(table).insert(rows);
      }
      await client.from(schema.COLLECTIONS.SETTINGS).upsert(Object.assign({ user_id: currentUserId }, db.settings));
      utils.showToast('Sincronizado con la nube');
    } catch (err) {
      console.error('[storage] Error en la resincronización masiva', err);
      utils.showToast('Hubo un error sincronizando con la nube');
    }
  }

  // ------------------------------------------------------------
  // Interfaz de exportación desacoplada (backup local / futuras integraciones)
  // ------------------------------------------------------------
  const exportAdapters = {
    local: {
      name: 'Archivo local',
      export: function (data, filename) {
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        return Promise.resolve();
      },
    },
    // googleSheets: { name: 'Google Sheets', export: function(data, filename) { ... } }  // Etapa futura
  };

  GT.storage = {
    initFromSupabase: initFromSupabase,
    getAll: getAll,
    getById: getById,
    insert: insert,
    update: update,
    remove: remove,
    getSettings: getSettings,
    updateSettings: updateSettings,
    getFullSnapshot: getFullSnapshot,
    restoreSnapshot: restoreSnapshot,
    wipeDatabase: wipeDatabase,
    exportAdapters: exportAdapters,
  };
})(window.GT = window.GT || {});
