// ── Questions dashboard ─────────────────────────────────────────────────
// Minimal admin UI: add a question, list questions, edit or delete each one.
//
// All writes go through the authenticated Supabase client. The anon key
// alone cannot mutate the table — RLS policies allow INSERT/UPDATE/DELETE
// only to the `authenticated` role.

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

  // Inline edit state — which row is being edited and its in-flight text
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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

  // ── Edit ────────────────────────────────────────────────────────────
  function startEdit(q: AdminQuestion) {
    setEditingId(q.id);
    setEditDraft(q.keyword);
    setError(null);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }
  async function saveEdit() {
    if (!editingId) return;
    const text = editDraft.trim();
    if (!text) { setError("Question can't be empty."); return; }
    setSavingEdit(true);
    const { error: err } = await supabase
      .from("admin_questions")
      .update({ keyword: text })
      .eq("id", editingId);
    setSavingEdit(false);
    if (err) { setError(err.message); return; }
    setSuccess("Updated.");
    setTimeout(() => setSuccess(null), 2000);
    cancelEdit();
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
            {questions.map((q) => {
              const isEditing = editingId === q.id;
              return (
                <li
                  key={q.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        autoFocus
                        style={{ flex: 1 }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <button className="btn-success" onClick={saveEdit} disabled={savingEdit || !editDraft.trim()}>
                        {savingEdit ? <span className="spinner" /> : "Save"}
                      </button>
                      <button className="btn-secondary" onClick={cancelEdit} disabled={savingEdit}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontWeight: 600 }}>{q.keyword}</span>
                      <button
                        className="btn-icon"
                        onClick={() => startEdit(q)}
                        title="Edit"
                        aria-label="Edit"
                        style={{ fontSize: 16 }}
                      >
                        ✏
                      </button>
                      <button className="btn-danger" onClick={() => deleteQuestion(q)}>Delete</button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
