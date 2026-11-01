import { APP_NAME } from '../shared/config';
import type { State } from '../shared/types';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let state: State;
const call = (action: string, payload?: unknown) => window.nido.call(action, payload).catch(error => toast(String(error)));
function toast(message: string) { $('toast').textContent = message; $('toast').hidden = false; setTimeout(() => $('toast').hidden = true, 5000); }
$('brand').textContent = APP_NAME;
for (const action of ['new', 'back', 'forward', 'reload', 'home', 'minimize', 'maximize', 'quit']) $(action).onclick = () => void call(action);
$('address-form').onsubmit = event => { event.preventDefault(); void call('navigate', $<HTMLInputElement>('address').value); };
$('search-form').onsubmit = event => { event.preventDefault(); void call('navigate', $<HTMLInputElement>('search').value); };
document.querySelectorAll<HTMLElement>('[data-url]').forEach(el => el.onclick = () => void call('navigate', el.dataset.url));
window.nido.onFocusAddress(() => { const input = $<HTMLInputElement>('address'); input.focus(); input.select(); });
window.nido.onState(next => { state = next; render(); });
function render() {
  const tab = state.tabs.find(t => t.id === state.active);
  $('tabs').replaceChildren(...state.tabs.map(t => {
    const el = document.createElement('div'); el.className = `tab ${t.id === state.active ? 'active' : ''}`; el.draggable = true; el.role = 'tab'; el.setAttribute('aria-selected', String(t.id === state.active));
    const label = document.createElement('button'); label.textContent = `${t.suspended ? '◌ ' : '○ '}${t.title}`; label.onclick = () => void call('activate', t.id);
    const close = document.createElement('button'); close.className = 'tab-close'; close.textContent = '×'; close.setAttribute('aria-label', `Cerrar ${t.title}`); close.onclick = () => void call('close', t.id);
    el.append(label, close); el.ondragstart = e => e.dataTransfer?.setData('text/plain', t.id); el.ondragover = e => e.preventDefault(); el.ondrop = e => { e.preventDefault(); void call('reorder', { id: e.dataTransfer?.getData('text/plain'), target: t.id }); }; return el;
  }));
  if (document.activeElement !== $('address')) $<HTMLInputElement>('address').value = tab?.url.startsWith('nido:') ? '' : tab?.url ?? '';
  $<HTMLButtonElement>('back').disabled = !tab?.canBack; $<HTMLButtonElement>('forward').disabled = !tab?.canForward;
  $('newtab').hidden = tab?.url !== 'nido://app/newtab'; $('blocked').textContent = String(tab?.blocked ?? 0);
  $('http-warning').hidden = !tab?.url.startsWith('http:');
}
void call('state');
