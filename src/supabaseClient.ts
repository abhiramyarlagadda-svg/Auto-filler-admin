// ── Supabase client setup ──────────────────────────────────────────────────
// Loads credentials from environment variables. Throw early if missing so
// the developer sees an actionable error rather than a runtime 401.

import { createClient } from "@supabase/supabase-js";

const url     = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase credentials. Copy .env.example → .env and fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
