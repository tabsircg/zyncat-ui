import { sharedSlot } from '../shared-slot';

export type Polarity = 'light' | 'dark';
export type PolarityPreference = Polarity | 'system';

export interface ThemeState {
  /** The active palette - `default` when no other is named. */
  theme: string;
  /** The stored side, or `system` to follow the OS setting. */
  polarity: PolarityPreference;
  /** The side the page is painted in - `system` resolved through the OS setting. */
  resolvedPolarity: Polarity;
  /** Every palette `ZyncatTheme` declared, `default` first. */
  themes: readonly string[];
  /** Display name per palette - the palette's `name`, else its key title-cased. */
  themeNames: Readonly<Record<string, string>>;
}

export interface ThemeControls extends ThemeState {
  /** Switch the palette; the side stays. */
  setTheme(theme: string): void;
  /** Pick a side, or `system` to follow the OS setting. */
  setPolarity(polarity: PolarityPreference): void;
}

export type ThemeBootConfig = { key: string; declared: ThemeState };

export const DEFAULT_THEME = 'default';
export const THEME_STORAGE_KEY = 'zyncat-theme';

/* Serialised with String() into the inline boot script, so it closes over nothing: every name it needs
   arrives in config, and the attribute names and the polarity words stay literal inside it. */
export function bootTheme(config: ThemeBootConfig, stored?: unknown): Omit<ThemeState, 'themes' | 'themeNames'> {
  let { theme, polarity, themes } = config.declared;
  if (stored === undefined) {
    try {
      stored = JSON.parse(localStorage.getItem(config.key) || 'null');
    } catch {}
  }
  const saved = (stored || {}) as { theme?: unknown; polarity?: unknown };
  if (typeof saved.theme === 'string' && themes.includes(saved.theme)) theme = saved.theme;
  if (saved.polarity === 'light' || saved.polarity === 'dark' || saved.polarity === 'system') polarity = saved.polarity;
  const resolvedPolarity: Polarity =
    polarity === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : polarity;
  const root = document.documentElement;
  if (theme === themes[0]) root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  root.setAttribute('data-polarity', resolvedPolarity);
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.head.appendChild(document.createElement('meta'));
    meta.name = 'theme-color';
    meta.setAttribute('data-zyncat-theme-color', '');
  }
  if (meta.hasAttribute('data-zyncat-theme-color')) {
    meta.style.backgroundColor = 'var(--bg-app)';
    const painted = getComputedStyle(meta).backgroundColor;
    meta.style.backgroundColor = '';
    if (painted && painted !== 'rgba(0, 0, 0, 0)') meta.content = painted;
  }
  return { theme, polarity, resolvedPolarity };
}

const DEFAULT_CONFIG: ThemeBootConfig = {
  key: THEME_STORAGE_KEY,
  declared: {
    theme: DEFAULT_THEME,
    polarity: 'system',
    resolvedPolarity: 'light',
    themes: [DEFAULT_THEME],
    themeNames: { [DEFAULT_THEME]: 'Default' },
  },
};

const store = sharedSlot('tokens.theme@1', () => ({
  json: '',
  config: DEFAULT_CONFIG,
  state: null as ThemeState | null,
  attached: false,
  listeners: new Set<() => void>(),
}));

export function configureThemeStore(json: string): void {
  if (json === store.json) return;
  store.json = json;
  store.config = JSON.parse(json);
  store.state = null;
}

export function applyTheme(stored?: unknown): void {
  const { themes, themeNames } = store.config.declared;
  store.state = { ...bootTheme(store.config, stored), themes, themeNames };
  for (const listener of store.listeners) listener();
}

export const getThemeSnapshot = (): ThemeState => store.state ?? store.config.declared;
export const getServerThemeSnapshot = (): ThemeState => store.config.declared;

export function setThemePreference(patch: Partial<Pick<ThemeState, 'theme' | 'polarity'>>): void {
  const current = getThemeSnapshot();
  const theme = patch.theme && current.themes.includes(patch.theme) ? patch.theme : current.theme;
  const next = { theme, polarity: patch.polarity ?? current.polarity };
  try {
    localStorage.setItem(store.config.key, JSON.stringify(next));
  } catch {}
  applyTheme(next);
}

export function subscribeTheme(listener: () => void): () => void {
  store.listeners.add(listener);
  if (!store.attached) {
    store.attached = true;
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (store.state?.polarity === 'system') applyTheme(store.state);
    });
    window.addEventListener('storage', (event) => {
      if (event.key === null || event.key === store.config.key) applyTheme();
    });
  }
  if (!store.state) applyTheme();
  return () => store.listeners.delete(listener);
}
