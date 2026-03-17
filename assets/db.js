// assets/db.js — Gestión de datos via SheetDB

const API_URL = 'https://sheetdb.io/api/v1/c3aj6u51o6sn2';

const COLUMNS = [
  'ID', 'Cliente', 'Industria', 'Práctica/Área',
  'Nombre de la Oportunidad', 'Descripción', 'Origen',
  'Responsable', 'Estado', 'Fecha de Inicio', 'Fecha de Entrega',
  'Notas', 'TCV', 'Currency', 'TCV EUR', 'Tipo de Cambio',
  '% Probabilidad', '% PM', 'Fecha Creación'
];

const ETAPAS   = ['En Desarrollo', 'Entregada', 'Finalizada'];
const ORIGENES = ['Fertilización', 'Otro', 'Proyecto', 'Renovación', 'RFP'];
const ESTADOS  = ['En Desarrollo', 'Entregada', 'Finalizada'];

let _cache = null;
let _cacheTs = 0;
const CACHE_TTL = 30000;

async function getData(forceRefresh = false) {
  if (!forceRefresh && _cache && (Date.now() - _cacheTs) < CACHE_TTL) {
    return _cache;
  }
  try {
    const res = await fetch(API_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const json = await res.json();
    _cache = Array.isArray(json) ? json : [];
    _cacheTs = Date.now();
    return _cache;
  } catch (e) {
    console.error('Error obteniendo datos:', e);
    return _cache || [];
  }
}

async function generateId() {
  const rows = await getData();
  const maxId = rows.reduce((m, r) => Math.max(m, parseInt(r['ID']) || 0), 0);
  return String(maxId + 1).padStart(4, '0');
}

async function addOportunidad(data) {
  try {
    const id = await generateId();
    const today = new Date().toLocaleDateString('es-AR');
    const row = { 'ID': id, ...data, 'Fecha Creación': today };
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: row })
    });
    const json = await res.json();
    if (json.created === 1 || json.created === '1') {
      _cache = null;
      return id;
    }
    throw new Error(JSON.stringify(json));
  } catch (e) {
    console.error('Error agregando oportunidad:', e);
    throw e;
  }
}

async function updateOportunidad(id, data) {
  try {
    const res = await fetch(`${API_URL}/ID/${id}`, {
      method: 'PATCH',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
    const json = await res.json();
    _cache = null;
    return true;
  } catch (e) {
    console.error('Error actualizando oportunidad:', e);
    throw e;
  }
}

async function deleteOportunidad(id) {
  try {
    const res = await fetch(`${API_URL}/ID/${id}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' }
    });
    _cache = null;
    return true;
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
      ['RESUMEN PIPELINE', ''], ['Generado', new Date().toLocaleString('es-AR')], ['', ''],
      ['Total Oportunidades', rows.length],
      ['Valor Total Pipeline (USD)', rows.filter(r => r['Estado']==='Activa').reduce((s,r) => s+(parseFloat(r['Valor Estimado (USD)'])||0), 0)],
      ['', ''], ['ETAPA', 'CANTIDAD'], ...ETAPAS.map(e => [e, etapaCounts[e]||0]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
    ws2['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([wbout], { type: 'application/octet-stream' }));
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
