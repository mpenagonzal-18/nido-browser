import { COLOR_THEMES } from '../shared/themes';
import { translate, OPTION_NAMES, type Locale } from '../shared/i18n';
import type { Settings } from '../shared/settings';
import { applyAppearance } from './newtab/appearance';
export function renderSettings(
  root: HTMLElement,
  initial: Settings,
  save: (settings: Settings) => void,
  action: (name: string) => void,
  locale: Locale = 'es',
) {
  const s = structuredClone(initial);
  const tr = (source: string, values: Record<string, string | number> = {}) =>
    translate(source, locale, values);
  root.replaceChildren();
  const group = (title: string, note?: string) => {
    const el = document.createElement('section');
    el.className = 'group';
    const h = document.createElement('h3');
    h.textContent = tr(title);
    el.append(h);
    if (note) {
      const p = document.createElement('p');
      p.textContent = tr(note);
      el.append(p);
    }
    root.append(el);
    return el;
  };
  const preview = document.createElement('div');
  const paintPreview = () => {
    preview.style.color = s.accent;
    preview.style.setProperty('--preview-blur', `${s.wallpaper.blur}px`);
    void applyAppearance(s).then(() => {
      preview.style.setProperty(
        '--preview-bg',
        document.getElementById('wallpaper')!.style.background,
      );
    });
  };
  const commit = () => {
    paintPreview();
    void applyAppearance(s);
    save(structuredClone(s));
  };
  const field = (
    parent: HTMLElement,
    name: string,
    value: string | number | boolean,
    set: (v: string) => void,
    type = 'text',
    options?: string[],
  ) => {
    const label = document.createElement('label');
    label.className = 'field';
    const text = document.createElement('span');
    text.textContent = tr(name);
    const input = options ? document.createElement('select') : document.createElement('input');
    if (input instanceof HTMLInputElement) {
      input.type = type;
      if (typeof value === 'boolean') input.checked = value;
      if (type === 'number') {
        input.min = '0';
        input.max = '240';
      }
      if (type === 'range') {
        input.min = '0';
        input.max = name.includes('Oscurecimiento') ? '.9' : '30';
        input.step = '.1';
      }
    }
    if (options)
      for (const option of options) {
        const el = document.createElement('option');
        el.value = option;
        el.textContent = tr(
          COLOR_THEMES.find((t) => t.id === option)?.name ?? OPTION_NAMES[option] ?? option,
        );
        input.append(el);
      }
    input.value = String(value);
    input.onchange = () => {
      set(
        input instanceof HTMLInputElement && type === 'checkbox'
          ? String(input.checked)
          : input.value,
      );
      commit();
    };
    if (type === 'color' || type === 'range')
      input.oninput = () => {
        set(input.value);
        paintPreview();
        void applyAppearance(s);
      };
    label.append(text, input);
    parent.append(label);
    return input;
  };
  const button = (parent: HTMLElement, label: string, fn: () => void) => {
    const el = document.createElement('button');
    el.className = 'primary';
    el.textContent = tr(label);
    el.onclick = fn;
    parent.append(el);
  };
  const languages = group('Idioma de la interfaz');
  field(languages, 'Idioma', s.language, (v) => (s.language = v as Settings['language']), 'text', [
    'system',
    'es',
    'en',
  ]);
  const appearance = group('Color y fondo');
  preview.className = 'appearance-preview';
  preview.textContent = tr('Un poco de calma. Un mundo por descubrir.');
  appearance.append(preview);
  const presets = document.createElement('div');
  presets.className = 'theme-presets';
  presets.setAttribute('aria-label', tr('Temas de gradiente'));
  for (const theme of COLOR_THEMES) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.textContent = tr(theme.name);
    tile.style.background = theme.gradient;
    tile.setAttribute(
      'aria-pressed',
      String(s.colorTheme === theme.id && s.gradientPreset === theme.id),
    );
    tile.onclick = () => {
      s.colorTheme = theme.id;
      s.gradientPreset = theme.id;
      s.wallpaper.kind = 'gradient';
      commit();
    };
    presets.append(tile);
  }
  appearance.append(presets);
  field(
    appearance,
    'Paleta de la interfaz',
    s.colorTheme,
    (v) => {
      s.colorTheme = v as Settings['colorTheme'];
    },
    'text',
    COLOR_THEMES.map((t) => t.id),
  );
  paintPreview();
  field(appearance, 'Acento', s.accent, (v) => (s.accent = v), 'color');
  field(appearance, 'Tema', s.theme, (v) => (s.theme = v as Settings['theme']), 'text', [
    'auto',
    'dark',
    'light',
  ]);
  field(
    appearance,
    'Fondo',
    s.wallpaper.kind,
    (v) => (s.wallpaper.kind = v as Settings['wallpaper']['kind']),
    'text',
    ['gradient', 'solid', 'image'],
  );
  button(appearance, 'Gradiente personalizado', () => {
    s.gradientPreset = 'custom';
    s.wallpaper.kind = 'gradient';
    commit();
  });
  field(appearance, 'Color del fondo', s.wallpaper.color, (v) => (s.wallpaper.color = v), 'color');
  field(appearance, 'Desenfoque', s.wallpaper.blur, (v) => (s.wallpaper.blur = Number(v)), 'range');
  field(
    appearance,
    'Oscurecimiento',
    s.wallpaper.dim,
    (v) => (s.wallpaper.dim = Number(v)),
    'range',
  );
  button(appearance, 'Elegir imagen local', () => action('choose-wallpaper'));
  const navigation = group('Navegación y memoria');
  field(navigation, 'Buscador', s.search, (v) => (s.search = v as Settings['search']), 'text', [
    'duckduckgo',
    'brave',
    'startpage',
    'searxng',
  ]);
  field(navigation, 'Endpoint SearXNG', s.searx, (v) => (s.searx = v));
  field(
    navigation,
    'Suspender pestañas tras (minutos)',
    s.suspendMinutes,
    (v) => (s.suspendMinutes = Number(v)),
    'number',
  );
  const mode = field(
    navigation,
    'Cookies y datos de todas las páginas',
    s.browsingMode,
    (v) => (s.browsingMode = v as Settings['browsingMode']),
    'text',
    ['persistent', 'session', 'strict'],
  ) as HTMLSelectElement;
  const labels = {
    persistent: 'Conservar entre reinicios',
    session: 'Borrar al salir',
    strict: 'Privacidad estricta',
  };
  for (const option of mode.options)
    option.textContent = tr(labels[option.value as keyof typeof labels]);
  const note = document.createElement('p');
  note.textContent =
    s.browsingMode === 'persistent'
      ? 'Mantiene tus sesiones en todas las páginas entre reinicios. Los datos se guardan en este equipo; los terceros siguen bloqueados. Elegir otro modo no borra lo ya guardado: usa el botón de borrado para eliminarlo.'
      : s.browsingMode === 'session'
        ? 'Permite cookies propias y datos en todas las páginas hasta cerrar Nido. No borra automáticamente los datos de un perfil permanente usado antes.'
        : 'Deniega almacenamiento y cookies en el perfil estricto. Los datos del perfil permanente anterior solo se eliminan con el botón de borrado.';
  note.textContent = tr(note.textContent ?? '');
  navigation.append(note);
  button(navigation, 'Borrar cookies y datos de sitios (cierra sesiones)', () =>
    action('clear-browsing-data'),
  );
  if (s.browsingMode === 'strict') {
    field(
      navigation,
      'Cookies propias solo durante la sesión estricta',
      s.allowSessionCookies,
      (v) => (s.allowSessionCookies = v === 'true'),
      'checkbox',
    );
    field(
      navigation,
      'Excepciones temporales del modo estricto (dominios separados por comas)',
      s.compatibilitySites.join(', '),
      (v) =>
        (s.compatibilitySites = v
          .split(',')
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean)),
    );
  }
  field(
    navigation,
    'Historial local persistente',
    s.historyEnabled,
    (v) => (s.historyEnabled = v === 'true'),
    'checkbox',
  );
  button(navigation, 'Borrar historial local', () => action('clear-history'));
  const music = group(
    'Música local',
    'La reproducción permanece en la interfaz; cambiar o suspender pestañas no la interrumpe. No comienza automáticamente al arrancar.',
  );
  field(
    music,
    'Recordar lista (rutas locales)',
    s.music.remember,
    (v) => (s.music.remember = v === 'true'),
    'checkbox',
  );
  button(music, 'Elegir archivos de audio', () => action('choose-music'));
  const ai = group(
    'Asistentes de IA',
    'Los proveedores son servicios de terceros. Eliminar o cambiar un proveedor borra los datos de toda la sesión de IA para no conservar dominios retirados. Descargar vistas puede perder borradores no enviados.',
  );
  field(ai, 'Lado', s.sidebarSide, (v) => (s.sidebarSide = v as Settings['sidebarSide']), 'text', [
    'left',
    'right',
  ]);
  const width = field(
    ai,
    'Ancho (px)',
    s.sidebarWidth,
    (v) => (s.sidebarWidth = Number(v)),
    'number',
  ) as HTMLInputElement;
  width.min = '280';
  width.max = '900';
  field(
    ai,
    'Descargar proveedores inactivos (0 = nunca)',
    s.providerUnloadMinutes,
    (v) => (s.providerUnloadMinutes = Number(v)),
    'number',
  );
  const list = document.createElement('div');
  ai.append(list);
  const drawProviders = () => {
    list.replaceChildren();
    s.providers.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'provider-row';
      for (const key of ['name', 'url', 'icon'] as const) {
        const input = document.createElement('input');
        input.value = p[key];
        input.placeholder = tr(key === 'name' ? 'nombre' : key === 'icon' ? 'icono' : 'URL');
        input.setAttribute('aria-label', `${p.name}: ${key}`);
        input.onchange = () => {
          p[key] = input.value;
          commit();
        };
        row.append(input);
      }
      for (const [label, move] of [
        ['↑', -1],
        ['↓', 1],
      ] as const) {
        const b = document.createElement('button');
        b.textContent = label;
        b.title = tr('Reordenar proveedor');
        b.disabled = i + move < 0 || i + move >= s.providers.length;
        b.onclick = () => {
          [s.providers[i], s.providers[i + move]] = [s.providers[i + move], s.providers[i]];
          commit();
          drawProviders();
        };
        row.append(b);
      }
      const remove = document.createElement('button');
      remove.textContent = '×';
      remove.setAttribute('aria-label', tr('Quitar {name}', { name: p.name }));
      remove.onclick = () => {
        s.providers.splice(i, 1);
        commit();
        drawProviders();
      };
      row.append(remove);
      list.append(row);
    });
  };
  drawProviders();
  button(ai, 'Añadir proveedor', () => {
    s.providers.push({
      id: crypto.randomUUID(),
      name: tr('Asistente local'),
      url: 'http://localhost:3000',
      icon: '◈',
    });
    commit();
    drawProviders();
  });
  button(ai, 'Borrar datos de la sidebar de IA', () => action('clear-ai'));
  const block = group(
    'Bloqueo de banners',
    'EasyList + EasyPrivacy locales. No se descargan listas al arrancar. Las exclusiones evitan cualquier consulta al motor y cualquier inyección del bloqueador en esos dominios.',
  );
  field(
    block,
    'Bloquear anuncios de YouTube (pausar si impide reproducir)',
    s.youtubeAutoPause,
    (v) => (s.youtubeAutoPause = v === 'true'),
    'checkbox',
  );
  const youtubeNote = document.createElement('p');
  youtubeNote.textContent = tr(
    'Filtra publicidad del reproductor y banners. Si YouTube muestra su aviso antibloqueo, permite anuncios para seguir viendo y lo indica en la barra. Desactivar esta opción excluye YouTube por completo. Las exclusiones manuales prevalecen.',
  );
  block.append(youtubeNote);
  field(
    block,
    'Exclusiones de vídeo (separadas por comas)',
    s.videoExclusions.join(', '),
    (v) =>
      (s.videoExclusions = v
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean)),
  );
  button(block, 'Actualizar listas manualmente', () => action('update-lists'));
  const config = group(
    'Configuración local',
    'El JSON exportado contiene ajustes y rutas locales, nunca cookies ni conversaciones.',
  );
  button(config, 'Exportar JSON', () => action('export-settings'));
  button(config, 'Importar JSON', () => action('import-settings'));
  button(config, 'Restablecer ajustes', () => action('reset-settings'));
}
