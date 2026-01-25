import { existsSync, readFileSync } from "fs";
import { load } from "js-yaml";
import { join } from "path";

const PROJECT_ROOT = join(import.meta.dirname, "..", "..", "..");

function loadConfig() {
  const configPath = join(PROJECT_ROOT, "config.yaml");
  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, "utf-8");
    return load(raw) as any;
  }
  return {};
}

export async function GET() {
  const config = loadConfig();
  const website = config?.settings?.website || {};

  // Ensure base path has no trailing slash (but allow root '')
  const rawBase = website?.base_url || "/";
  const base = rawBase === "/" ? "" : rawBase.replace(/\/$/, "");

  const name = website?.title || "Noctua";
  const description = website?.description || "An RSS feed reader.";
  const themeColor = "#242933";

  const manifest = {
    name,
    short_name: name,
    description,
    start_url: base || "/",
    scope: base || "/",
    display: "standalone",
    background_color: "#242933",
    theme_color: themeColor,
    icons: [
      {
        src: `${base}/android-chrome-192x192.png`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `${base}/android-chrome-512x512.png`,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
