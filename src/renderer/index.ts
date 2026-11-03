import { renderDownloads } from './downloads-ui';
import { translate } from '../shared/i18n';
import { isYoutubePage } from '../shared/youtube';
import { applyLanguage } from './language';
import { addressSelection } from './address';
import { applyAppearance } from './newtab/appearance';
import { musicPlayer } from './music';
import { renderSettings } from './settings-ui';
import { APP_NAME } from '../shared/config';
import type { State } from '../shared/types';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let state: State;
const tr = (source: string, values: Record<string, string | number> = {}) =>
  translate(source, state?.locale ?? 'es', values);
const call = (action: string, payload?: unknown) =>
  window.nido.call(action, payload).catch((error) => toast(String(error)));
function toast(message: string) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  setTimeout(() => ($('toast').hidden = true), 5000);
}
const focusAddress = addressSelection($<HTMLInputElement>('address'));
$('privacy-toggle').onclick = () => {
  if (state?.settings.browsingMode !== 'strict') showSettings(true);
  else void call('toggle-compatibility');
};
$('ai-toggle').onclick = () => void call('sidebar-toggle');
$('blocking').onclick = () => void call('toggle-blocking');
let settingsOpen = false;
let downloadsOpen = false;
let settingsSignature = '';
const updateMusic = musicPlayer((next) => {
  void call('settings', next);
});
function showSettings(open: boolean) {
  if (open) {
    downloadsOpen = false;
    $('downloads').hidden = true;
  }
  settingsOpen = open;
  $('settings').hidden = !open;
  void call('overlay', open);
  if (open) drawSettings();
}
function showDownloads(open: boolean) {
  downloadsOpen = open;
  if (open) {
    settingsOpen = false;
    $('settings').hidden = true;
  }
  $('downloads').hidden = !open;
  void call('overlay', open || settingsOpen);
  if (state) render();
}
$('downloads-toggle').onclick = () => showDownloads(!downloadsOpen);
$('downloads-close').onclick = () => showDownloads(false);
$('downloads-clear').onclick = () => void call('clear-downloads');
window.nido.onDownloads(() => showDownloads(!downloadsOpen));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (downloadsOpen) showDownloads(false);
    else if (settingsOpen) showSettings(false);
  }
});
function drawSettings() {
  const controls = [
    ...$('settings-body').querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select'),
  ];
  const focused = controls.indexOf(document.activeElement as HTMLInputElement);
  renderSettings(
    $('settings-body'),
    state.settings,
    (next) => {
      void call('settings', next);
    },
    (action) => {
      void call(action).then((result) => {
        if (typeof result === 'string') toast(result);
      });
    },
    state.locale,
  );
  if (focused >= 0)
    $('settings-body').querySelectorAll<HTMLElement>('input,select')[focused]?.focus();
}
$('settings-toggle').onclick = () => showSettings(!settingsOpen);
$('settings-close').onclick = () => showSettings(false);
document.title = APP_NAME;
$('brand').textContent = APP_NAME;
for (const action of ['new', 'back', 'forward', 'reload', 'home', 'minimize', 'maximize', 'quit'])
  $(action).onclick = () => void call(action);
$('address-form').onsubmit = (event) => {
  event.preventDefault();
  void call('navigate', $<HTMLInputElement>('address').value);
};
$('search-form').onsubmit = (event) => {
  event.preventDefault();
  void call('navigate', $<HTMLInputElement>('search').value);
};
document
  .querySelectorAll<HTMLElement>('[data-url]')
  .forEach((el) => (el.onclick = () => void call('navigate', el.dataset.url)));
