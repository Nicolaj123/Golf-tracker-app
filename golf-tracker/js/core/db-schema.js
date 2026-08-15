// ============================================================
// DB-SCHEMA.JS
// Define la forma de la base de datos que vive en LocalStorage
// y el número de versión (para migraciones futuras).
//
// Todo el proyecto guarda bajo UNA sola clave raíz para simplificar
// backup/restore y evitar fragmentación en LocalStorage.
// ============================================================

(function (GT) {
  'use strict';

  const DB_KEY = 'golfTrackerDB';
  const SCHEMA_VERSION = 1;

  const COLLECTIONS = {
    SESSIONS: 'sessions',
    ROUNDS: 'rounds',
    CLUBS: 'clubs',
    GOALS: 'goals',
    RECORDS: 'records',
    SETTINGS: 'settings',
  };

  function emptyDatabase() {
    const db = { schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString() };
    db[COLLECTIONS.SESSIONS] = [];
    db[COLLECTIONS.ROUNDS] = [];
    db[COLLECTIONS.CLUBS] = [];
    db[COLLECTIONS.GOALS] = [];
    db[COLLECTIONS.RECORDS] = [];
    db[COLLECTIONS.SETTINGS] = { theme: 'light', units: 'metric', handicap: null };
    return db;
  }

  const PUTTING_CATEGORIES = {
    control_distancia: ['3-6-9 metros', 'Escalera', 'Lag Putting', 'Dos Putts'],
    control_velocidad: ['Putts cortos', '1 metro', '1.5 metros', '2 metros', 'Clock Drill', 'Circle Drill', 'Gate Drill', 'Around the World', 'Pressure Putting'],
    direccion: ['Puerta', 'Monedas', 'Línea', 'Salida de cara'],
    lectura: ['Caída izquierda', 'Caída derecha', 'Subida', 'Bajada'],
    competencias: ['21 puntos', '100 putts', 'Desafío 9 hoyos'],
  };

  const TRAINING_TYPES = ['putting', 'driver', 'madera', 'hibrido', 'hierros', 'wedges', 'bunker', 'chipping'];
  const IRON_NUMBERS = ['3', '4', '5', '6', '7', '8', '9', 'PW'];
  const WEDGE_LOFTS = ['50°', '54°', '60°'];
  const WEDGE_DISTANCES = [20, 30, 40, 50, 60, 70, 80, 90, 100];

  // Palos de golpe largo que se entrenan todos juntos en un único módulo
  // ("Entrenamiento de palos"), a diferencia de Putting/Wedges/Bunker/Chipping
  // que mantienen su propia pestaña por tener una lógica bien distinta.
  const PALOS_LARGOS = ['driver', 'madera', 'hibrido', 'hierros'];

  // ------------------------------------------------------------
  // TRAINING_CONFIGS
  // Configuración declarativa que alimenta al motor genérico de
  // entrenamiento (js/engine/training-engine.js). Cada tipo de
  // entrenamiento se arma agregando ejercicios; el motor es el
  // mismo para los 7 módulos, lo que cambia es esta config.
  //
  // - categories: agrupa ejercicios en el selector (opcional)
  // - exercises: lista plana de nombres si no hay categorías
  // - clubSelector: si el ejercicio requiere elegir un palo
  //   específico de la bolsa (hierros / wedges / driver / madera)
  // - trackDistance: si se captura carry/total promedio logrado
  // - trackContact: tipos de contacto (sólido/fino/pesado)
  // - trackDirection: lista de patrones de dirección a marcar
  // - trackQuality: si se registra bueno/regular/malo en vez de acierto/error
  // ------------------------------------------------------------
  const CONTACT_TYPES = ['Sólido', 'Fino', 'Pesado'];
  const DIRECTION_PATTERNS = ['Centro', 'Slice', 'Hook', 'Push', 'Pull', 'Draw', 'Fade'];
  const QUALITY_LEVELS = ['Bueno', 'Regular', 'Malo'];

  const TRAINING_CONFIGS = {
    putting: {
      label: 'Putting',
      categories: PUTTING_CATEGORIES,
      clubSelector: false,
      trackDistance: false,
      trackContact: false,
      trackDirection: false,
      trackQuality: false,
    },
    driver: {
      label: 'Driver',
      exercises: ['Fairway Challenge', '10 Drives', '20 Drives', 'Shot Shape', 'Control de dispersión'],
      clubSelector: false,
      trackDistance: true,
      trackContact: true,
      trackDirection: DIRECTION_PATTERNS,
      trackQuality: false,
    },
    madera: {
      label: 'Madera',
      exercises: ['Fairway Challenge', '10 Golpes', '20 Golpes', 'Shot Shape', 'Control de dispersión'],
      clubSelector: false,
      trackDistance: true,
      trackContact: true,
      trackDirection: DIRECTION_PATTERNS,
      trackQuality: false,
    },
    hibrido: {
      label: 'Híbrido',
      exercises: ['Fairway Challenge', '10 Golpes', '20 Golpes', 'Golpe desde el rough', 'Control de dispersión'],
      clubSelector: false,
      trackDistance: true,
      trackContact: true,
      trackDirection: DIRECTION_PATTERNS,
      trackQuality: false,
    },
    hierros: {
      label: 'Hierros',
      // TODO(Nico): reemplazar por el listado real de drills de hierros
      // apenas lo pases. Por ahora es un set placeholder razonable para
      // que la pantalla no quede vacía; la estructura no cambia, solo
      // este array.
      exercises: [
        'Golpe sólido (Ball Striking)',
        'Control de distancia — 3 golpes',
        'Trayectoria baja',
        'Trayectoria alta',
        'Dirección — Draw',
        'Dirección — Fade',
        'Descarga y divot',
        'Approach a bandera',
      ],
      clubSelector: true,
      clubOptions: IRON_NUMBERS,
      trackDistance: true,
      trackContact: true,
      trackDirection: DIRECTION_PATTERNS,
      trackQuality: false,
    },
    wedges: {
      label: 'Wedges',
      exercises: WEDGE_DISTANCES.map((d) => d + ' yardas'),
      clubSelector: true,
      clubOptions: WEDGE_LOFTS,
      trackDistance: true,
      trackContact: false,
      trackDirection: false,
      trackQuality: false,
      trackSpin: true,
    },
    bunker: {
      label: 'Bunker',
      exercises: ['Arena dura', 'Arena blanda', 'Lie enterrado', 'Lie normal'],
      clubSelector: false,
      trackDistance: true,
      trackContact: false,
      trackDirection: false,
      trackQuality: false,
    },
    chipping: {
      label: 'Chipping',
      exercises: ['Chip', 'Pitch', 'Bump & Run', 'Lob'],
      clubSelector: false,
      trackDistance: true,
      trackContact: false,
      trackDirection: false,
      trackQuality: false,
      trackUpDown: true,
    },
  };

  const CONDITION_FIELDS = ['cancha', 'tipoCancha', 'velocidadGreen', 'temperatura', 'viento', 'direccionViento', 'estadoCesped', 'pelota'];

  const GOAL_METRICS = [
    { key: 'putts_promedio', label: 'Promedio de putts por vuelta', higherIsBetter: false },
    { key: 'fairways_pct', label: '% de Fairways', higherIsBetter: true },
    { key: 'gir_pct', label: '% Greens en regulación', higherIsBetter: true },
    { key: 'score_promedio', label: 'Score promedio (relativo al par)', higherIsBetter: false },
    { key: 'triples_promedio', label: 'Triple bogeys por vuelta', higherIsBetter: false },
  ];

  GT.schema = {
    DB_KEY: DB_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    COLLECTIONS: COLLECTIONS,
    emptyDatabase: emptyDatabase,
    PUTTING_CATEGORIES: PUTTING_CATEGORIES,
    TRAINING_TYPES: TRAINING_TYPES,
    IRON_NUMBERS: IRON_NUMBERS,
    WEDGE_LOFTS: WEDGE_LOFTS,
    WEDGE_DISTANCES: WEDGE_DISTANCES,
    TRAINING_CONFIGS: TRAINING_CONFIGS,
    CONTACT_TYPES: CONTACT_TYPES,
    DIRECTION_PATTERNS: DIRECTION_PATTERNS,
    QUALITY_LEVELS: QUALITY_LEVELS,
    CONDITION_FIELDS: CONDITION_FIELDS,
    GOAL_METRICS: GOAL_METRICS,
  };
})(window.GT = window.GT || {});
