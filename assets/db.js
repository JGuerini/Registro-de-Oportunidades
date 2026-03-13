// assets/db.js — Gestión del Excel local con SheetJS
// El archivo Excel vive en assets/oportunidades.xlsx (simulado en localStorage por restricción de browsers)
// En un entorno de servidor real, se haría fetch/PUT al archivo.

const DB_KEY = 'pipeline_crm_data';

const COLUMNS = [
  'ID',
  'Nombre de Oportunidad',
  'Empresa / Cliente',
  'Contacto',
  'Email',
  'Teléfono',
  'Valor Estimado (USD)',
  'Moneda',
  'Etapa',
  'Probabilidad (%)',
  'Fecha Creación',
  'Fecha Cierre Est.',
  'Responsable',
  'Origen',
  'Producto / Servicio',
  'Descripción',
  'Próximo Paso',
  'Estado',
  'Notas',
];

const ETAPAS = ['Prospecto', 'Calificación', 'Propuesta', 'Negociación', 'Cerrado Ganado', 'Cerrado Perdido'];
const ORIGENES = ['Referido', 'Web', 'LinkedIn', 'Email frío', 'Evento', 'Partner', 'Otro'];
const ESTADOS = ['Activa', 'En pausa', 'Cerrada'];

function getData() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveData(rows) {
  localStorage.setItem(DB_KEY, JSON.stringify(rows));
  exportToExcel(rows);
}

function generateId() {
  const rows = getData();
  const maxId = rows.reduce((m, r) => Math.max(m, parseInt(r['ID']) || 0), 0);
  return String(maxId + 1).padStart(4, '0');
}

function addOportunidad(data) {
  const rows = getData();
  const row = { 'ID': generateId(), ...data, 'Fecha Creación': new Date().toLocaleDateString('es-AR') };
  rows.push(row);
  saveData(rows);
  return row['ID'];
}

function updateOportunidad(id, data) {
  const rows = getData();
  const idx = rows.findIndex(r => r['ID'] === id);
  if (idx === -1) return false;
  rows[idx] = { ...rows[idx], ...data };
  saveData(rows);
  return true;
}

function deleteOportunidad(id) {
  const rows = getData().filter(r => r['ID'] !== id);
  saveData(rows);
}

function getOportunidad(id) {
  return getData().find(r => r['ID'] === id) || null;
}

// ── Export a Excel usando SheetJS ──
function exportToExcel(rows) {
  if (typeof XLSX === 'undefined') return;
  try {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [Object.fromEntries(COLUMNS.map(c => [c, '']))]);
    // Ancho de columnas
    ws['!cols'] = COLUMNS.map((_, i) => ({ wch: [6, 30, 25, 20, 25, 15, 18, 10, 16, 14, 14, 14, 18, 14, 20, 30, 25, 12, 25][i] || 15 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Oportunidades');

    // Hoja de resumen
    const etapaCounts = {};
    ETAPAS.forEach(e => etapaCounts[e] = 0);
    rows.forEach(r => { if (etapaCounts[r['Etapa']] !== undefined) etapaCounts[r['Etapa']]++; });
    const summaryData = [
      ['RESUMEN PIPELINE', ''],
      ['Generado', new Date().toLocaleString('es-AR')],
      ['', ''],
      ['Total Oportunidades', rows.length],
      ['Valor Total Pipeline (USD)', rows.filter(r => r['Estado'] === 'Activa').reduce((s, r) => s + (parseFloat(r['Valor Estimado (USD)']) || 0), 0)],
      ['', ''],
      ['ETAPA', 'CANTIDAD'],
      ...ETAPAS.map(e => [e, etapaCounts[e] || 0]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
    ws2['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');

    // Guardar como blob en memoria (no se puede escribir a disco desde browser)
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    // Guardar URL para descarga posterior
    window._excelBlobUrl = url;
    window._excelBlob = blob;
  } catch(e) {
    console.error('Error exportando Excel:', e);
  }
}

function downloadExcel() {
  const rows = getData();
  exportToExcel(rows);
  setTimeout(() => {
    if (window._excelBlobUrl) {
      const a = document.createElement('a');
      a.href = window._excelBlobUrl;
      a.download = 'oportunidades.xlsx';
      a.click();
    }
  }, 100);
}

// Exponer globalmente
window.CRM = { getData, saveData, addOportunidad, updateOportunidad, deleteOportunidad, getOportunidad, generateId, downloadExcel, COLUMNS, ETAPAS, ORIGENES, ESTADOS };
