/**
 * Local storage utilities for user preferences and read history
 * These are used client-side only (in Svelte components)
 */

// Check if running in browser environment
const isBrowser = (): boolean => typeof window !== "undefined";

// Storage keys
const STORAGE_KEYS = {
  THEME: "noctua_theme",
  READ_ARTICLES: "noctua_read_articles",
  SEEN_ARTICLES: "noctua_seen_articles",
  HIDDEN_FEEDS: "noctua_hidden_feeds",
  FILTERS: "noctua_filters",
  PREFERENCES: "noctua_preferences",
} as const;

/**
 * User preferences stored in local storage
 */
export interface UserPreferences {
  hideSeenArticles: boolean;
  autoMarkAsSeen: boolean;
}

/**
 * Article status with timestamp
 */
export interface ArticleStatus {
  timestamp: string; // ISO string
}

/**
 * Article statuses stored in local storage
 */
export interface ArticleStatuses {
  [articleId: string]: ArticleStatus;
}

/**
 * Filter settings stored in local storage
 */
export interface FilterSettings {
  searchQuery: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  hideSeenArticles: true,
  autoMarkAsSeen: true,
};

const DEFAULT_FILTERS: FilterSettings = {
  searchQuery: "",
};

/**
 * Migrate old localStorage data to new format
 */
function migrateLocalStorage(): void {
  if (!isBrowser()) return;

  try {
    // Migrate theme from preferences to separate key
    const oldPrefs = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (oldPrefs) {
      const prefs = JSON.parse(oldPrefs);
      if (prefs.theme && prefs.theme !== "auto") {
        setTheme(prefs.theme);
      }
      // Remove old theme from preferences
      delete prefs.theme;
      // Rename showReadArticles to hideSeenArticles (invert logic)
      if (prefs.showReadArticles !== undefined) {
        prefs.hideSeenArticles = !prefs.showReadArticles;
        delete prefs.showReadArticles;
      }
      // Save cleaned preferences
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
    }

    // Clean up old filter data
    const oldFilters = localStorage.getItem(STORAGE_KEYS.FILTERS);
    if (oldFilters) {
      const filters = JSON.parse(oldFilters);
      // Remove old fields
      delete filters.selectedSections;
      delete filters.selectedFeeds;
      delete filters.dateRange;
      // Keep only searchQuery
      const cleanedFilters = {
        searchQuery: filters.searchQuery || "",
      };
      localStorage.setItem(
        STORAGE_KEYS.FILTERS,
        JSON.stringify(cleanedFilters),
      );
    }

    // Remove any other old keys if they exist
    const oldKeys = [
      "noctua_hidden_sections", // This was replaced by hidden feeds logic
    ];
    oldKeys.forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn("Error during localStorage migration:", error);
  }
}

// Run migration on module load
migrateLocalStorage();

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

export function getTheme(): string {
  return getStorageItem(STORAGE_KEYS.THEME, "auto");
}

export function setTheme(theme: string): void {
  setStorageItem(STORAGE_KEYS.THEME, theme);
  applyTheme(theme);
}

export function applyTheme(theme: string): void {
  if (!isBrowser()) return;

  const html = document.documentElement;

  if (theme === "auto") {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    html.setAttribute("data-theme", prefersDark ? "dark" : "light");
    html.classList.toggle("dark", prefersDark);
  } else {
    html.setAttribute("data-theme", theme);
    html.classList.toggle("dark", theme === "dark");
  }
}

// ============ Read Articles ============

export function getReadArticles(): ArticleStatuses {
  return getStorageItem(STORAGE_KEYS.READ_ARTICLES, {});
}

export function markAsRead(articleId: string): void {
  const read = getReadArticles();
  read[articleId] = { timestamp: new Date().toISOString() };
  setStorageItem(STORAGE_KEYS.READ_ARTICLES, read);
  // Notify any listeners (e.g., auto-refresh timer) that the user performed
  // activity related to reading an article so timers can be reset.
  try {
    if (isBrowser()) {
      window.dispatchEvent(new CustomEvent("noctua:activity"));
    }
  } catch (e) {
    // ignore
  }
}

