<script lang="ts">
  import { onMount } from "svelte";
  import {
    getLoginHref,
    getSession,
    onAuthStateChange,
    signOut,
  } from "../lib/data";
  import {
    clearReadHistory,
    clearSeenHistory,
    getPreferences,
    getTheme,
    setPreferences,
    setTheme,
  } from "../lib/storage";

  let isLoading = $state(true);
  let isBusy = $state(false);
  let userEmail = $state("");
  let authError = $state("");
  let showReadArticles = $state(true);
  let autoMarkAsSeen = $state(true);
  let currentTheme = $state<string>("auto");

  let loginHref = $state("/login");

  const daisyThemes = [
    "light",
    "dark",
    "cupcake",
    "bumblebee",
    "emerald",
    "corporate",
    "synthwave",
    "retro",
    "cyberpunk",
    "valentine",
    "halloween",
    "garden",
    "forest",
    "aqua",
    "lofi",
    "pastel",
    "fantasy",
    "wireframe",
    "black",
    "luxury",
    "dracula",
    "cmyk",
    "autumn",
    "business",
    "acid",
    "lemonade",
    "night",
    "coffee",
    "winter",
    "dim",
    "nord",
    "sunset",
  ];

  async function refreshSession() {
    const session = await getSession();
    if (!session?.user) {
      window.location.replace(loginHref);
      return;
    }

    userEmail = session.user.email || "";
    isLoading = false;
  }

  onMount(() => {
    const prefs = getPreferences();
    showReadArticles = prefs.hideSeenArticles;
    autoMarkAsSeen = prefs.autoMarkAsSeen;
    currentTheme = getTheme();

    if (typeof document !== "undefined") {
      const baseUrl = document.documentElement.dataset.baseUrl || "/";
      loginHref = getLoginHref(baseUrl);
    }

    refreshSession().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      authError = message;
      isLoading = false;
    });

    const { data } = onAuthStateChange((_, session) => {
      if (!session?.user) {
        window.location.replace(loginHref);
        return;
      }

      userEmail = session.user.email || "";
      authError = "";
      isLoading = false;
    });

    return () => {
      data.subscription.unsubscribe();
    };
  });

  async function handleLogout() {
    authError = "";
    isBusy = true;

    try {
      await signOut();
      window.location.replace(loginHref);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      authError = message;
    } finally {
      isBusy = false;
    }
  }

  function updatePreferences() {
    setPreferences({
      hideSeenArticles: showReadArticles,
      autoMarkAsSeen,
    });

    window.dispatchEvent(
      new CustomEvent("preferencesChanged", {
        detail: {
          hideSeenArticles: showReadArticles,
          autoMarkAsSeen,
        },
      }),
    );
  }

  function handleThemeChange(theme: string) {
    currentTheme = theme;
    setTheme(theme);
  }

  function handleClearHistory() {
    if (
      confirm(
        "Are you sure you want to clear your read article history? This cannot be undone.",
      )
    ) {
      clearReadHistory();
      clearSeenHistory();
      alert("Read and seen history cleared.");
    }
  }
</script>

{#if isLoading}
  <div class="flex items-center justify-center py-20">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
{:else}
  <div class="max-w-2xl mx-auto space-y-8">
    <section class="card bg-base-200 shadow-sm overflow-hidden">
      <div class="card-body p-6 lg:p-8">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <span>👤</span> Account
        </h2>
        <p class="text-sm text-base-content/70 mb-4">
          Signed in as {userEmail}
        </p>

        {#if authError}
          <div class="alert alert-error text-sm mb-4">
            <span>{authError}</span>
          </div>
        {/if}

        <button
          class="btn btn-outline w-full"
          onclick={handleLogout}
          disabled={isBusy}
        >
          {isBusy ? "Signing out..." : "Log out"}
        </button>
      </div>
    </section>

    <section class="card bg-base-200 shadow-sm overflow-hidden">
      <div class="card-body p-6 lg:p-8">
        <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
          <span>🎨</span> Appearance
        </h2>

        <div class="space-y-4">
          <div class="font-semibold text-sm">Color Theme</div>

          <div class="space-y-2">
            <label
              class="flex items-center justify-between gap-4 cursor-pointer"
            >
              <div class="flex-1">
                <span class="text-sm font-medium text-base-content/70 block"
                  >Auto Theme</span
                >
                <span class="text-sm text-base-content/60"
                  >Automatically switch between light and dark based on system
                  preference</span
                >
              </div>
              <input
                type="checkbox"
                class="toggle toggle-primary"
                checked={currentTheme === "auto"}
                onchange={() =>
                  handleThemeChange(currentTheme === "auto" ? "light" : "auto")}
              />
            </label>
          </div>

          <div class="space-y-2">
            <div class="text-sm font-medium text-base-content/70">
              Select Theme
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {#each daisyThemes as theme}
                <button
                  onclick={() => handleThemeChange(theme)}
                  disabled={currentTheme === "auto"}
                  class="btn btn-sm capitalize {currentTheme === theme
                    ? 'btn-primary'
                    : 'btn-soft'} {currentTheme === 'auto'
                    ? 'btn-disabled'
                    : ''}"
                >
                  {theme}
                </button>
              {/each}
            </div>
            {#if currentTheme === "auto"}
              <p class="text-xs text-base-content/50">
                Theme selection is disabled when Auto is active
              </p>
            {/if}
          </div>
        </div>

        <div class="divider"></div>

        <div class="space-y-4">
          <label class="flex items-center justify-between gap-4 cursor-pointer">
            <div class="flex-1">
              <span class="font-semibold block">Hide Seen Articles</span>
              <span class="text-sm text-base-content/60"
                >Read or seen articles will be hidden on next page load</span
              >
            </div>
            <input
              type="checkbox"
              class="toggle toggle-primary"
              bind:checked={showReadArticles}
              onchange={updatePreferences}
            />
          </label>

          <label class="flex items-center justify-between gap-4 cursor-pointer">
            <div class="flex-1">
              <span class="font-semibold block">Auto-Mark as Seen</span>
              <span class="text-sm text-base-content/60"
                >Automatically mark articles as seen when scrolled past</span
              >
            </div>
            <input
              type="checkbox"
              class="toggle toggle-primary"
              bind:checked={autoMarkAsSeen}
              onchange={updatePreferences}
            />
          </label>
        </div>
      </div>
    </section>

    <section class="card bg-base-200 shadow-sm border border-error/20">
      <div class="card-body p-6 lg:p-8">
        <h2 class="text-xl font-bold text-error mb-4 flex items-center gap-2">
          <span>⚠️</span> Danger Zone
        </h2>
        <p class="text-sm text-base-content/70 mb-6">
          Once you clear your read history, you cannot recover it. This will
          mark all articles as unread.
        </p>
        <button
          class="btn btn-error btn-outline w-full"
          onclick={handleClearHistory}
        >
          Clear Read History
        </button>
      </div>
    </section>
  </div>
{/if}
