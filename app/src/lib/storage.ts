/**
 * Local storage utilities for user preferences and read history
 * These are used client-side only (in Svelte components)
 */

// Storage keys
const STORAGE_KEYS = {
  THEME: "noctua_theme",
  READ_ARTICLES: "noctua_read_articles",
  HIDDEN_SECTIONS: "noctua_hidden_sections",
  FILTERS: "noctua_filters",
  PREFERENCES: "noctua_preferences",
} as const;

/**
 * User preferences stored in local storage
 */
export interface UserPreferences {
  theme: "light" | "dark" | "auto";
  compactView: boolean;
  showSummaries: boolean;
  showReadArticles: boolean;
}

/**
 * Filter settings stored in local storage
 */
export interface FilterSettings {
  searchQuery: string;
  selectedSections: string[];
  selectedFeeds: string[];
  dateRange: "all" | "today" | "week" | "month";
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "auto",
  compactView: false,
  showSummaries: true,
  showReadArticles: true,
};

const DEFAULT_FILTERS: FilterSettings = {
  searchQuery: "",
  selectedSections: [],
  selectedFeeds: [],
  dateRange: "all",
};

/**
 * Check if we're in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Get item from local storage with fallback
 */
function getStorageItem<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Set item in local storage
 */
function setStorageItem<T>(key: string, value: T): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Failed to save to localStorage:", error);
  }
}

// ============ Theme ============

export function getTheme(): UserPreferences["theme"] {
  return getStorageItem(STORAGE_KEYS.THEME, "auto");
}

export function setTheme(theme: UserPreferences["theme"]): void {
  setStorageItem(STORAGE_KEYS.THEME, theme);
  applyTheme(theme);
}

export function applyTheme(theme: UserPreferences["theme"]): void {
  if (!isBrowser()) return;

  const html = document.documentElement;

  if (theme === "auto") {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    html.setAttribute("data-theme", prefersDark ? "dark" : "light");
    html.classList.toggle("dark", prefersDark);
  } else {
    html.setAttribute("data-theme", theme);
    html.classList.toggle("dark", theme === "dark");
  }
}

// ============ Read Articles ============

export function getReadArticles(): Set<string> {
  const articles = getStorageItem<string[]>(STORAGE_KEYS.READ_ARTICLES, []);
  return new Set(articles);
}

export function markAsRead(articleId: string): void {
  const read = getReadArticles();
  read.add(articleId);
  setStorageItem(STORAGE_KEYS.READ_ARTICLES, Array.from(read));
}

export function markAsUnread(articleId: string): void {
  const read = getReadArticles();
  read.delete(articleId);
  setStorageItem(STORAGE_KEYS.READ_ARTICLES, Array.from(read));
}

export function isArticleRead(articleId: string): boolean {
  return getReadArticles().has(articleId);
}

export function clearReadHistory(): void {
  setStorageItem(STORAGE_KEYS.READ_ARTICLES, []);
}

// ============ Hidden Sections ============

export function getHiddenSections(): Set<string> {
  const sections = getStorageItem<string[]>(STORAGE_KEYS.HIDDEN_SECTIONS, []);
  return new Set(sections);
}

export function toggleSectionVisibility(sectionId: string): boolean {
  const hidden = getHiddenSections();

  if (hidden.has(sectionId)) {
    hidden.delete(sectionId);
  } else {
    hidden.add(sectionId);
  }

  setStorageItem(STORAGE_KEYS.HIDDEN_SECTIONS, Array.from(hidden));
  return !hidden.has(sectionId);
}

export function isSectionHidden(sectionId: string): boolean {
  return getHiddenSections().has(sectionId);
}

// ============ Preferences ============

export function getPreferences(): UserPreferences {
  return getStorageItem(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES);
}

export function setPreferences(prefs: Partial<UserPreferences>): void {
  const current = getPreferences();
  setStorageItem(STORAGE_KEYS.PREFERENCES, { ...current, ...prefs });
}

// ============ Filters ============

export function getFilters(): FilterSettings {
  return getStorageItem(STORAGE_KEYS.FILTERS, DEFAULT_FILTERS);
}

export function setFilters(filters: Partial<FilterSettings>): void {
  const current = getFilters();
  setStorageItem(STORAGE_KEYS.FILTERS, { ...current, ...filters });
}

export function resetFilters(): void {
  setStorageItem(STORAGE_KEYS.FILTERS, DEFAULT_FILTERS);
}
