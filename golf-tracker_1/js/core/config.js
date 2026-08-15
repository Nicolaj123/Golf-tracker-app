// ============================================================
// CONFIG.JS
// Pegá acá las credenciales de tu proyecto de Supabase (Settings
// → API en el dashboard de supabase.com). La "anon key" es pública
// a propósito — no es un secreto, está diseñada para vivir en el
// frontend. La seguridad real la dan las políticas de Row Level
// Security que corre supabase-schema.sql en tu base.
//
// Si dejás esto vacío, la app arranca en MODO LOCAL: sin login,
// guardando todo en LocalStorage del navegador, exactamente como
// funcionaba antes. Es útil para seguir probando funcionalidades
// sin depender de la cuenta. En cuanto completes esto, la app pasa
// sola a MODO CUENTA (login + datos en la nube).
// ============================================================

window.GT_CONFIG = {
  SUPABASE_URL: 'https://jxkfeldmysxingklhrfs.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_G4HNcI0ObMXyzKu2t3izWg_qQ7zKW4d',
};
