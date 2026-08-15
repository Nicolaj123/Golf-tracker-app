// ============================================================
// UTILS.JS
// Helpers puros y sin estado, usados por toda la app.
//
// NOTA DE ARQUITECTURA: el proyecto usa <script> clásicos (no
// type="module") a propósito. Chrome/Edge bloquean los ES Modules
// por CORS cuando el archivo se abre con doble clic (file://), y
// ese es un requisito duro del proyecto. Por eso cada archivo se
// adjunta a un namespace global único: window.GT.
// ============================================================

(function (GT) {
  'use strict';

  function generateId(prefix) {
    prefix = prefix || 'id';
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function nowHHMM() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function formatDate(isoDate) {
    if (!isoDate) return '—';
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function round(value, decimals) {
    decimals = decimals === undefined ? 1 : decimals;
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  function pct(hits, total, decimals) {
    if (!total) return '—';
    return round((hits / total) * 100, decimals || 0) + '%';
  }

  function average(values) {
    const clean = (values || []).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    if (!clean.length) return null;
    return clean.reduce((a, b) => a + b, 0) / clean.length;
  }

  function stdDev(values) {
    const clean = (values || []).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    if (clean.length < 2) return 0;
    const avg = average(clean);
    const variance = average(clean.map((v) => Math.pow(v - avg, 2)));
    return Math.sqrt(variance);
  }

  function semaforo(value, opts) {
    const warnBelow = opts.warnBelow;
    const badBelow = opts.badBelow;
    const higherIsBetter = opts.higherIsBetter === undefined ? true : opts.higherIsBetter;
    if (value === null || value === undefined) return 'none';
    if (higherIsBetter) {
      if (value < badBelow) return 'bad';
      if (value < warnBelow) return 'warn';
      return 'good';
    }
    if (value > badBelow) return 'bad';
    if (value > warnBelow) return 'warn';
    return 'good';
  }

  function debounce(fn, wait) {
    wait = wait || 300;
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  }

  let toastTimer;
  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = '<span class="toast__dot"></span><span class="toast__text"></span>';
      document.body.appendChild(toast);
    }
    toast.querySelector('.toast__text').textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  GT.utils = {
    generateId: generateId,
    todayISO: todayISO,
    nowHHMM: nowHHMM,
    formatDate: formatDate,
    round: round,
    pct: pct,
    average: average,
    stdDev: stdDev,
    semaforo: semaforo,
    debounce: debounce,
    showToast: showToast,
    clamp: clamp,
  };
})(window.GT = window.GT || {});
