// ── Login page ─────────────────────────────────────────────────────────
// Email + password sign-in via Supabase Auth. The admin user must be
// created beforehand in the Supabase Dashboard (Authentication → Users → Add).
// On success, App.tsx detects the session change and redirects to /questions.

import { useState, type FormEvent } from "react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
    }
    // Success → App.tsx auth listener navigates us
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>⚡ Admin Sign In</h1>
        <p className="subtitle">Manage the Galaxy Auto-Filler question library.</p>

        {error && <div className="alert alert-danger">⚠ {error}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-row">
            <label className="input-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="form-row">
            <label className="input-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "8px" }} disabled={submitting}>
            {submitting ? <><span className="spinner" />Signing in…</> : "Sign In"}
          </button>
        </form>

        <p style={{ marginTop: "16px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.5 }}>
          Create the admin user via Supabase Dashboard →<br />
          Authentication → Users → Add User
        </p>
      </div>
    </div>
  );
}
