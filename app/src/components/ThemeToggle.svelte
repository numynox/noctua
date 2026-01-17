<script lang="ts">
  import { onMount } from "svelte";
  import { applyTheme, getTheme, setTheme } from "../lib/storage";

  let currentTheme: string = "auto";

  onMount(() => {
    currentTheme = getTheme();
    applyTheme(currentTheme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", () => {
      if (currentTheme === "auto") {
        applyTheme("auto");
      }
    });
  });

  function cycleTheme() {
    const themes: string[] = ["light", "dark", "auto"];
    const currentIndex = themes.indexOf(currentTheme);
    currentTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(currentTheme);
  }

  const themeIcons = {
    light: "☀️",
    dark: "🌙",
    auto: "🔄",
  };

  const themeLabels = {
    light: "Light",
    dark: "Dark",
    auto: "Auto",
  };
</script>

<button
  onclick={cycleTheme}
  class="btn btn-ghost btn-sm gap-2"
  title="Toggle theme"
>
  <span class="text-lg"
    >{themeIcons[currentTheme as keyof typeof themeIcons] || "🎨"}</span
  >
  <span class="hidden sm:inline"
    >{themeLabels[currentTheme as keyof typeof themeLabels] ||
      currentTheme}</span
  >
</button>
