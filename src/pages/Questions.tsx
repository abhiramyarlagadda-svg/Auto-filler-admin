// ── Questions dashboard ─────────────────────────────────────────────────
// Minimal admin UI: ONE input to add a question + the list of existing
// questions with a delete button on each row. That's it.
//
// All writes go through the authenticated Supabase client. The anon key
// alone cannot mutate the table — RLS policies allow INSERT/DELETE only
// to the `authenticated` role.

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../supabaseClient";
import type { AdminQuestion } from "../types";

export default function Questions() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newQuestion, setNewQuestion] = useState("");
  const [adding, setAdding] = useState(false);

  // ── Fetch on mount ──────────────────────────────────────────────────
  useEffect(() => { loadQuestions(); }, []);

  async function loadQuestions() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("admin_questions")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setQuestions((data ?? []) as AdminQuestion[]);
    setLoading(false);
  }

  // ── Add a new question ──────────────────────────────────────────────
  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const text = newQuestion.trim();
    if (!text) return;
    setAdding(true);
    // Only fill `keyword` — every other column uses its DB default.
    const { error: err } = await supabase
      .from("admin_questions")
      .insert([{ keyword: text }]);
    setAdding(false);
    if (err) { setError(err.message); return; }
    setSuccess(`Added "${text}".`);
    setTimeout(() => setSuccess(null), 2500);
    setNewQuestion("");
    loadQuestions();
  }

  // ── Delete ──────────────────────────────────────────────────────────
  async function deleteQuestion(q: AdminQuestion) {
    if (!confirm(`Delete "${q.keyword}"?`)) return;
    const { error: err } = await supabase.from("admin_questions").delete().eq("id", q.id);
    if (err) setError(err.message);
    else loadQuestions();
  }

  return (
    <div className="page">
      {error && <div className="alert alert-danger">⚠ {error}</div>}
      {success && <div className="alert alert-success">✓ {success}</div>}

      {/* ── Add ────────────────────────────────────────────────────── */}
      <div className="card">
        <h2>＋ Add Question</h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
          The question text is what every user sees in their extension. They enter their own answer locally.
        </p>
        <form onSubmit={onAdd} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="e.g. disability"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary" disabled={adding || !newQuestion.trim()}>
            {adding ? <><span className="spinner" />Adding…</> : "Add"}
          </button>
        </form>
      </div>

      {/* ── List ───────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Questions ({questions.length})</h2>
          <button className="btn-secondary" onClick={loadQuestions} disabled={loading}>
            {loading ? <span className="spinner" /> : "🔄 Refresh"}
          </button>
        </div>

        {loading ? (
          <div className="empty"><span className="spinner" />Loading…</div>
        ) : questions.length === 0 ? (
          <div className="empty">
            <div className="big">📭</div>
            <div>No questions yet. Add your first one above.</div>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {questions.map((q) => (
              <li
                key={q.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ fontWeight: 600 }}>{q.keyword}</span>
                <button className="btn-danger" onClick={() => deleteQuestion(q)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
