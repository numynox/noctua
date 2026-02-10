import { createClient } from "@supabase/supabase-js";

// Support both Astro runtime public env (import.meta.env) and Node env for server-side scripts
const SUPABASE_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.PUBLIC_SUPABASE_URL) ||
  process.env.SUPABASE_URL ||
  "";
const SUPABASE_ANON_KEY =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY) ||
  process.env.SUPABASE_ANON_KEY ||
  "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function invokeEdgeFunction(
  name: string,
  opts?: { body?: any; headers?: Record<string, string> },
) {
  return supabase.functions.invoke(name, opts);
}

export default supabase;
