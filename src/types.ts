// ── Shared types for the admin panel ───────────────────────────────────────
// Mirrors the schema of the Supabase `admin_questions` table.

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

export interface NewQuestionInput {
  keyword: string;
  display_label: string;
  category: string;
  placeholder: string;
  priority: number;
  active: boolean;
}

export const CATEGORIES = ["general", "EEO", "behavioral", "identifier", "compensation", "preferences"] as const;
export type Category = (typeof CATEGORIES)[number];
