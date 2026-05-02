export type ThemeMode = 'light' | 'dark';
export type AppLanguage = 'zh' | 'en';

const themeStorageKey = 'simple-pomodoro-theme';
const languageStorageKey = 'simple-pomodoro-lang';

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

function normalizeLanguage(value: string | null): AppLanguage | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'zh' || normalized === 'cn' || normalized === 'zh-cn' || normalized.startsWith('zh-')) {
    return 'zh';
  }
  if (normalized === 'en' || normalized === 'en-us' || normalized.startsWith('en-')) {
    return 'en';
  }
  return null;
}

export function readInitialTheme(storageKey = themeStorageKey): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const urlTheme = new URL(window.location.href).searchParams.get('theme');
  if (isThemeMode(urlTheme)) {
    return urlTheme;
  }

  const stored = window.localStorage.getItem(storageKey);
  if (isThemeMode(stored)) {
    return stored;
  }

  const fluxFilesTheme = window.localStorage.getItem('fluxfiles-theme-mode');
  if (isThemeMode(fluxFilesTheme)) {
    return fluxFilesTheme;
  }

  return 'light';
}

export function applyTheme(theme: ThemeMode, storageKey = themeStorageKey) {
  document.documentElement.dataset.theme = theme;
  document.body.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.body.style.colorScheme = theme;
  window.localStorage.setItem(storageKey, theme);
}

export function cleanupThemeQueryParam() {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  if (!isThemeMode(url.searchParams.get('theme'))) {
    return;
  }

  url.searchParams.delete('theme');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export function readInitialLanguage(storageKey = languageStorageKey): AppLanguage {
  if (typeof window === 'undefined') {
    return 'zh';
  }

  const url = new URL(window.location.href);
  const urlLanguage = normalizeLanguage(url.searchParams.get('lang') || url.searchParams.get('locale'));
  if (urlLanguage) {
    return urlLanguage;
  }

  const stored = normalizeLanguage(window.localStorage.getItem(storageKey));
  if (stored) {
    return stored;
  }

  return window.navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function applyLanguage(language: AppLanguage, storageKey = languageStorageKey) {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  window.localStorage.setItem(storageKey, language);
}

export function cleanupLanguageQueryParam() {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  const hasValidLanguage = Boolean(
    normalizeLanguage(url.searchParams.get('lang')) || normalizeLanguage(url.searchParams.get('locale')),
  );
  if (!hasValidLanguage) {
    return;
  }

  url.searchParams.delete('lang');
  url.searchParams.delete('locale');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}
