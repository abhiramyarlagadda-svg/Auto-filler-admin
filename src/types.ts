// ── Shared types for the admin panel ───────────────────────────────────────
// Mirrors the schema of the Supabase `admin_questions` table. Only `keyword`
// is used by the simplified admin UI — the other DB columns keep their
// defaults so we don't have to change the table schema.

export interface AdminQuestion {
  id: string;
  keyword: string;
  display_label: string | null;
  category: string;
  placeholder: string | null;
  priority: number;
  active: boolean;
  created_at: string;
}
