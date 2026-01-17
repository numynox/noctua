import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { readFileSync } from "fs";
import { load } from "js-yaml";

// Load configuration
const config = load(readFileSync("../config.yaml", "utf8"));

// https://astro.build/config
export default defineConfig({
  integrations: [svelte()],

  // Output static files
  output: "static",

  // Build output directory
  outDir: "../output/app",

  // Base path - adjust for GitHub Pages
  base: config.settings?.website?.base_url || "/",

  // Build options
  build: {
    assets: "assets",
  },

  // Vite configuration
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Ensure assets are inlined or properly referenced
      assetsInlineLimit: 4096,
    },
  },
});
