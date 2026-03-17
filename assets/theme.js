// assets/theme.js — Gestión de tema claro/oscuro por usuario

const THEME_KEY_PREFIX = 'presales_ar_theme_';

function getThemeKey() {
  try {
    const raw = sessionStorage.getItem('presales_ar_session');
    const session = raw ? JSON.parse(raw) : null;
    return session ? THEME_KEY_PREFIX + session.usuario : THEME_KEY_PREFIX + 'default';
  } catch { return THEME_KEY_PREFIX + 'default'; }
}

function getSavedTheme() {
  return localStorage.getItem(getThemeKey()) || 'light';
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

function saveTheme(theme) {
  localStorage.setItem(getThemeKey(), theme);
  applyTheme(theme);
  // Propagar a todos los iframes abiertos
  try {
    const frame = document.getElementById('contentFrame');
    if (frame && frame.contentWindow) {
      frame.contentWindow.document.body.classList.toggle('dark-mode', theme === 'dark');
    }
  } catch(e) {}
}

function toggleTheme() {
  const current = getSavedTheme();
  saveTheme(current === 'dark' ? 'light' : 'dark');
}

function initTheme() {
  applyTheme(getSavedTheme());
}

// Aplicar tema inmediatamente al cargar
initTheme();

window.THEME = { getSavedTheme, applyTheme, saveTheme, toggleTheme, initTheme };
