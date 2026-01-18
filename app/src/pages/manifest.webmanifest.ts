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
  const themeColor = website?.theme_color || "#0ea5a4";

  const manifest = {
    name,
    short_name: name,
    description,
    start_url: base || "/",
    scope: base || "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: themeColor,
    icons: [
      {
        src: `${base}/icons/icon-192.svg`,
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: `${base}/icons/icon-512.svg`,
        sizes: "512x512",
        type: "image/svg+xml",
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
