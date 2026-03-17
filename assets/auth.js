// assets/auth.js — Sistema de autenticación via Apps Script

const USERS_API = 'https://script.google.com/macros/s/AKfycbxWUeqpwVJkKWgHKl0zOj0cZRaV2PfjRpPXH8LFHgu0NVFA3GddnJZg_s0t48y-YlsuEA/exec';
const SESSION_KEY = 'presales_ar_session';

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// Llamada GET con parámetros — mismo patrón que db.js
async function apiCall(params) {
  const url = USERS_API + '?' + new URLSearchParams(params).toString();
  const res  = await fetch(url, { method: 'GET', redirect: 'follow' });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch(e) {
    console.error('Respuesta no-JSON:', text);
    throw new Error('Respuesta inválida del servidor');
  }
}

async function login(usuario, password) {
  try {
    const hashed = await sha256(password);
    const json   = await apiCall({ action: 'get' });
    if (!json.ok) throw new Error(json.error);
    const users = json.data;
    const user  = users.find(u =>
      u['Usuario'].toLowerCase() === usuario.toLowerCase() &&
      u['Contraseña'] === hashed &&
      u['Activo'] === 'SI'
    );
    if (!user) return { ok: false, error: 'Usuario o contraseña incorrectos' };
    const session = {
      usuario: user['Usuario'],
      nombre:  user['Nombre'],
      email:   user['Email'],
      perfil:  user['Perfil'],
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { ok: true, session };
  } catch(e) {
    console.error('Error en login:', e);
    return { ok: false, error: 'Error de conexión. Intentá de nuevo.' };
  }
}

function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.reload();
}

function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.href = '../login.html';
    return null;
  }
  return session;
}

async function changePassword(usuario, oldPassword, newPassword) {
  try {
    const oldHash = await sha256(oldPassword);
    const newHash = await sha256(newPassword);
    // Verificar contraseña actual
    const json  = await apiCall({ action: 'get' });
    if (!json.ok) throw new Error(json.error);
    const user = json.data.find(u =>
      u['Usuario'].toLowerCase() === usuario.toLowerCase() &&
      u['Contraseña'] === oldHash
    );
    if (!user) return { ok: false, error: 'Contraseña actual incorrecta' };
    // Actualizar contraseña
    const result = await apiCall({
      action:  'update',
      usuario: usuario,
      data:    JSON.stringify({ 'Contraseña': newHash })
    });
    if (result.ok) return { ok: true };
    return { ok: false, error: result.error || 'Error al actualizar contraseña' };
  } catch(e) {
    return { ok: false, error: 'Error de conexión' };
  }
}

async function getAllUsers() {
  const json = await apiCall({ action: 'get' });
  return json.ok ? json.data : [];
}

async function updateUser(usuario, data) {
  const result = await apiCall({
    action:  'update',
    usuario: usuario,
    data:    JSON.stringify(data)
  });
  return result.ok;
}

async function addUser(data) {
  const hashed = await sha256(data['Contraseña']);
  const result = await apiCall({
    action: 'add',
    data:   JSON.stringify({ ...data, 'Contraseña': hashed })
  });
  return result.ok;
}

window.AUTH = { login, getSession, logout, requireAuth, changePassword, getAllUsers, updateUser, addUser, sha256 };
