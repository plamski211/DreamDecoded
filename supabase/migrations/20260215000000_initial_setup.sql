-- Storage bucket for dream audio recordings
insert into storage.buckets (id, name, public)
values ('dream-audio', 'dream-audio', false)
on conflict (id) do nothing;

-- Allow authenticated users to upload audio
create policy "Users can upload their own audio"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'dream-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read their own audio
create policy "Users can read their own audio"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'dream-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow service role (edge functions) to read any audio
create policy "Service role can read all audio"
  on storage.objects for select
  to service_role
  using (bucket_id = 'dream-audio');

-- Profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  created_at timestamptz default now(),
  streak_current int default 0,
  streak_longest int default 0,
  last_dream_date date,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'premium')),
  interpretation_style text default 'mixed' check (interpretation_style in ('jungian', 'modern', 'spiritual', 'mixed')),
  reminder_time time,
  onboarding_completed boolean default false
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Dreams table
create table if not exists public.dreams (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  title text,
  transcription text,
  summary text,
  audio_url text,
  audio_duration_seconds int,
  moods jsonb default '[]',
  symbols jsonb default '[]',
  interpretation text,
  art_url text,
  is_premium_content boolean default false
);

alter table public.dreams enable row level security;

create policy "Users can read own dreams"
  on public.dreams for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own dreams"
  on public.dreams for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own dreams"
  on public.dreams for update
  to authenticated
  using (user_id = auth.uid());

create policy "Users can delete own dreams"
  on public.dreams for delete
  to authenticated
  using (user_id = auth.uid());
