// ============================================================
// BACKUP.JS
// Exportadores a CSV (compatible con Excel / Google Sheets al
// abrirlo directamente). No se genera un .xlsx binario real para
// no sumar una librería externa pesada — el CSV cubre el caso de
// uso de "llevar los datos a una planilla" sin romper el principio
// de cero dependencias del proyecto.
// ============================================================

(function (GT) {
  'use strict';

  function toCSVValue(v) {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? '"' + s + '"' : s;
  }

  function rowsToCSV(headers, rows) {
    const lines = [headers.join(';')];
    rows.forEach((r) => lines.push(r.map(toCSVValue).join(';')));
    return '\uFEFF' + lines.join('\n'); // BOM para que Excel abra bien los acentos
  }

  function exportSessionsCSV() {
    const sessions = GT.storage.getAll(GT.schema.COLLECTIONS.SESSIONS);
    const headers = ['Fecha', 'Hora', 'Tipo', 'Duración (min)', 'Ejercicio', 'Palo', 'Aciertos', 'Errores', 'Golpes', '% Acierto', 'Notas'];
    const rows = [];
    sessions.forEach((s) => {
      (s.ejercicios || []).forEach((e) => {
        rows.push([
          s.fecha, s.hora, s.tipoEntrenamiento, s.duracionMin,
          e.nombre, e.palo || '', e.aciertos || 0, e.errores || 0, e.golpes || 0,
          e.golpes ? GT.utils.round((e.aciertos / e.golpes) * 100, 0) : '',
          e.notas || '',
        ]);
      });
    });
    const csv = rowsToCSV(headers, rows);
    GT.storage.exportAdapters.local.export(csv, 'entrenamientos-' + GT.utils.todayISO() + '.csv');
  }

  function exportRoundsCSV() {
    const rounds = GT.storage.getAll(GT.schema.COLLECTIONS.ROUNDS);
    const headers = ['Fecha', 'Cancha', 'Tipo', 'Score', 'Relativo al par', 'Putts', 'Fairways %', 'GIR %', 'Up&Down %', 'Sand Save %', 'Penales', 'Birdies', 'Pares', 'Bogeys', 'Dobles', 'Triples'];
    const rows = rounds.map((r) => [
      r.fecha, r.cancha, r.tipo, r.scoreTotal, r.scoreRelativo, r.puttsTotal,
      r.fairwaysPct, r.girPct, r.upDownPct, r.sandSavePct, r.penales,
      r.birdies, r.pars, r.bogeys, r.dobles, r.triples,
    ]);
    const csv = rowsToCSV(headers, rows);
    GT.storage.exportAdapters.local.export(csv, 'vueltas-' + GT.utils.todayISO() + '.csv');
  }

  GT.backup = { exportSessionsCSV: exportSessionsCSV, exportRoundsCSV: exportRoundsCSV };
})(window.GT = window.GT || {});
