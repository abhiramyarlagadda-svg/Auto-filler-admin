// ── Shared types for the admin panel ───────────────────────────────────────
// The questions live as a JSON array committed to a GitHub repo. Each row
// matches the shape the extension reads via raw.githubusercontent.com.

export interface AdminQuestion {
  id: string;
  keyword: string;
  display_label: string | null;
  category: string;
  placeholder: string | null;
  priority: number;
  active: boolean;
}

// GitHub Contents API response shape (the subset we care about). The `sha`
// is required for write-back so GitHub can detect lost updates between
// reads and writes.
export interface GhFile {
  content: string;   // base64
  sha: string;
}
