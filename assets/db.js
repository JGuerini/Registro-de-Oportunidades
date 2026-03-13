// assets/db.js — Gestión de datos via Google Sheets (Apps Script API)

const API_URL = 'https://script.google.com/a/macros/atos.net/s/AKfycbw80mlzr_JD1ZhF-f5pUgrpVoB0Q1Wd7Xu3D5TuDwcz7AKzIYBRzwl1-WaJa4HQPsfLcA/exec';

const COLUMNS = [
  'ID', 'Nombre de Oportunidad', 'Empresa / Cliente', 'Contacto',
  'Email', 'Teléfono', 'Valor Estimado (USD)', 'Moneda', 'Etapa',
  'Probabilidad (%)', 'Fecha Creación', 'Fecha Cierre Est.',
  'Responsable', 'Origen', 'Producto / Servicio', 'Descripción',
  'Próximo Paso', 'Estado', 'Notas'
];

const ETAPAS  = ['Prospecto', 'Calificación', 'Propuesta', 'Negociación', 'Cerrado Ganado', 'Cerrado Perdido'];
const ORIGENES = ['Referido', 'Web', 'LinkedIn', 'Email frío', 'Evento', 'Partner', 'Otro'];
const ESTADOS  = ['Activa', 'En pausa', 'Cerrada'];

// ── Cache local para no refrescar en cada operación menor ──
let _cache = null;
let _cacheTs = 0;
const CACHE_TTL = 30000; // 30 segundos

async function getData(forceRefresh = false) {
  if (!forceRefresh && _cache && (Date.now() - _cacheTs) < CACHE_TTL) {
    return _cache;
  }
  try {
    const res = await fetch(API_URL, { method: 'GET' });
    const json = await res.json();
    if (json.ok) {
      _cache = json.data;
      _cacheTs = Date.now();
      return _cache;
    }
    throw new Error(json.error);
  } catch (e) {
    console.error('Error obteniendo datos:', e);
    return _cache || [];
  }
}

async function addOportunidad(data) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'add', data }),
    });
    const json = await res.json();
    if (json.ok) { _cache = null; return json.id; }
    throw new Error(json.error);
  } catch (e) {
    console.error('Error agregando oportunidad:', e);
    throw e;
  }
}

async function updateOportunidad(id, data) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'update', id, data }),
    });
    const json = await res.json();
    if (json.ok) { _cache = null; return true; }
    throw new Error(json.error);
  } catch (e) {
    console.error('Error actualizando oportunidad:', e);
    throw e;
  }
}

async function deleteOportunidad(id) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', id }),
    });
    const json = await res.json();
    if (json.ok) { _cache = null; return true; }
    throw new Error(json.error);
  } catch (e) {
    console.error('Error eliminando oportunidad:', e);
    throw e;
  }
}

async function getOportunidad(id) {
  const rows = await getData();
  return rows.find(r => r['ID'] === id) || null;
}

function downloadExcel(rows) {
  if (typeof XLSX === 'undefined') return;
  try {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [Object.fromEntries(COLUMNS.map(c => [c, '']))]);
    ws['!cols'] = [6,30,25,20,25,15,18,10,16,14,14,14,18,14,20,30,25,12,25].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Oportunidades');

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

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'oportunidades.xlsx';
    a.click();
  } catch(e) {
    console.error('Error exportando Excel:', e);
  }
}

window.CRM = {
  getData, addOportunidad, updateOportunidad, deleteOportunidad,
  getOportunidad, downloadExcel, COLUMNS, ETAPAS, ORIGENES, ESTADOS
};
