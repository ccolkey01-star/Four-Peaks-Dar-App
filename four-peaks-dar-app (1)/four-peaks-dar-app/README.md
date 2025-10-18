# Four Peaks DAR Uploader (Next.js + Supabase)

A production-ready starter to let guards submit **Daily Activity Reports** with photos and BWC clips.
- Supabase Auth (magic link), Postgres, and private Storage
- Offline-first queue (localStorage) + manual sync
- Chain-of-custody hashes (SHA-256) stored per file

## 1) Create Supabase project
Grab `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your project settings.
Create a **Service Role Key** (Settings → API) for `SUPABASE_SERVICE_ROLE_KEY` (server only).

### SQL (run in Supabase SQL editor)
```sql
create extension if not exists "uuid-ossp";
create table if not exists public.dar_reports (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  officer_name text not null,
  badge text,
  site text not null,
  category text not null,
  description text not null,
  notes text,
  bwc_referenced boolean not null default true,
  ts_client timestamptz,
  shift text,
  patrol_cycle text,
  lat double precision,
  lng double precision,
  accuracy_m integer,
  photo_urls jsonb not null default '[]',
  video_urls jsonb not null default '[]',
  file_hashes jsonb not null default '[]'
);

alter table public.dar_reports enable row level security;

create policy dar_insert on public.dar_reports
  for insert to authenticated with check (auth.uid() = created_by);

create policy dar_select_self on public.dar_reports
  for select to authenticated using (created_by = auth.uid() or (auth.jwt() ->> 'role') = 'supervisor');
```

Create two **private** Storage buckets: `dar-photos` and `dar-videos`.

## 2) Local run
```bash
cp .env.example .env.local
# fill in your Supabase keys
npm install
npm run dev
```

## 3) Deploy (Vercel)
- Import the repo into Vercel
- Add Environment Variables (from `.env.example`)
- Deploy

## Notes
- API returns 30‑day signed URLs. Keep `path` fields in DB and mint fresh signed URLs for supervisor dashboards.
- Consider adding a `supervisors` table and expanding RLS for cross-site read access.
