# Galaxy Auto-Filler — Admin Panel

A small React + Vite web app for managing the question library that powers
the **Galaxy Auto-Filler** Chrome extension.

The library lives as a single `questions.json` file in this repo. The admin
panel edits it via the **GitHub Contents API**; the extension reads the
latest version via **raw.githubusercontent.com**. No database, no auth
server, no recurring cost — GitHub is the storage layer.

> Companion to the extension repo:
> https://github.com/ncpl-hrudai/Auto-filler-extension

---

## Quick start

```bash
# 1. Install deps
npm install

# 2. Run locally
npm run dev          # opens http://localhost:5173

# 3. Build for production
npm run build        # outputs dist/
```

There are no `.env` files anymore. The admin's GitHub Personal Access
Token is collected at runtime in the browser and stored in `localStorage`.

---

## One-time setup

### 1. Create `questions.json` in this repo

Commit a file at the root of this repo named **`questions.json`**, containing
a JSON array (start with `[]` or seed with rows that match this shape):

```json
[
  {
    "id": "uuid-string",
    "keyword": "gender",
    "display_label": "Gender",
    "category": "default",
    "placeholder": "Male / Female / ...",
    "priority": 100,
    "active": true
  }
]
```

(A seed file is in the extension repo at `public/questions.json` — copy it
over for a starting point with ~12 common admin questions.)

### 2. Generate a fine-grained GitHub PAT

Open **GitHub → Settings → Developer settings → Personal access tokens
(fine-grained) → Generate new token**.

| Field | Value |
|---|---|
| Repository access | Only select repositories → this repo |
| Repository permissions → Contents | **Read and write** |
| Expiration | Up to you (90 days recommended) |

Copy the token (starts with `github_pat_`).

### 3. Open the admin panel and paste the PAT

`npm run dev` → open the URL → paste the PAT → click **Connect**.

The PAT is verified by reading `questions.json` from the configured repo,
then cached in `localStorage`. Click **Log out** in the header to clear it.

### 4. Wire the extension

Open `src/background/service-worker.ts` in the **extension** repo. At the
top of the admin-questions section, ensure these constants match this repo:

```ts
const GH_OWNER  = "abhiramyarlagadda-svg";
const GH_REPO   = "Auto-filler-admin";
const GH_BRANCH = "main";
const GH_FILE   = "questions.json";
```

The extension fetches:
`https://raw.githubusercontent.com/<owner>/<repo>/<branch>/questions.json`

---

## Where to point the panel

The repo it reads/writes is hard-coded in `src/githubClient.ts`:

```ts
export const GH_OWNER  = "abhiramyarlagadda-svg";
export const GH_REPO   = "Auto-filler-admin";
export const GH_BRANCH = "main";
export const GH_FILE   = "questions.json";
```

Change these to point at a different repo, branch, or filename.

---

## Features

- ✅ PAT-based GitHub auth (no email/password account)
- ✅ Add / inline-edit / delete questions
- ✅ Each mutation creates a real git commit on `main` (full history of who changed what)
- ✅ Refresh button re-reads the file (clears local cache)
- ✅ Optimistic-lock writes (sha) — surfaces a clear error if two admins edit at the same time

---

## Tech stack

- React 18 + Vite + TypeScript
- GitHub Contents API for reads/writes
- Plain CSS (no Tailwind)

---

## Deploy

### Vercel

1. Push this repo to GitHub.
2. https://vercel.com → Import → select repo → Deploy.
3. **No env vars needed.** The PAT is collected in-browser.

### Netlify / S3 / GitHub Pages

Same idea — `npm run build` and host `dist/`. Stateless static site.

---

## How it talks to the extension

| Direction | What |
|---|---|
| Admin panel → GitHub API | Authenticated `PUT /repos/{owner}/{repo}/contents/questions.json` |
| GitHub → Extension | Public `GET raw.githubusercontent.com/.../questions.json` (no auth needed) |
| Extension caches the list in `chrome.storage.local`; falls back to its bundled copy on network failure |
| User answers stay 100% local — they never leave the user's device |

When you add a question and click **Save**, the file is committed on `main`.
Within ~5 seconds (raw CDN cache busted by `?t=<timestamp>`) every
extension user sees it on their next Profile tab open.

---

## Folder layout

```
src/
├── main.tsx              entry; mounts <App/>
├── App.tsx               app shell — PAT gate + header + <Questions/>
├── githubClient.ts       GitHub Contents API helpers (read/write/PAT)
├── types.ts              AdminQuestion + GhFile shapes
├── index.css             base styles
└── pages/
    ├── PatSetup.tsx      first-time PAT collector
    └── Questions.tsx     full CRUD dashboard
```

---

## Caveats

- **PAT in localStorage** — anyone with devtools access to the admin
  panel can read it. Fine for a single trusted admin. For stricter
  multi-user auth, front writes with a Vercel serverless function that
  holds the PAT server-side.
- **Raw CDN cache** — GitHub's raw endpoint caches for up to ~5 minutes,
  but the extension cache-busts via a `?t=<timestamp>` query string so
  changes propagate within seconds.
- **422 sha mismatch** — if two admins edit concurrently, the second one
  to save sees a "sha mismatch" error. Click Refresh and try again.
