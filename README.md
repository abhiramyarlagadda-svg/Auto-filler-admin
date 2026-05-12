# Galaxy Auto-Filler — Admin Panel

A small React + Vite web app for managing the question library that powers the
**Galaxy Auto-Filler** Chrome extension. Admin signs in, adds/edits/deletes
question rows in Supabase, and every user's extension pulls the latest list
automatically.

> Companion to the extension repo:
> https://github.com/ncpl-hrudai/Auto-filler-extension

---

## Quick start

```bash
# 1. Install deps
npm install

# 2. Configure Supabase credentials
cp .env.example .env
# then edit .env with your project URL + anon key

# 3. Run locally
npm run dev          # opens http://localhost:5173

# 4. Build for production
npm run build        # outputs dist/
```

---

## One-time Supabase setup

### 1. Table

Run this in the Supabase **SQL Editor** (skip if already done):

```sql
create table if not exists admin_questions (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  display_label text,
  category text default 'general',
  placeholder text,
  priority int default 0,
  active boolean default true,
  created_at timestamp default now()
);
```

### 2. Row-Level Security policies

```sql
alter table admin_questions enable row level security;

-- Anyone (extension users with the anon key) can READ active rows
create policy "anon read active questions"
  on admin_questions
  for select
  to anon
  using (active = true);

-- Authenticated users (admin) can also SEE inactive rows
create policy "authenticated read all questions"
  on admin_questions
  for select
  to authenticated
  using (true);

-- Authenticated users can INSERT
create policy "authenticated insert questions"
  on admin_questions
  for insert
  to authenticated
  with check (true);

-- Authenticated users can UPDATE
create policy "authenticated update questions"
  on admin_questions
  for update
  to authenticated
  using (true)
  with check (true);

-- Authenticated users can DELETE
create policy "authenticated delete questions"
  on admin_questions
  for delete
  to authenticated
  using (true);
```

### 3. Create the admin user

Dashboard → **Authentication → Users → Add User** → enter your email and a
password. That's the account you'll sign in with on the admin panel.

---

## Features

- ✅ Email + password login (Supabase Auth)
- ✅ Add new questions with category, priority, active flag
- ✅ Inline edit any field of any row
- ✅ Soft toggle (set active=false) — hides from extension users without losing data
- ✅ Hard delete (with confirmation)
- ✅ Search by keyword/label/category
- ✅ Filter by category, show/hide inactive
- ✅ Real-time refresh button

---

## Tech stack

- React 18 + Vite + TypeScript
- `@supabase/supabase-js` for auth + DB
- React Router for `/login` ↔ `/questions`
- Plain CSS (no Tailwind needed)

---

## Deploy

### Vercel (recommended)

1. Push this repo to GitHub
2. https://vercel.com → Import → select repo → Deploy
3. Add the two env vars in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Netlify

Same idea — connect GitHub repo, set env vars, deploy.

### Manual (any static host)

```bash
npm run build
# upload the dist/ folder to any static host (S3, GitHub Pages, etc.)
```

---

## Folder layout

```
src/
├── main.tsx              entry; mounts <App/> inside <BrowserRouter/>
├── App.tsx               routes + auth gate (session listener)
├── supabaseClient.ts     Supabase client singleton
├── types.ts              AdminQuestion interface + CATEGORIES constant
├── index.css             base styles (CSS variables, table, forms, buttons)
└── pages/
    ├── Login.tsx         email + password sign-in form
    └── Questions.tsx     full CRUD dashboard
```

---

## How it talks to the extension

| Direction | What |
|---|---|
| Admin panel → Supabase | Authenticated writes (INSERT/UPDATE/DELETE) |
| Supabase → Extension | Anon-key SELECT of `active=true` rows |
| Extension caches the list in `chrome.storage.local` with a 24h TTL |
| User answers stay 100% local — they never leave the user's device |

When you add a question via this panel and click **Active**, every extension
user sees it on their next Profile tab open (or within 24h, whichever comes
first).
