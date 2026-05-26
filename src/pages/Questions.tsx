// ── Questions dashboard ─────────────────────────────────────────────────
// Same UX as before (add / inline-edit / delete / refresh) but the backing
// store is the questions.json file in the admin GitHub repo. Each mutation
// re-PUTs the full file using the sha we got from the most recent read.

import { useEffect, useState, type FormEvent } from "react";
import { readQuestions, writeQuestions } from "../githubClient";
import type { AdminQuestion } from "../types";

// Use crypto.randomUUID when available (modern browsers) — falls back to
// a Math.random-based generator for the (vanishingly rare) older clients.
function newId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch { /* ignore */ }
  // RFC4122-shaped fallback — adequate as a row key, not a security token.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function Questions({ pat }: { pat: string }) {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [sha, setSha] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newQuestion, setNewQuestion] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // ── Fetch on mount ──────────────────────────────────────────────────
  useEffect(() => { loadQuestions(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function loadQuestions() {
    setLoading(true);
    setError(null);
    try {
      const { questions: list, sha: newSha } = await readQuestions(pat);
      // Show priority-desc to match how the extension consumes them.
      const sorted = [...list].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      setQuestions(sorted);
      setSha(newSha);
    } catch (err) {
      setError(String(err).replace(/^Error:\s*/, ""));
    } finally {
      setLoading(false);
    }
  }

  // Re-PUT the full file with the given list. Bumps `sha` to the new
  // commit's so the next write doesn't 422-conflict.
  async function commitList(updated: AdminQuestion[], message: string): Promise<boolean> {
    try {
      const newSha = await writeQuestions(pat, updated, sha, message);
      setSha(newSha);
      setQuestions(updated);
      return true;
    } catch (err) {
      setError(String(err).replace(/^Error:\s*/, ""));
      return false;
    }
  }

  // ── Add ────────────────────────────────────────────────────────────
  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const text = newQuestion.trim();
    if (!text) return;
    setAdding(true);
    const next: AdminQuestion = {
      id: newId(),
      keyword: text,
      display_label: null,
      category: "default",
      placeholder: null,
      priority: 0,
      active: true,
    };
    const updated = [next, ...questions];
    const ok = await commitList(updated, `admin: add "${text}"`);
    setAdding(false);
    if (ok) {
      setSuccess(`Added "${text}".`);
      setTimeout(() => setSuccess(null), 2500);
      setNewQuestion("");
    }
  }

  // ── Edit ───────────────────────────────────────────────────────────
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
    const updated = questions.map((q) => q.id === editingId ? { ...q, keyword: text } : q);
    const ok = await commitList(updated, `admin: edit "${text}"`);
    setSavingEdit(false);
    if (ok) {
      setSuccess("Updated.");
      setTimeout(() => setSuccess(null), 2000);
      cancelEdit();
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────
  async function deleteQuestion(q: AdminQuestion) {
    if (!confirm(`Delete "${q.keyword}"?`)) return;
    const updated = questions.filter((x) => x.id !== q.id);
    await commitList(updated, `admin: delete "${q.keyword}"`);
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
