// ── First-time setup: collect a GitHub Personal Access Token ──────────
// The PAT is the only credential the admin panel needs. It's stored in
// localStorage on the admin's machine. The user creates a fine-grained
// PAT once on GitHub, scoped to "Contents: Read & Write" on the admin
// repo only, then pastes it here.

import { useState, type FormEvent } from "react";
import { readQuestions, savePat, GH_OWNER, GH_REPO } from "../githubClient";

export default function PatSetup({ onSaved }: { onSaved: (pat: string) => void }) {
  const [pat, setPat] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = pat.trim();
    if (!trimmed) return;
    setVerifying(true);
    try {
      // Verify the PAT works against the configured repo before saving
      // it. readQuestions returns sha="" on 404 (file missing) which is
      // a valid first-time state, so any non-throw is acceptable.
      await readQuestions(trimmed);
      savePat(trimmed);
      onSaved(trimmed);
    } catch (err) {
      setError(String(err).replace(/^Error:\s*/, ""));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>⚡ Admin Setup</h1>
        <p className="subtitle">
          Connect to <strong>{GH_OWNER}/{GH_REPO}</strong>.
        </p>

        {error && <div className="alert alert-danger">⚠ {error}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-row">
            <label className="input-label" htmlFor="pat">GitHub Personal Access Token</label>
            <input
              id="pat"
              type="password"
              required
              autoComplete="off"
              autoFocus
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder="github_pat_..."
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", marginTop: "8px" }}
            disabled={verifying || !pat.trim()}
          >
            {verifying ? <><span className="spinner" />Verifying…</> : "Connect"}
          </button>
        </form>

        <div style={{ marginTop: 18, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
          <strong>How to create the PAT:</strong>
          <ol style={{ paddingLeft: 18, margin: "6px 0 0" }}>
            <li>
              Open{" "}
              <a
                href="https://github.com/settings/personal-access-tokens/new"
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--accent, #4f46e5)" }}
              >
                GitHub → Settings → Personal access tokens (fine-grained)
              </a>
            </li>
            <li>Repository access → Only select repositories → <code>{GH_OWNER}/{GH_REPO}</code></li>
            <li>Repository permissions → Contents → <strong>Read and write</strong></li>
            <li>Generate, copy the token, paste above</li>
          </ol>
          <p style={{ marginTop: 8 }}>
            The token stays in this browser's localStorage. Click <em>Log out</em> in the header to clear it.
          </p>
        </div>
      </div>
    </div>
  );
}
