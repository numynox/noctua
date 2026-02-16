import { existsSync, readFileSync } from "fs";
import { load } from "js-yaml";
import { join } from "path";

const PROJECT_ROOT = join(import.meta.dirname, "..", "..", "..");

export function loadConfig() {
  const configPath = join(PROJECT_ROOT, "config.yaml");
  if (existsSync(configPath)) {
    const configData = readFileSync(configPath, "utf-8");
    return load(configData) as any;
  }
  return {};
}

export function getBaseUrl(): string {
  const config = loadConfig();
  return config.settings?.website?.base_url || "/";
}
