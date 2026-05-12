// ── Questions dashboard ─────────────────────────────────────────────────
// CRUD UI for the admin_questions table.
//   - Add a question (top form, always visible)
//   - View all questions in a sortable, filterable table
//   - Inline edit any row
//   - Delete (hard) or toggle active (soft)
//
// All writes go through the authenticated Supabase client. The anon key
// alone cannot mutate the table — the row-level security policies allow
// INSERT/UPDATE/DELETE only when auth.role() = 'authenticated'.

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "../supabaseClient";
import { CATEGORIES, type AdminQuestion } from "../types";

const DEFAULT_FORM = {
  keyword: "",
  display_label: "",
  category: "EEO",
  placeholder: "",
  priority: 0,
  active: true,
};

export default function Questions() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add form state
  const [form, setForm] = useState(DEFAULT_FORM);
  const [adding, setAdding] = useState(false);

  // Edit state — which row is being edited and its working copy
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<AdminQuestion>>({});

  // Filter / search
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);

  // ── Fetch on mount ────────────────────────────────────────────────────
  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("admin_questions")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setQuestions((data ?? []) as AdminQuestion[]);
    setLoading(false);
  }

  // ── Add a new question ────────────────────────────────────────────────
  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.keyword.trim()) {
      setError("Keyword is required.");
      return;
    }
    setAdding(true);
    const { error: err } = await supabase.from("admin_questions").insert([{
      keyword:       form.keyword.trim(),
      display_label: form.display_label.trim() || null,
      category:      form.category,
      placeholder:   form.placeholder.trim() || null,
      priority:      Number(form.priority) || 0,
      active:        form.active,
    }]);
    setAdding(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(`Added "${form.keyword}".`);
    setTimeout(() => setSuccess(null), 2500);
    setForm(DEFAULT_FORM);
    loadQuestions();
  }

  // ── Edit row ──────────────────────────────────────────────────────────
  function startEdit(q: AdminQuestion) {
    setEditingId(q.id);
    setEditDraft({ ...q });
  }
  function cancelEdit() {
    setEditingId(null);
    setEditDraft({});
  }
  async function saveEdit() {
    if (!editingId) return;
    setError(null);
    const { error: err } = await supabase
      .from("admin_questions")
      .update({
        keyword:       (editDraft.keyword ?? "").trim(),
        display_label: editDraft.display_label?.trim() || null,
        category:      editDraft.category ?? "general",
        placeholder:   editDraft.placeholder?.trim() || null,
        priority:      Number(editDraft.priority ?? 0),
        active:        !!editDraft.active,
      })
      .eq("id", editingId);
    if (err) {
      setError(err.message);
      return;
    }
    setEditingId(null);
    setEditDraft({});
    setSuccess("Saved.");
    setTimeout(() => setSuccess(null), 2000);
    loadQuestions();
  }

  // ── Toggle active ──────────────────────────────────────────────────────
  async function toggleActive(q: AdminQuestion) {
    const { error: err } = await supabase
      .from("admin_questions")
      .update({ active: !q.active })
      .eq("id", q.id);
    if (err) setError(err.message);
    else loadQuestions();
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  async function deleteQuestion(q: AdminQuestion) {
    if (!confirm(`Delete "${q.keyword}" permanently? This cannot be undone.`)) return;
    const { error: err } = await supabase.from("admin_questions").delete().eq("id", q.id);
    if (err) setError(err.message);
    else loadQuestions();
  }

  // ── Filtered/searched list ────────────────────────────────────────────
  const visible = useMemo(() => {
    const lc = searchTerm.toLowerCase().trim();
    return questions.filter((q) => {
      if (!showInactive && !q.active) return false;
      if (categoryFilter !== "all" && q.category !== categoryFilter) return false;
      if (!lc) return true;
      return (
        q.keyword.toLowerCase().includes(lc) ||
        (q.display_label ?? "").toLowerCase().includes(lc) ||
        q.category.toLowerCase().includes(lc)
      );
    });
  }, [questions, searchTerm, categoryFilter, showInactive]);

  return (
    <div className="page">
      {error && <div className="alert alert-danger">⚠ {error}</div>}
      {success && <div className="alert alert-success">✓ {success}</div>}

      {/* ── Add question card ─────────────────────────────────────────── */}
      <div className="card">
        <h2>＋ Add Question</h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
          Active questions appear in every user's extension Profile tab. Users enter their own answers locally.
        </p>
        <form onSubmit={onAdd}>
          <div className="form-grid">
            <div>
              <label className="input-label">Keyword *</label>
              <input
                type="text"
                placeholder="disability"
                value={form.keyword}
                onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="input-label">Display Label</label>
              <input
                type="text"
                placeholder="Disability Status"
                value={form.display_label}
                onChange={(e) => setForm({ ...form, display_label: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Priority</label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 12 }}>
            <label className="input-label">Placeholder hint (optional)</label>
            <input
              type="text"
              placeholder="I prefer not to answer"
              value={form.placeholder}
              onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                style={{ width: "auto", margin: 0 }}
              />
              Active (visible to extension users)
            </label>
            <button type="submit" className="btn-primary" disabled={adding}>
              {adding ? <><span className="spinner" />Adding…</> : "Add Question"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────── */}
      <div className="filter-bar">
        <input
          type="text"
          placeholder="🔍 Search by keyword, label, or category…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, whiteSpace: "nowrap" }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            style={{ width: "auto", margin: 0 }}
          />
          Show inactive
        </label>
        <button className="btn-secondary" onClick={loadQuestions} disabled={loading}>
          {loading ? <span className="spinner" /> : "🔄"}
        </button>
      </div>

      {/* ── Questions table ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty"><span className="spinner" />Loading questions…</div>
        ) : visible.length === 0 ? (
          <div className="empty">
            <div className="big">📭</div>
            <div>No questions match your filters. Add one above to get started.</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: "22%" }}>Keyword</th>
                <th style={{ width: "26%" }}>Display Label</th>
                <th style={{ width: "12%" }}>Category</th>
                <th style={{ width: "8%" }}>Priority</th>
                <th style={{ width: "10%" }}>Active</th>
                <th style={{ width: "22%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((q) => {
                const isEditing = editingId === q.id;
                return (
                  <tr key={q.id} className={q.active ? "" : "inactive"}>
                    {isEditing ? (
                      <>
                        <td>
                          <input
                            type="text"
                            value={editDraft.keyword ?? ""}
                            onChange={(e) => setEditDraft({ ...editDraft, keyword: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={editDraft.display_label ?? ""}
                            onChange={(e) => setEditDraft({ ...editDraft, display_label: e.target.value })}
                          />
                        </td>
                        <td>
                          <select
                            value={editDraft.category ?? "general"}
                            onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                          >
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={editDraft.priority ?? 0}
                            onChange={(e) => setEditDraft({ ...editDraft, priority: Number(e.target.value) })}
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={!!editDraft.active}
                            onChange={(e) => setEditDraft({ ...editDraft, active: e.target.checked })}
                            style={{ width: "auto" }}
                          />
                        </td>
                        <td className="cell-actions">
                          <button className="btn-success" onClick={saveEdit}>Save</button>
                          <button className="btn-secondary" onClick={cancelEdit}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="cell-keyword">{q.keyword}</td>
                        <td className="cell-label">{q.display_label || <em style={{ color: "var(--text-muted)" }}>—</em>}</td>
                        <td><span className="chip">{q.category}</span></td>
                        <td>{q.priority}</td>
                        <td>
                          <button
                            className="btn-icon"
                            onClick={() => toggleActive(q)}
                            title={q.active ? "Click to deactivate" : "Click to activate"}
                            style={{ fontSize: 16 }}
                          >
                            {q.active ? "✓" : "○"}
                          </button>
                        </td>
                        <td className="cell-actions">
                          <button className="btn-secondary" onClick={() => startEdit(q)}>Edit</button>
                          <button className="btn-danger" onClick={() => deleteQuestion(q)}>Delete</button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 16, textAlign: "center" }}>
        {visible.length} of {questions.length} question{questions.length === 1 ? "" : "s"} shown
      </p>
    </div>
  );
}
