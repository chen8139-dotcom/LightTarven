-- Enable extension for UUID generation (usually enabled by default).
create extension if not exists "pgcrypto";

-- Profiles table (linked to auth.users).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('admin', 'user')),
  model_preference text not null default 'openai/gpt-4o-mini',
  disabled_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Character definitions.
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  greeting text,
  persona text not null,
  scenario text,
  style text,
  rules text,
  cover_image_url text,
  cover_image_path text,
  metadata jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Conversations under a character.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  title text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages under a conversation.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  created_at timestamptz not null default now()
);

create index if not exists idx_characters_user_id on public.characters(user_id);
create index if not exists idx_conversations_user_id on public.conversations(user_id);
create index if not exists idx_conversations_character_id on public.conversations(character_id);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_messages_user_id on public.messages(user_id);
create index if not exists idx_profiles_created_at_desc on public.profiles(created_at desc);

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_characters_touch on public.characters;
create trigger trg_characters_touch
before update on public.characters
for each row execute function public.touch_updated_at();

drop trigger if exists trg_conversations_touch on public.conversations;
create trigger trg_conversations_touch
before update on public.conversations
for each row execute function public.touch_updated_at();

-- Auto-create profile when auth user is created.
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Enable Row Level Security.
alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Profiles: user can read/update self only.
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Characters policies.
drop policy if exists "characters_select_own" on public.characters;
create policy "characters_select_own"
on public.characters for select
using (auth.uid() = user_id and deleted_at is null);

drop policy if exists "characters_insert_own" on public.characters;
create policy "characters_insert_own"
on public.characters for insert
with check (auth.uid() = user_id);

drop policy if exists "characters_update_own" on public.characters;
create policy "characters_update_own"
on public.characters for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "characters_delete_own" on public.characters;
create policy "characters_delete_own"
on public.characters for delete
using (auth.uid() = user_id);

-- Conversations policies.
drop policy if exists "conversations_select_own" on public.conversations;
create policy "conversations_select_own"
on public.conversations for select
using (auth.uid() = user_id and deleted_at is null);

drop policy if exists "conversations_insert_own" on public.conversations;
create policy "conversations_insert_own"
on public.conversations for insert
with check (auth.uid() = user_id);

drop policy if exists "conversations_update_own" on public.conversations;
create policy "conversations_update_own"
on public.conversations for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "conversations_delete_own" on public.conversations;
create policy "conversations_delete_own"
on public.conversations for delete
using (auth.uid() = user_id);

-- Messages policies.
drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own"
on public.messages for select
using (auth.uid() = user_id);

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
on public.messages for insert
with check (auth.uid() = user_id);

drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own"
on public.messages for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own"
on public.messages for delete
using (auth.uid() = user_id);

-- Storage bucket for character covers (run once in dashboard if needed).
-- Bucket name should match SUPABASE_CHARACTER_COVERS_BUCKET.
