/**
 * Local storage utilities for user preferences and read history
 * These are used client-side only (in Svelte components)
 */

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
  theme: string; // "auto" or any daisyUI theme name
  compactView: boolean;
  showSummaries: boolean;
  hideSeenArticles: boolean; // Renamed from showReadArticles
  autoMarkAsSeen: boolean; // New setting
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
  theme: "auto",
  compactView: false,
  showSummaries: true,
  hideSeenArticles: true, // Renamed from showReadArticles
  autoMarkAsSeen: true, // New setting
};

const DEFAULT_FILTERS: FilterSettings = {
  searchQuery: "",
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
