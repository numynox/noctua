Getting started with Supabase (quick notes)

- Install the Supabase CLI (recommended via npm):

  ```bash
  npm install -g supabase
  # or use npx for ad-hoc usage: npx supabase <cmd>
  ```

- Login and link your local project to a Supabase project:

  ```bash
  npm run supabase:login
  npm run supabase:projects:list
  npm run supabase:link -- --project-ref YOUR_PROJECT_REF
  ```

- After linking you will have a `supabase` folder with `config.toml` (created by the CLI).

- Developing and iterating on Edge Functions locally:

  ```bash
  # start local Supabase services (may use Docker on first run)
  npm run supabase:start

  # serve a single function with hot reload
  npm run supabase:functions:serve -- my-function

  # list functions in your linked project
  npm run supabase:functions:list

  # deploy a function
  npm run supabase:functions:deploy -- my-function
  ```

- Notes on downloading existing remote function source:
  - The Supabase CLI does not currently provide a single-command "pull" that fetches remote function source into your local `supabase/functions` directory.
  - Recommended workflow: keep your Edge Functions in version control under `supabase/functions` inside this repository. If a function only exists in the Dashboard, copy its source into `supabase/functions/<name>` locally (or recreate it with `supabase functions new <name>`), then iterate locally and deploy with the CLI.

- Quick integration tips for this repo:
  - A lightweight Supabase client is available at `app/src/lib/supabase.ts` to call `supabase.functions.invoke(...)` from the frontend or server.
  - Add your Supabase keys to `.env` (see top-level `.env.example`). For Astro, expose public keys with the `PUBLIC_` prefix.

  - Syncing remote DB schema (migrations)
    - The `supabase db remote commit` command has been deprecated. Use `supabase db pull` to fetch the remote schema as a migration and create local migration files.

    Example (link project first):

    ```bash
    # link your project (if not already linked)
    npx supabase login
    npx supabase projects list
    npx supabase link -- --project-ref YOUR_PROJECT_REF

    # pull remote schema into local migrations
    npx supabase db pull --file supabase/migrations/schema.sql
    # or create a migration folder entry with the CLI (depending on CLI version)
    npx supabase db pull

    # apply migrations locally (resets local DB)
    npx supabase start
    npx supabase db reset
    ```

    Notes:
    - `db pull` is preferred as it generates SQL/migration files you can inspect and commit.
    - `db reset` will wipe local data; only run if you accept losing local DB contents.
    - If you want a full snapshot (schema + data), use `npx supabase db dump --file supabase_dump.sql` and import into the local Postgres instance.
