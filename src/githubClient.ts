// ── GitHub Contents API client ──────────────────────────────────────────
// Reads / writes `questions.json` in the admin repo. Replaces Supabase as
// the storage layer for the question library.
//
// Why the GitHub API and not raw.githubusercontent.com?
//   • Writes require the authenticated /repos/.../contents/{path} endpoint.
//   • Reads via the SAME endpoint return both the file content AND its
//     current `sha`, which the PUT endpoint requires for safe write-back
//     (prevents lost-update conflicts when two admins edit concurrently).
//   • Raw is reserved for the unauthenticated extension fetch.

import type { AdminQuestion, GhFile } from "./types";

// ── Repo configuration ─────────────────────────────────────────────────
// Change these to match the repo where questions.json lives. The PAT the
// user pastes must have Contents: Read & Write on this exact repo.
export const GH_OWNER  = "abhiramyarlagadda-svg";
export const GH_REPO   = "Auto-filler-admin";
export const GH_BRANCH = "main";
export const GH_FILE   = "questions.json";

// localStorage key for the user's Personal Access Token. Cleared by the
// "Log out" button in the header.
const PAT_KEY = "galaxy_admin_github_pat";

export function loadPat(): string | null {
  try { return localStorage.getItem(PAT_KEY); } catch { return null; }
}
export function savePat(pat: string): void {
  try { localStorage.setItem(PAT_KEY, pat); } catch { /* quota-exceeded is non-fatal */ }
}
export function clearPat(): void {
  try { localStorage.removeItem(PAT_KEY); } catch { /* ignore */ }
}

// ── API call helpers ───────────────────────────────────────────────────

const CONTENTS_URL =
  `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`;

interface ReadResult {
  questions: AdminQuestion[];
  sha: string;
}

// Fetches the current questions.json + its sha. The branch query param is
// what tells GitHub which ref to read.
//
// Cache discipline: `cache: "no-store"` tells the browser to skip its HTTP
// cache, and the `&_=<timestamp>` param forces any intermediate proxy/CDN
// (Cloudflare in front of api.github.com, ServiceWorker, etc.) to treat
// each call as unique. Without this, subsequent reads after a write can
// return the pre-write snapshot and the panel looks frozen.
export async function readQuestions(pat: string): Promise<ReadResult> {
  const bust = Date.now();
  const res = await fetch(`${CONTENTS_URL}?ref=${GH_BRANCH}&_=${bust}`, {
    headers: ghHeaders(pat),
    cache: "no-store",
  });
  if (res.status === 404) {
    // File doesn't exist yet — first-time setup. Caller can write the
    // initial empty array via writeQuestions(..., sha: undefined).
    return { questions: [], sha: "" };
  }
  if (!res.ok) {
    throw new Error(await describeError(res));
  }
  const file = (await res.json()) as GhFile;
  // GitHub returns base64-encoded content with embedded newlines every 60
  // chars. atob() ignores them but be defensive.
  const json = atob(file.content.replace(/\s+/g, ""));
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error("questions.json is not a JSON array — file shape corrupted");
  }
  return { questions: parsed as AdminQuestion[], sha: file.sha };
}

// Writes a new questions.json (full file replace). `sha` MUST be the value
// from the last readQuestions() — GitHub rejects the PUT otherwise. Pass
// the empty string on first-ever write (file didn't exist yet).
export async function writeQuestions(
  pat: string,
  questions: AdminQuestion[],
  sha: string,
  message: string,
): Promise<string> {
  // Pretty-print so manual diffs on GitHub are readable.
  const json = JSON.stringify(questions, null, 2) + "\n";
  // btoa expects Latin-1 — utf-8 detour handles non-ASCII safely.
  const content = utf8ToBase64(json);

  const body: Record<string, unknown> = {
    message,
    content,
    branch: GH_BRANCH,
  };
  if (sha) body.sha = sha;   // omit on first-ever creation

  const res = await fetch(CONTENTS_URL, {
    method: "PUT",
    headers: ghHeaders(pat),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await describeError(res));
  const out = (await res.json()) as { content: { sha: string } };
  return out.content.sha;
}

// ── Internals ──────────────────────────────────────────────────────────

function ghHeaders(pat: string): Record<string, string> {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function describeError(res: Response): Promise<string> {
  let body = "";
  try { body = await res.text(); } catch { /* ignore */ }
  if (res.status === 401) return "GitHub rejected the PAT (401). Check the token and its repo scope.";
  if (res.status === 403) return "GitHub returned 403. The PAT lacks Contents: Read & Write on this repo, or you hit a rate limit.";
  if (res.status === 404) return "GitHub returned 404. Check the repo owner/name/branch in githubClient.ts.";
  if (res.status === 409) return "Write conflict (409). Click Refresh and try again — someone else just updated the file.";
  if (res.status === 422) return "GitHub 422 — sha mismatch (someone edited since you loaded the page). Click Refresh.";
  return `GitHub ${res.status}: ${body.slice(0, 240)}`;
}

function utf8ToBase64(s: string): string {
  // Convert via UTF-8 byte sequence so non-ASCII characters survive the
  // round-trip through atob/btoa on the extension side.
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
