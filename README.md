# Nexus

Monorepo for two Astro + Svelte apps sharing one Supabase backend:

- `app/noctua`: RSS reader
- `app/vibilia`: Fuel tracking and expense prototype

Both apps authenticate against the same Supabase project (`nexus`), so one Supabase account can be used across both UIs.

## Repository layout

```text
nexus/
├── app/
│   ├── noctua/
│   └── vibilia/
├── supabase/
│   ├── migrations/
│   ├── functions/
│   │   ├── fetch-rss/
│   │   └── refresh-fuel-prices/
│   └── config.toml
├── config.yaml
└── package.json
```

## Local setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Copy `.env.example` to `.env` and set values.

Required for both apps:

```bash
PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Required for Edge Functions:

```bash
FETCH_RSS_INVOKE_SECRET=<long-random-secret>
FUEL_PRICE_INVOKE_SECRET=<long-random-secret>
FUEL_PRICE_API_KEY=<tankerkoenig-api-key>
```

### 3) Link local Supabase CLI to your empty `nexus` project

```bash
npm run supabase:login
npm run supabase:projects:list
npm run supabase:link -- --project-ref <your-project-ref>
```

### 4) Apply schema to Supabase

If `nexus` is empty, run:

```bash
npm run supabase:db:push
```

This applies all migrations for both apps.

### 5) Deploy functions to `nexus`

```bash
npm run supabase:functions:deploy:fetch-rss
npm run supabase:functions:deploy:refresh-fuel-prices
```

### 6) Configure Vault secrets for hourly `fetch-rss` cron

`fetch-rss` is invoked every hour via `pg_cron` calling `public.invoke_fetch_rss()`.

The function reads these secrets from `vault.decrypted_secrets`:

- `FETCH_RSS_INVOKE_SECRET`
- `FETCH_RSS_FUNCTION_URL` (for example `https://<your-project-ref>.supabase.co/functions/v1/fetch-rss`)

Set them in Supabase Dashboard → Project Settings → Vault, or via SQL:

```sql
select vault.create_secret('your-fetch-rss-invoke-secret', 'FETCH_RSS_INVOKE_SECRET');
select vault.create_secret('https://<your-project-ref>.supabase.co/functions/v1/fetch-rss', 'FETCH_RSS_FUNCTION_URL');
```

### 7) Configure Vault + Function secrets for hourly `refresh-fuel-prices`

`refresh-fuel-prices` is invoked every hour via `pg_cron` calling `public.invoke_refresh_fuel_prices()`.

Vault secrets required by SQL scheduler:

- `FUEL_PRICE_INVOKE_SECRET`
- `REFRESH_FUEL_PRICES_FUNCTION_URL` (for example `https://<your-project-ref>.supabase.co/functions/v1/refresh-fuel-prices`)
- `FUEL_PRICE_API_KEY`

Create/update these in Supabase Dashboard → Project Settings → Vault, or via SQL:

```sql
select vault.create_secret('your-refresh-invoke-secret', 'FUEL_PRICE_INVOKE_SECRET');
select vault.create_secret('https://<your-project-ref>.supabase.co/functions/v1/refresh-fuel-prices', 'REFRESH_FUEL_PRICES_FUNCTION_URL');
select vault.create_secret('your-tankerkoenig-api-key', 'FUEL_PRICE_API_KEY');
```

Edge Function runtime secrets required by `refresh-fuel-prices`:

- `FUEL_PRICE_INVOKE_SECRET`
- `FUEL_PRICE_API_KEY`

Set them in Supabase Dashboard → Project Settings → Edge Functions → Secrets,
or via CLI:

```bash
npx supabase secrets set FUEL_PRICE_INVOKE_SECRET=your-refresh-invoke-secret --project-ref <your-project-ref>
npx supabase secrets set FUEL_PRICE_API_KEY=your-tankerkoenig-api-key --project-ref <your-project-ref>
```

## Development

Run each app separately:

```bash
npm run dev:noctua   # http://localhost:4321/nexus/noctua
npm run dev:vibilia  # http://localhost:4321/nexus/vibilia
```

Run local Supabase stack and functions:

```bash
npm run supabase:start
npm run supabase:functions:serve
```

## Build & deploy (GitHub Pages)

Both apps are built into one static artifact:

- `output/pages/noctua`
- `output/pages/vibilia`

Build locally:

```bash
npm run build:websites
```

GitHub Pages workflow (`.github/workflows/deploy-pages.yml`) publishes `output/pages`.

Production URLs:

- `https://numynox.github.io/nexus/noctua`
- `https://numynox.github.io/nexus/vibilia`

## Supabase dashboard settings

In `Authentication -> URL Configuration`, add redirect URLs for both local dev and GitHub Pages, e.g.:

- `http://localhost:4321/nexus/noctua`
- `http://localhost:4321/nexus/vibilia`
- `https://numynox.github.io/nexus/noctua`
- `https://numynox.github.io/nexus/vibilia`

Also ensure Email/Password auth is enabled.

## GitHub repository variables

Set repository variables used by the Pages workflow:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

## Useful scripts

- `npm run build:websites`
- `npm run build:noctua`
- `npm run build:vibilia`
- `npm run dev:noctua`
- `npm run dev:vibilia`
- `npm run supabase:db:push`
- `npm run supabase:functions:serve`
