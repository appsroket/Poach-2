-- Poach — full database schema (reference for Prompt 3).
-- Apply via the Supabase SQL editor or CLI migrations. Not run automatically.

create extension if not exists vector;

-- profiles: extends auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  full_name text,
  headline text,
  target_roles text[] default '{}',
  target_locations text[] default '{}',
  remote_pref text default 'any',          -- any | remote | hybrid | onsite
  seniority text,                          -- intern | junior | mid | senior | lead
  onboarding_complete boolean default false,
  email_optout boolean default false,
  plan text default 'free'                 -- free | pro
);
alter table profiles enable row level security;

create table resumes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  storage_path text not null,
  file_name text,
  parsed jsonb,
  embedding vector(1536),
  is_primary boolean default true
);
alter table resumes enable row level security;

create table companies (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  website text,
  careers_url text,
  ats_type text,                           -- greenhouse | lever | ashby | workable | html
  ats_slug text,
  unique (name, careers_url)
);
alter table companies enable row level security;

create table jobs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  company_id uuid references companies(id) on delete cascade,
  external_id text,
  title text not null,
  location text,
  remote boolean default false,
  employment_type text,
  description text,
  apply_url text not null,
  posted_at timestamptz,
  embedding vector(1536),
  is_active boolean default true,
  unique (company_id, external_id)
);
alter table jobs enable row level security;
create index jobs_embedding_idx on jobs using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table matches (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  job_id uuid references jobs(id) on delete cascade not null,
  score numeric(4,3),
  reasons jsonb,                           -- {fit:[], gaps:[]}
  status text default 'new',               -- new | saved | dismissed
  unique (user_id, job_id)
);
alter table matches enable row level security;

create table applications (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  job_id uuid references jobs(id) on delete cascade not null,
  tailored_resume jsonb,
  cover_letter text,
  status text default 'draft',             -- draft | approved | sent
  stage text default 'matched',            -- matched | applied | replied | interview | offer | rejected
  sent_at timestamptz,
  unique (user_id, job_id)
);
alter table applications enable row level security;

create table outreach (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  application_id uuid references applications(id) on delete cascade,
  contact_name text,
  contact_title text,
  contact_email text,
  message text,
  status text default 'draft',             -- draft | sent
  sent_at timestamptz
);
alter table outreach enable row level security;

create table activities (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  application_id uuid references applications(id) on delete cascade,
  type text not null,                      -- note | followup | stage_change
  body text,
  due_at timestamptz,
  done boolean default false
);
alter table activities enable row level security;

create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text default 'free',
  status text default 'inactive',          -- inactive | active | past_due | canceled
  current_period_end timestamptz
);
alter table subscriptions enable row level security;

create table notifications (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  match_id uuid references matches(id) on delete cascade,
  type text default 'new_match',
  read boolean default false
);
alter table notifications enable row level security;

-- RLS policies ---------------------------------------------------------------
create policy "own rows" on resumes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own rows" on matches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on applications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on outreach for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on activities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read jobs" on jobs for select using (auth.role() = 'authenticated');
create policy "read companies" on companies for select using (auth.role() = 'authenticated');

-- Vector match RPC -----------------------------------------------------------
create or replace function match_jobs(query_embedding vector(1536), match_count int)
returns table (job_id uuid, score float)
language sql stable as $$
  select id, 1 - (embedding <=> query_embedding)
  from jobs
  where is_active = true and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Storage: create a private bucket `resumes`; objects at resumes/{user_id}/{file};
-- owner-only policies. Configured in the Supabase dashboard / CLI.
