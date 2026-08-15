// ============================================================
// CONFIDENCE.JS
// Índice de confianza 0-100 por palo. Se muestra en Mi Bolsa.
//
// Fórmula (documentada, no es una caja negra):
//   - Precisión: % de acierto en los ejercicios ligados a ese palo.
//   - Consistencia: inversa del coeficiente de variación del carry
//     (desviación estándar / promedio). Menos dispersión = más confianza.
//   - Confianza final = 60% precisión + 40% consistencia, si hay
//     datos de distancia; si no, es directamente la precisión.
//   - Con menos de 5 golpes registrados no se calcula (dato insuficiente).
//
// Dos formas de traer los datos base, según el palo:
//   - Hierro / Wedge: por palo específico (usa el campo "palo" del
//     ejercicio, ej. "7" o "54°") vía getClubExerciseStats.
//   - Driver / Madera / Híbrido / Putter: no hay selector de palo
//     específico dentro del ejercicio, así que se agrega por TIPO
//     de entrenamiento completo vía getTypeExerciseStats.
// ============================================================

(function (GT) {
  'use strict';

  const MIN_MUESTRAS = 5;

  /**
   * @param {Object} opts
   * @param {string} [opts.palo]  Ej. "7", "PW", "54°" — usa getClubExerciseStats.
   * @param {string} [opts.tipo]  Ej. "driver", "madera", "hibrido", "putting" — usa getTypeExerciseStats.
   */
  function computeConfidence(opts) {
    const stats = opts.palo
      ? GT.engine.stats.getClubExerciseStats(opts.palo)
      : GT.engine.stats.getTypeExerciseStats(opts.tipo);

    if (!stats.muestras || stats.muestras < MIN_MUESTRAS) {
      return { score: null, status: 'none', stats: stats };
    }

    let score = stats.pct !== null ? stats.pct : 50;

    if (stats.carryAvg && stats.carryStdDev !== null && stats.carryAvg > 0) {
      const cv = stats.carryStdDev / stats.carryAvg;
      const consistencyScore = GT.utils.clamp(100 - cv * 100, 0, 100);
      score = Math.round(0.6 * score + 0.4 * consistencyScore);
    }

    return { score: score, status: GT.engine.stats.statusFromPct(score), stats: stats };
  }

  GT.engine = GT.engine || {};
  GT.engine.confidence = { compute: computeConfidence, MIN_MUESTRAS: MIN_MUESTRAS };
})(window.GT = window.GT || {});
