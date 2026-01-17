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
  setStorageItem(STORAGE_KEYS.READ_ARTICLES, {});
}

// ============ Seen Articles ============

export function getSeenArticles(): ArticleStatuses {
  return getStorageItem(STORAGE_KEYS.SEEN_ARTICLES, {});
}

export function markAsSeen(articleId: string): void {
  const seen = getSeenArticles();
  seen[articleId] = { timestamp: new Date().toISOString() };
  setStorageItem(STORAGE_KEYS.SEEN_ARTICLES, seen);
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
  setStorageItem(STORAGE_KEYS.SEEN_ARTICLES, {});
}

// ============ Hidden Feeds ============

export function getHiddenFeeds(): Set<string> {
  const feeds = getStorageItem<string[]>(STORAGE_KEYS.HIDDEN_FEEDS, []);
  return new Set(feeds);
}

export function toggleFeedVisibility(feedId: string): boolean {
  const hidden = getHiddenFeeds();

  if (hidden.has(feedId)) {
    hidden.delete(feedId);
  } else {
    hidden.add(feedId);
  }

  setStorageItem(STORAGE_KEYS.HIDDEN_FEEDS, Array.from(hidden));
  return !hidden.has(feedId);
}

export function isFeedHidden(feedId: string): boolean {
  return getHiddenFeeds().has(feedId);
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