export function markAsUnread(articleId: string): void {
  const read = getReadArticles();
  delete read[articleId];
  setStorageItem(STORAGE_KEYS.READ_ARTICLES, read);
}

export function isArticleRead(articleId: string): boolean {
  const read = getReadArticles();
  return articleId in read;
}

export function getArticleReadTimestamp(articleId: string): string | null {
  const read = getReadArticles();
  return read[articleId]?.timestamp || null;
}

export function clearReadHistory(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEYS.READ_ARTICLES);
  } catch (e) {
    // fallback to setting empty object
    setStorageItem(STORAGE_KEYS.READ_ARTICLES, {});
  }
  try {
    if (isBrowser()) {
      window.dispatchEvent(new CustomEvent("readHistoryCleared"));
      window.dispatchEvent(new CustomEvent("noctua:activity"));
    }
  } catch (e) {
    // ignore
  }
}

// ============ Seen Articles ============

export function getSeenArticles(): ArticleStatuses {
  return getStorageItem(STORAGE_KEYS.SEEN_ARTICLES, {});
}

export function markAsSeen(articleId: string): void {
  const seen = getSeenArticles();
  seen[articleId] = { timestamp: new Date().toISOString() };
  setStorageItem(STORAGE_KEYS.SEEN_ARTICLES, seen);
  // Also notify activity listeners when an article is marked as seen.
  try {
    if (isBrowser()) {
      window.dispatchEvent(new CustomEvent("noctua:activity"));
    }
  } catch (e) {
    // ignore
  }
}

export function isArticleSeen(articleId: string): boolean {
  const seen = getSeenArticles();
  return articleId in seen;
}

export function getArticleSeenTimestamp(articleId: string): string | null {
  const seen = getSeenArticles();
  return seen[articleId]?.timestamp || null;
}

export function clearSeenHistory(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEYS.SEEN_ARTICLES);
  } catch (e) {
    setStorageItem(STORAGE_KEYS.SEEN_ARTICLES, {});
  }
  try {
    if (isBrowser()) {
      window.dispatchEvent(new CustomEvent("seenHistoryCleared"));
      window.dispatchEvent(new CustomEvent("noctua:activity"));
    }
  } catch (e) {
    // ignore
  }
}

// ============ Hidden Feeds ============

export function getHiddenFeeds(): Set<string> {
  // Deprecated: previous format was an array of feed ids. New format is
  // an object mapping contextId -> string[] (e.g. { home: [...], tech: [...] }).
  const raw = getStorageItem<any>(STORAGE_KEYS.HIDDEN_FEEDS, {});
  if (Array.isArray(raw)) {
    // Legacy array — treat as global/home hidden list for backward compat.
    return new Set(raw);
  }
  // If it's an object, return the 'home' context by default (global view)
  if (raw && typeof raw === "object") {
    const arr = raw["home"] || [];
    return new Set(arr);
  }
  return new Set();
}

export function getHiddenFeedsForContext(contextId = "home"): Set<string> {
  const raw = getStorageItem<any>(STORAGE_KEYS.HIDDEN_FEEDS, {});
  if (Array.isArray(raw)) {
    // Legacy array — assume applies to all contexts
    return new Set(raw);
  }
  if (raw && typeof raw === "object") {
    const arr = raw[contextId] || [];
    return new Set(arr);
  }
  return new Set();
}

export function toggleFeedVisibility(feedId: string, contextId = "home"): boolean {
  const raw = getStorageItem<any>(STORAGE_KEYS.HIDDEN_FEEDS, {});

  let data: Record<string, string[]> = {};
  if (Array.isArray(raw)) {
    // Migrate legacy array into home context
    data = { home: raw };
  } else if (raw && typeof raw === "object") {
    data = { ...raw };
  }

  const list = new Set<string>(data[contextId] || []);
  if (list.has(feedId)) {
    list.delete(feedId);
  } else {
    list.add(feedId);
  }
  data[contextId] = Array.from(list);

  setStorageItem(STORAGE_KEYS.HIDDEN_FEEDS, data);
  return !list.has(feedId);
}

export function isFeedHidden(feedId: string, contextId = "home"): boolean {
  return getHiddenFeedsForContext(contextId).has(feedId);
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
