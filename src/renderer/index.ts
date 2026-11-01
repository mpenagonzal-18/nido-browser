import { applyAppearance } from './newtab/appearance';
import { musicPlayer } from './music';
import { renderSettings } from './settings-ui';
import { APP_NAME } from '../shared/config';
import type { State } from '../shared/types';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let state: State;
const call = (action: string, payload?: unknown) =>
  window.nido.call(action, payload).catch((error) => toast(String(error)));
function toast(message: string) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  setTimeout(() => ($('toast').hidden = true), 5000);
}
$('ai-toggle').onclick = () => void call('sidebar-toggle');
$('blocking').onclick = () => void call('toggle-blocking');
let settingsOpen = false;
let settingsSignature = '';
const updateMusic = musicPlayer((next) => {
  void call('settings', next);
});
function showSettings(open: boolean) {
  settingsOpen = open;
  $('settings').hidden = !open;
  void call('overlay', open);
  if (open) drawSettings();
}
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
window.nido.onFocusAddress(() => {
  const input = $<HTMLInputElement>('address');
  input.focus();
  input.select();
});
window.nido.onState((next) => {
  state = next;
  render();
});
function render() {
  void applyAppearance(state.settings);
  updateMusic(state.settings);
  $('privacy-status').textContent =
    `Sesión efímera · ${state.settings.allowSessionCookies ? 'Cookies propias temporales' : 'Sin cookies'} · Sin telemetría`;
  const signature = JSON.stringify(state.settings);
  if (settingsOpen && signature !== settingsSignature) drawSettings();
  settingsSignature = signature;
  const tab = state.tabs.find((t) => t.id === state.active);
  $('tabs').replaceChildren(
    ...state.tabs.map((t) => {
      const el = document.createElement('div');
      el.className = `tab ${t.id === state.active ? 'active' : ''}`;
      el.draggable = true;
      el.role = 'tab';
      el.setAttribute('aria-selected', String(t.id === state.active));
      const label = document.createElement('button');
      label.textContent = `${t.suspended ? '◌ ' : '○ '}${t.title}`;
      label.onclick = () => void call('activate', t.id);
      const close = document.createElement('button');
      close.className = 'tab-close';
      close.textContent = '×';
      close.setAttribute('aria-label', `Cerrar ${t.title}`);
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
  $('blocked').textContent = state.blockingDisabled ? 'OFF' : String(tab?.blocked ?? 0);
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
  void call('overlay', settingsOpen);
};
$('sidebar-handle').onpointerup = () => {
  resizing = false;
  void call('settings', state.settings);
  void call('overlay', settingsOpen);
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
