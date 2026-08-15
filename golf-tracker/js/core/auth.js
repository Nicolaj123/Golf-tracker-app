// ============================================================
// AUTH.JS
// Envoltorio fino sobre supabase-js Auth. Si GT_CONFIG no tiene
// credenciales cargadas, GT.auth.isCloudMode() devuelve false y
// el resto de la app sigue funcionando en modo local (LocalStorage,
// sin login), exactamente como antes de esta etapa.
// ============================================================

(function (GT) {
  'use strict';

  const cfg = window.GT_CONFIG || {};
  const isCloud = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);

  let client = null;
  if (isCloud && window.supabase && window.supabase.createClient) {
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  function isCloudMode() {
    return isCloud && !!client;
  }

  async function getSession() {
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) { console.error('[auth] getSession', error); return null; }
    return data.session;
  }

  async function signUp(email, password) {
    if (!client) throw new Error('Supabase no está configurado.');
    const { data, error } = await client.auth.signUp({
      email: email,
      password: password,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) throw error;
    return data;
  }

  async function signIn(email, password) {
    if (!client) throw new Error('Supabase no está configurado.');
    const { data, error } = await client.auth.signInWithPassword({ email: email, password: password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
  }

  async function sendPasswordReset(email) {
    if (!client) throw new Error('Supabase no está configurado.');
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname + '#reset-password',
    });
    if (error) throw error;
  }

  async function updatePassword(newPassword) {
    if (!client) throw new Error('Supabase no está configurado.');
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async function resendVerification(email) {
    if (!client) throw new Error('Supabase no está configurado.');
    const { error } = await client.auth.resend({ type: 'signup', email: email });
    if (error) throw error;
  }

  function onAuthStateChange(callback) {
    if (!client) return;
    client.auth.onAuthStateChange((event, session) => callback(event, session));
  }

  GT.auth = {
    isCloudMode: isCloudMode,
    getClient: function () { return client; },
    getSession: getSession,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    sendPasswordReset: sendPasswordReset,
    updatePassword: updatePassword,
    resendVerification: resendVerification,
    onAuthStateChange: onAuthStateChange,
  };
})(window.GT = window.GT || {});
