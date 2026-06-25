create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  credits integer not null default 5,
  plan text not null default 'free',
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'queued',
  original_prompt text not null,
  enhanced_prompt text,
  provider text not null default 'kling',
  provider_job_id text,
  output_url text,
  duration integer,
  credits_used integer not null default 1,
  error text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger jobs_updated_at
  before update on public.jobs
  for each row execute procedure update_updated_at();

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;

create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can read own jobs" on public.jobs for select using (auth.uid() = user_id);
create policy "Users can insert own jobs" on public.jobs for insert with check (auth.uid() = user_id);
create policy "Service role full access on jobs" on public.jobs for all using (true);
