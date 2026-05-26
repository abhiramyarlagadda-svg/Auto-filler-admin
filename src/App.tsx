// ── App shell ──────────────────────────────────────────────────────────
// Two states:
//   1. No GitHub PAT in localStorage → render <PatSetup/> to collect one.
//   2. PAT present → render <Questions/> with logout in the header.
//
// Replaces the previous Supabase auth gate. There are no routes anymore —
// the admin panel is a single page.

import { useState } from "react";
import { loadPat, clearPat, GH_OWNER, GH_REPO, GH_BRANCH, GH_FILE } from "./githubClient";
import Questions from "./pages/Questions";
import PatSetup from "./pages/PatSetup";

export default function App() {
  const [pat, setPat] = useState<string | null>(loadPat());

  if (!pat) return <PatSetup onSaved={(p) => setPat(p)} />;

  const handleLogout = () => {
    clearPat();
    setPat(null);
  };

  return (
    <>
      <header className="header">
        <h1><span className="icon">⚡</span> Galaxy Auto-Filler — Admin</h1>
        <div className="user-info">
          <span title={`${GH_OWNER}/${GH_REPO} · ${GH_BRANCH} · ${GH_FILE}`}>
            {GH_OWNER}/{GH_REPO}
          </span>
          <button className="btn-secondary" onClick={handleLogout}>Log out</button>
        </div>
      </header>
      <Questions pat={pat} />
    </>
  );
}
