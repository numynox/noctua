import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [svelte(), tailwind()],

  // Output static files
  output: "static",

  // Build output directory
  outDir: "../../output/step4",

  // Base path - adjust for GitHub Pages
  base: process.env.NOCTUA_BASE_URL || "/",

  // Build options
  build: {
    assets: "assets",
  },

  // Vite configuration
  vite: {
    build: {
      // Ensure assets are inlined or properly referenced
      assetsInlineLimit: 4096,
    },
  },
});
