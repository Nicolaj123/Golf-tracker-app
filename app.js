// ============================================================
// APP.JS
// Punto de entrada. Arma el shell de navegación (sidebar + tab
// bar), define las rutas disponibles y monta el módulo activo
// dentro de <main id="view-root">. Cada módulo ya viene registrado
// en GT.modules[routeId] (cargado vía <script> clásico en index.html,
// en el orden correcto: utils, db-schema, storage, módulos, app).
// ============================================================

(function (GT) {
  'use strict';

  // Iconos inline (stroke, 1.5px, sin librería externa) para mantener
  // la app 100% offline sin depender de un sprite/CDN de íconos.
  const ICONS = {
    dashboard: '<path d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z"/>',
    putting: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
    driver: '<path d="M6 20l8-16 4 2-8 16-4-2z"/><path d="M14 4l4 2"/>',
    madera: '<path d="M7 21l3-14 4 1-3 14z"/><circle cx="16" cy="6" r="2.5"/>',
    hierros: '<path d="M9 21l2-16 4 .5L11 21z"/>',
    wedges: '<path d="M8 21l4-15 3 1-4 15z"/><path d="M12 6l2-3"/>',
    bunker: '<path d="M3 17c3-2 6-2 9 0s6 2 9 0"/><circle cx="12" cy="9" r="3"/>',
    chipping: '<path d="M5 19l6-13 4 2-6 13z"/><circle cx="17" cy="6" r="1.5"/>',
    rounds: '<path d="M12 3v18"/><path d="M12 4l7 3-7 3"/>',
    courseMode: '<path d="M12 3v18"/><path d="M12 4l7 3-7 3"/><circle cx="12" cy="20" r="1.2"/>',
    bag: '<rect x="5" y="9" width="14" height="12" rx="2"/><path d="M9 9V6a3 3 0 016 0v3"/>',
    distances: '<path d="M3 12h18"/><path d="M6 8l-3 4 3 4"/><path d="M18 8l3 4-3 4"/>',
    planner: '<circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/>',
    goals: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.5" fill="currentColor"/>',
    records: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M6 4h12v4a6 6 0 01-12 0V4z"/>',
    rangeMode: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V4a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V10a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  };

  // Definición de rutas, agrupadas como en la barra lateral.
  const ROUTES = [
    { group: 'Inicio', items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    ] },
    { group: 'Entrenar', items: [
      { id: 'entrenamiento', label: 'Entrenamiento', icon: 'putting' },
    ] },
    { group: 'Jugar', items: [
      { id: 'rounds', label: 'Vueltas de golf', icon: 'rounds' },
      { id: 'course-mode', label: 'Modo en cancha', icon: 'courseMode' },
      { id: 'range-mode', label: 'Driving range', icon: 'rangeMode' },
    ] },
    { group: 'Mi juego', items: [
      { id: 'bag', label: 'Mi bolsa', icon: 'bag' },
      { id: 'distances', label: 'Distancias', icon: 'distances' },
      { id: 'goals', label: 'Objetivos', icon: 'goals' },
      { id: 'records', label: 'Récords', icon: 'records' },
    ] },
    { group: 'Análisis', items: [
      { id: 'planner', label: 'Planificador', icon: 'planner' },
    ] },
    { group: '', items: [
      { id: 'settings', label: 'Ajustes', icon: 'settings' },
    ] },
  ];

  function flatRoutes() {
    return ROUTES.reduce((acc, g) => acc.concat(g.items), []);
  }

  function iconSVG(name) {
    return '<svg class="nav-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  }

  function buildSidebar() {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = ROUTES.map((group) => `
      <div class="sidebar__group">
        ${group.group ? `<div class="sidebar__group-label">${group.group}</div>` : ''}
        ${group.items.map((r) => `
          <button class="nav-item" data-route="${r.id}">
            ${iconSVG(r.icon)}<span>${r.label}</span>
          </button>
        `).join('')}
      </div>
    `).join('');

    // "Cerrar sesión" vive siempre visible, abajo de todo del menú —
    // no escondido dentro de Ajustes. Solo aparece en modo cuenta.
    const footer = document.getElementById('sidebar-footer');
    if (GT.auth && GT.auth.isCloudMode()) {
      footer.innerHTML = `
        <button class="nav-item" id="btn-sidebar-logout">
          ${iconSVG('logout')}<span>Cerrar sesión</span>
        </button>
      `;
      footer.querySelector('#btn-sidebar-logout').addEventListener('click', () => GT.auth.signOut());
    } else {
      footer.innerHTML = '';
    }
  }

  // ------------------------------------------------------------
  // Drawer mobile: el mismo sidebar de desktop, pero deslizable.
  // En desktop el CSS lo muestra siempre fijo y el botón hamburguesa
  // queda oculto; en mobile arranca cerrado.
  // ------------------------------------------------------------
  function openDrawer() {
    document.getElementById('sidebar').classList.add('is-open');
    document.getElementById('sidebar-backdrop').classList.add('is-open');
  }

  function closeDrawer() {
    document.getElementById('sidebar').classList.remove('is-open');
    document.getElementById('sidebar-backdrop').classList.remove('is-open');
  }

  function wireDrawer() {
    document.getElementById('btn-hamburger').addEventListener('click', openDrawer);
    document.getElementById('sidebar-backdrop').addEventListener('click', closeDrawer);
  }

  function navigate(routeId) {
    const route = flatRoutes().find((r) => r.id === routeId) || flatRoutes()[0];

    document.querySelectorAll('[data-route]').forEach((el) => {
      if (el.dataset.route === route.id) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });

    document.getElementById('topbar-title').textContent = route.label;
    closeDrawer(); // al elegir una sección en mobile, el menú se cierra solo

    const container = document.getElementById('view-root');
    container.classList.remove('view');
    void container.offsetWidth; // fuerza reflow para re-disparar la animación de entrada
    container.classList.add('view');

    const mod = GT.modules && GT.modules[route.id];
    if (mod && typeof mod.render === 'function') {
      mod.render(container);
    } else {
      console.error('[app] Módulo no encontrado para la ruta "' + route.id + '"');
      container.innerHTML = '<div class="empty-state"><h2 class="empty-state__title">No se pudo cargar esta sección</h2></div>';
    }

    window.location.hash = route.id;
  }

  function wireNavClicks() {
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-route]');
      if (btn) navigate(btn.dataset.route);
    });
  }

  /** Aplica el tema (dark/light) al documento. Usado también desde settings.js. */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function initTheme() {
    const settings = GT.storage.getSettings();
    applyTheme(settings.theme || 'dark');
  }

  function initialRoute() {
    const fromHash = window.location.hash.replace('#', '');
    const valid = flatRoutes().some((r) => r.id === fromHash);
    return valid ? fromHash : 'dashboard';
  }

  // ------------------------------------------------------------
  // Arranque: en modo local es el boot de siempre. En modo cuenta,
  // primero hay que resolver la sesión (¿hay login? ¿hay que
  // mostrar el gate?) antes de montar sidebar/tabbar/vistas.
  // ------------------------------------------------------------
  let navClicksWired = false;
  let dataLoadedForUser = null;

  function mountAppShell() {
    initTheme();
    buildSidebar();
    if (!navClicksWired) { wireNavClicks(); wireDrawer(); navClicksWired = true; }
    document.getElementById('auth-gate').hidden = true;
    document.getElementById('app-shell').hidden = false;
    navigate(initialRoute());
  }

  function showAuthGate(view) {
    document.getElementById('app-shell').hidden = true;
    GT.authGate.render(document.getElementById('auth-gate'), view);
  }

  function showLoading(msg) {
    const el = document.getElementById('auth-gate');
    document.getElementById('app-shell').hidden = true;
    el.hidden = false;
    el.innerHTML = '<div class="auth-loading">' + (msg || 'Cargando…') + '</div>';
  }

  async function handleSignedIn(userId) {
    if (dataLoadedForUser === userId) { mountAppShell(); return; } // ya cargado, solo re-mostrar
    showLoading('Sincronizando tus datos…');
    try {
      await GT.storage.initFromSupabase(userId);
      dataLoadedForUser = userId;
      mountAppShell();
    } catch (err) {
      console.error('[app] Error inicializando datos desde Supabase', err);
      showLoading('Hubo un error cargando tus datos. Recargá la página.');
    }
  }

  function handleSignedOut() {
    dataLoadedForUser = null;
    showAuthGate('login');
  }

  async function bootCloud() {
    showLoading();

    GT.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        showAuthGate('reset');
      } else if (event === 'SIGNED_IN' && session) {
        handleSignedIn(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        handleSignedOut();
      }
    });

    const session = await GT.auth.getSession();
    if (session) {
      await handleSignedIn(session.user.id);
    } else {
      showAuthGate('login');
    }
  }

  function boot() {
    if (GT.auth && GT.auth.isCloudMode()) {
      bootCloud();
    } else {
      mountAppShell(); // modo local: sin gate, arranca directo como siempre
    }
  }

  GT.app = { applyTheme: applyTheme, navigate: navigate };

  document.addEventListener('DOMContentLoaded', boot);
})(window.GT = window.GT || {});
