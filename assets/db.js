// assets/db.js — Gestión de datos via SheetDB

const API_URL = 'https://oportunidadesar.javier-sd-atos.workers.dev';

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

async function apiCall(params) {
  const url = API_URL + '?' + new URLSearchParams({ target: 'oportunidades', ...params }).toString();
  const res  = await fetch(url, { method: 'GET', redirect: 'follow' });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch(e) {
    console.error('Respuesta no-JSON:', text);
    throw new Error('Respuesta inválida del servidor');
  }
}

async function getData(forceRefresh = false) {
  if (!forceRefresh && _cache && (Date.now() - _cacheTs) < CACHE_TTL) {
    return _cache;
  }
  try {
    const json = await apiCall({ action: 'get' });
    if (json.ok) {
      _cache = json.data || [];
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
    const json = await apiCall({ action: 'add', data: JSON.stringify(data) });
    if (json.ok) { _cache = null; return json.id; }
    throw new Error(json.error);
  } catch (e) {
    console.error('Error agregando oportunidad:', e);
    throw e;
  }
}

async function updateOportunidad(id, data) {
  try {
    const json = await apiCall({ action: 'update', id, data: JSON.stringify(data) });
    if (json.ok) { _cache = null; return true; }
    throw new Error(json.error);
  } catch (e) {
    console.error('Error actualizando oportunidad:', e);
    throw e;
  }
}

async function deleteOportunidad(id) {
  try {
    const json = await apiCall({ action: 'delete', id });
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
    const estadoCounts = {};
    ESTADOS.forEach(e => estadoCounts[e] = 0);
    rows.forEach(r => { if (estadoCounts[r['Estado']] !== undefined) estadoCounts[r['Estado']]++; });
    const summaryData = [
      ['RESUMEN PIPELINE', ''], ['Generado', new Date().toLocaleString('es-AR')], ['', ''],
      ['Total Oportunidades', rows.length],
      ['TCV EUR Total', rows.reduce((s,r) => s+(parseFloat(r['TCV EUR'])||0), 0)],
      ['', ''], ['ESTADO', 'CANTIDAD'], ...ESTADOS.map(e => [e, estadoCounts[e]||0]),
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
