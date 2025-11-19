-- Database Schema for Gossipify
-- This matches the exact schema provided

-- Users
create table public.users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  display_name text,
  avatar_url text,
  public_key text not null,
  created_at timestamptz default now()
);

-- Chats
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  is_group boolean default false,
  created_at timestamptz default now()
);

-- Chat Members
create table public.chat_members (
  chat_id uuid references public.chats(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  display_name text,
  is_unknown boolean default false,
  primary key (chat_id, user_id)
);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chats(id) on delete cascade,
  sender_id uuid references public.users(id) not null,
  ciphertext bytea not null,
  nonce bytea not null,
  kind text not null,       -- text, image, audio, file
  media_path text,
  media_mime text,
  created_at timestamptz default now(),
  delivered boolean default false
);

-- Blocked Users
create table public.blocked_users (
  blocker uuid references public.users(id) on delete cascade,
  blocked uuid references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker, blocked)
);

-- Index for performance
create index idx_messages_chat_created on public.messages (chat_id, created_at desc);
create index idx_chat_members_user on public.chat_members (user_id);
create index idx_chat_members_chat on public.chat_members (chat_id);

-- Enable RLS
alter table public.messages enable row level security;
alter table public.chat_members enable row level security;
alter table public.chats enable row level security;
alter table public.blocked_users enable row level security;
alter table public.users enable row level security;

-- Users: anyone can view (for public key lookup)
create policy select_users_public on public.users
  for select using (true);

-- Users: can update own profile
create policy update_users_self on public.users
  for update using (auth.uid() = id);

-- Users: can insert own profile
create policy insert_users_self on public.users
  for insert with check (auth.uid() = id);

-- Messages: only chat members can select
create policy select_messages_if_member on public.messages
  for select using (
    exists (
      select 1 from public.chat_members cm
      where cm.chat_id = public.messages.chat_id and cm.user_id = auth.uid()
    )
  );

-- Messages: only sender can insert
create policy insert_messages_if_sender on public.messages
  for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.chat_members cm
      where cm.chat_id = chat_id and cm.user_id = auth.uid()
    )
  );

-- Chat members: only members can view
create policy select_chat_members_if_member on public.chat_members
  for select using (
    exists (
      select 1 from public.chat_members cm
      where cm.chat_id = public.chat_members.chat_id and cm.user_id = auth.uid()
    )
  );

-- Chat members: can insert if you're adding yourself or creating a chat
create policy insert_chat_members_self on public.chat_members
  for insert with check (
    user_id = auth.uid() or
    exists (
      select 1 from public.chat_members cm
      where cm.chat_id = chat_id and cm.user_id = auth.uid()
    )
  );

-- Chat members: can update if you're a member
create policy update_chat_members_if_member on public.chat_members
  for update using (
    exists (
      select 1 from public.chat_members cm
      where cm.chat_id = public.chat_members.chat_id and cm.user_id = auth.uid()
    )
  );

-- Blocked users: only blocker sees
create policy select_blocked_users_self on public.blocked_users
  for select using (blocker = auth.uid());

-- Blocked users: only blocker can insert
create policy insert_blocked_users_self on public.blocked_users
  for insert with check (blocker = auth.uid());

-- Blocked users: only blocker can delete
create policy delete_blocked_users_self on public.blocked_users
  for delete using (blocker = auth.uid());

-- Chats: only members can view
create policy select_chats_if_member on public.chats
  for select using (
    exists (
      select 1 from public.chat_members cm
      where cm.chat_id = public.chats.id and cm.user_id = auth.uid()
    )
  );

-- Chats: can insert (will be member via chat_members)
create policy insert_chats on public.chats
  for insert with check (true);