window.nido.onFocusAddress(focusAddress);
window.nido.onState((next) => {
  state = next;
  render();
});
function render() {
  void applyAppearance(state.settings);
  applyLanguage(state.locale);
  const activeDownloads = state.downloads.filter(
    (d) => d.status === 'progressing' || d.canResume,
  ).length;
  $('downloads-count').textContent = activeDownloads ? String(activeDownloads) : '';
  if (downloadsOpen)
    renderDownloads($('downloads-body'), state, (id, action) => {
      void call('download', { id, action });
    });
  updateMusic(state.settings, state.locale);
  const globalMode = state.settings.browsingMode !== 'strict';
  $('privacy-toggle').textContent = globalMode
    ? tr('Cookies activadas')
    : state.compatible
      ? tr('Temporal')
      : tr('Estricto');
  $<HTMLButtonElement>('privacy-toggle').disabled = !state.tabs
    .find((tab) => tab.id === state.active)
    ?.url.startsWith('http');
  $('privacy-toggle').title = globalMode
    ? tr('Cookies propias activadas en todas las páginas. Gestionar datos en ajustes.')
    : state.compatible
      ? tr('Volver al modo estricto y borrar los datos temporales del sitio')
      : tr('Permitir cookies propias y almacenamiento temporal para este sitio');
  const privacy = globalMode
    ? [
        state.settings.browsingMode === 'persistent'
          ? 'Sesiones guardadas en este equipo'
          : 'Datos hasta cerrar Nido',
        'Cookies de terceros bloqueadas',
        'Sin telemetría',
      ]
    : state.compatible
      ? ['Compatibilidad temporal', 'Cookies de terceros bloqueadas', 'Sin telemetría']
      : [
          'Sesión efímera',
          state.settings.allowSessionCookies ? 'Cookies propias temporales' : 'Sin cookies',
          'Sin telemetría',
        ];
  $('privacy-status').textContent = privacy.map((value) => tr(value)).join(' · ');
  const signature = JSON.stringify(state.settings);
  if (settingsOpen && signature !== settingsSignature) drawSettings();
  settingsSignature = signature;
  const tab = state.tabs.find((t) => t.id === state.active);
  $('tabs').replaceChildren(
    ...state.tabs.map((t) => {
      const el = document.createElement('div');
      el.className = `tab ${t.id === state.active ? 'active' : ''}`;
      el.draggable = true;
      el.dataset.tabId = t.id;
      el.role = 'tab';
      el.setAttribute('aria-selected', String(t.id === state.active));
      const label = document.createElement('button');
      label.textContent = `${t.suspended ? '◌ ' : '○ '}${t.title}`;
      label.onclick = () => void call('activate', t.id);
      const close = document.createElement('button');
      close.className = 'tab-close';
      close.textContent = '×';
      close.setAttribute('aria-label', tr('Cerrar {title}', { title: t.title }));
      close.onclick = () => void call('close', t.id);
      el.append(label, close);
      el.ondragstart = (e) => e.dataTransfer?.setData('text/plain', t.id);
      el.ondragover = (e) => e.preventDefault();
      el.ondrop = (e) => {
        e.preventDefault();
        void call('reorder', { id: e.dataTransfer?.getData('text/plain'), target: t.id });
      };
      return el;
    }),
  );
  if (document.activeElement !== $('address'))
    $<HTMLInputElement>('address').value = tab?.url.startsWith('nido:') ? '' : (tab?.url ?? '');
  $<HTMLButtonElement>('back').disabled = !tab?.canBack;
  $<HTMLButtonElement>('forward').disabled = !tab?.canForward;
  $('newtab').hidden = tab?.url !== 'nido://app/newtab';
  const pausedYoutube = state.youtubePaused && isYoutubePage(tab?.url ?? '');
  $('blocked').textContent = pausedYoutube
    ? tr('PAUSA')
    : state.blockingDisabled
      ? 'OFF'
      : String(tab?.blocked ?? 0);
  $('blocking').title = tr(
    pausedYoutube
      ? 'Bloqueo pausado en YouTube. Pulsa para reactivarlo.'
      : isYoutubePage(tab?.url ?? '') && !state.blockingDisabled
        ? 'Filtro del reproductor activo. El contador solo incluye peticiones bloqueadas.'
        : 'Bloqueo en este sitio',
  );
  $('youtube-status').hidden = !pausedYoutube;
  $('youtube-status').textContent = tr('YouTube: bloqueo pausado; se permiten anuncios.');
  renderSidebar();
  $('http-warning').hidden = !tab?.url.startsWith('http:');
}
void call('state');

function renderSidebar() {
  const width = Math.min(state.settings.sidebarWidth, Math.max(280, window.innerWidth - 360));
  const left = state.settings.sidebarSide === 'left';
  $('sidebar-ui').hidden = !state.sidebar;
  Object.assign($('sidebar-ui').style, {
    width: `${width}px`,
    left: left ? '0' : 'auto',
    right: left ? 'auto' : '0',
  });
  Object.assign($('sidebar-handle').style, {
    left: left ? 'auto' : '-3px',
    right: left ? '-3px' : 'auto',
  });
  Object.assign($('newtab').style, {
    left: state.sidebar && left ? `${width}px` : '0',
    right: state.sidebar && !left ? `${width}px` : '0',
  });
  $('provider-bar').replaceChildren(
    ...state.settings.providers.map((p) => {
      const button = document.createElement('button');
      button.textContent = `${p.icon} ${p.name}`;
      button.classList.toggle('selected', p.id === state.provider);
      button.onclick = () => void call('provider', p.id);
      return button;
    }),
  );
}
let resizing = false;
$('sidebar-handle').onpointerdown = (event) => {
  resizing = true;
  $('sidebar-handle').setPointerCapture(event.pointerId);
  void call('overlay', true);
};
$('sidebar-handle').onpointermove = (event) => {
  if (!resizing) return;
  const width = state.settings.sidebarSide === 'left' ? event.clientX : innerWidth - event.clientX;
  state.settings.sidebarWidth = Math.max(280, Math.min(900, width));
  renderSidebar();
};
$('sidebar-handle').onpointercancel = () => {
  resizing = false;
  void call('overlay', settingsOpen || downloadsOpen);
};
$('sidebar-handle').onpointerup = () => {
  resizing = false;
  void call('settings', state.settings);
  void call('overlay', settingsOpen || downloadsOpen);
};
$('sidebar-handle').onkeydown = (event) => {
  if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    const direction = state.settings.sidebarSide === 'left' ? 1 : -1;
    state.settings.sidebarWidth = Math.max(
      280,
      Math.min(
        900,
        state.settings.sidebarWidth + (event.key === 'ArrowRight' ? 20 : -20) * direction,
      ),
    );
    void call('settings', state.settings);
  }
};
window.addEventListener('resize', () => {
  if (state) renderSidebar();
});
