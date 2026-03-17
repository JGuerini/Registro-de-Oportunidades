// assets/auth.js — Sistema de autenticación

const USERS_API = 'https://sheetdb.io/api/v1/aoezwo0d9hyea/sheet/Usuarios';
const SESSION_KEY = 'presales_ar_session';

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function login(usuario, password) {
  try {
    const hashed = await sha256(password);
    const res = await fetch(USERS_API, { headers: { 'Accept': 'application/json' } });
    const users = await res.json();
    const user = users.find(u =>
      u['Usuario'].toLowerCase() === usuario.toLowerCase() &&
      u['Contraseña'] === hashed &&
      u['Activo'] === 'SI'
    );
    if (!user) return { ok: false, error: 'Usuario o contraseña incorrectos' };
    const session = {
      usuario: user['Usuario'],
      nombre: user['Nombre'],
      email: user['Email'],
      perfil: user['Perfil'],
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
    const res = await fetch(USERS_API, { headers: { 'Accept': 'application/json' } });
    const users = await res.json();
    const user = users.find(u =>
      u['Usuario'].toLowerCase() === usuario.toLowerCase() &&
      u['Contraseña'] === oldHash
    );
    if (!user) return { ok: false, error: 'Contraseña actual incorrecta' };
    const patchRes = await fetch(`${USERS_API}/Usuario/${usuario}`, {
      method: 'PATCH',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { 'Contraseña': newHash } })
    });
    if (patchRes.ok) return { ok: true };
    return { ok: false, error: 'Error al actualizar contraseña' };
  } catch(e) {
    return { ok: false, error: 'Error de conexión' };
  }
}

// Solo para admin: gestión de usuarios
async function getAllUsers() {
  const res = await fetch(USERS_API, { headers: { 'Accept': 'application/json' } });
  return await res.json();
}

async function updateUser(usuario, data) {
  const res = await fetch(`${USERS_API}/Usuario/${usuario}`, {
    method: 'PATCH',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
  return res.ok;
}

async function addUser(data) {
  const hashed = await sha256(data['Contraseña']);
  const res = await fetch(USERS_API, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { ...data, 'Contraseña': hashed } })
  });
  const json = await res.json();
  return json.created === 1 || json.created === '1';
}

window.AUTH = { login, getSession, logout, requireAuth, changePassword, getAllUsers, updateUser, addUser, sha256 };
