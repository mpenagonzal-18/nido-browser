import type { State } from '../shared/types';
import { translate } from '../shared/i18n';
export function renderDownloads(
  root: HTMLElement,
  state: State,
  action: (id: string, action: string) => void,
) {
  const tr = (source: string) => translate(source, state.locale);
  const focused = (document.activeElement as HTMLElement)?.dataset.downloadAction;
  const bytes = (n: number) =>
    new Intl.NumberFormat(state.locale, { maximumFractionDigits: 1 }).format(n / 1048576) + ' MB';
  root.replaceChildren();
  if (!state.downloads.length) {
    const empty = document.createElement('p');
    empty.textContent = tr('No hay descargas en esta ejecución.');
    root.append(empty);
  }
  for (const download of state.downloads) {
    const row = document.createElement('article');
    row.className = 'download-row';
    const name = document.createElement('strong');
    name.textContent = download.name;
    const status = document.createElement('p');
    const label =
      download.status === 'completed'
        ? 'Completada'
        : download.status === 'cancelled'
          ? 'Cancelada'
          : download.status === 'interrupted'
            ? 'Interrumpida'
            : download.paused
              ? 'En pausa'
              : 'Descargando';
    status.textContent = `${tr(label)} · ${bytes(download.received)}${download.total > 0 ? ' / ' + bytes(download.total) : ''}`;
    const progress = document.createElement('progress');
    progress.setAttribute('aria-label', download.name);
    if (download.total > 0) {
      progress.max = download.total;
      progress.value = download.received;
    }
    if (download.status === 'completed') {
      progress.max = 1;
      progress.value = 1;
    }
    const controls = document.createElement('div');
    controls.className = 'download-actions';
    const button = (label: string, cmd: string) => {
      const el = document.createElement('button');
      el.textContent = tr(label);
      el.dataset.downloadAction = download.id + ':' + cmd;
      el.onclick = () => action(download.id, cmd);
      controls.append(el);
    };
    if (download.status === 'progressing') {
      button(download.paused ? 'Reanudar' : 'Pausar', download.paused ? 'resume' : 'pause');
      button('Cancelar', 'cancel');
    } else if (download.status === 'interrupted' && download.canResume) {
      button('Reanudar', 'resume');
      button('Cancelar', 'cancel');
    }
    if (download.status === 'completed') {
      button('Abrir archivo', 'open');
      button('Mostrar en carpeta', 'folder');
    }
    row.append(name, status, progress, controls);
    root.append(row);
  }
  if (focused)
    [...root.querySelectorAll<HTMLElement>('button')]
      .find((el) => el.dataset.downloadAction === focused)
      ?.focus();
}
