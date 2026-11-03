import { translate, type Locale } from '../shared/i18n';
export function applyLanguage(locale: Locale) {
  const tr = (source: string) => translate(source, locale);
  document.documentElement.lang = locale;
  document.getElementById('ai-toggle')!.textContent = locale === 'en' ? '✦ AI' : '✦ IA';
  const texts: Record<string, string> = {
    greeting: 'TU RINCÓN EN INTERNET',
    'welcome-title': 'Un poco de calma.',
    'welcome-subtitle': 'Un mundo por descubrir.',
    tagline: 'Tu navegador. Tu ritmo. Tu espacio.',
    'page-caption': '◒ Hecho para quedarte a gusto.',
    'space-label': 'ESPACIO PERSONAL',
    'http-warning': '⚠ Conexión HTTP sin cifrar',
    'settings-kicker': 'A TU MANERA',
    'settings-title': 'Ajustes',
    'downloads-title': 'Descargas',
    'downloads-clear': 'Limpiar terminadas',
    'downloads-note':
      'El registro se borra al salir; los archivos guardados permanecen. Las descargas activas se cancelan al cerrar Nido.',
  };
  for (const [id, source] of Object.entries(texts))
    document.getElementById(id)!.textContent = tr(source);
  const attributes: Record<string, Record<string, string>> = {
    new: { title: 'Nueva pestaña (Ctrl/Cmd+T)' },
    minimize: { 'aria-label': 'Minimizar' },
    maximize: { 'aria-label': 'Maximizar' },
    quit: { 'aria-label': 'Cerrar ventana' },
    back: { 'aria-label': 'Atrás' },
    forward: { 'aria-label': 'Adelante' },
    reload: { 'aria-label': 'Recargar' },
    home: { 'aria-label': 'Inicio' },
    security: { title: 'Estado de conexión' },
    address: { 'aria-label': 'Dirección o búsqueda', placeholder: 'Busca o escribe una dirección' },
    search: { 'aria-label': 'Buscar', placeholder: '¿Qué te apetece descubrir?' },
    'ai-toggle': { title: 'Asistentes (Ctrl/Cmd+Shift+A)' },
    'settings-toggle': { 'aria-label': 'Ajustes' },
    settings: { 'aria-label': 'Ajustes' },
    downloads: { 'aria-label': 'Descargas' },
    'downloads-toggle': { 'aria-label': 'Descargas', title: 'Descargas (Ctrl/Cmd+J)' },
    'downloads-close': { 'aria-label': 'Cerrar descargas' },
    'settings-close': { 'aria-label': 'Cerrar ajustes' },
    'sidebar-handle': { 'aria-label': 'Ancho de la sidebar' },
  };
  for (const [id, values] of Object.entries(attributes))
    for (const [name, source] of Object.entries(values))
      document.getElementById(id)!.setAttribute(name, tr(source));
}
