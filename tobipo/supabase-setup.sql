-- Supabase Dashboard > SQL Editor で一度だけ実行してください。
-- 閲覧は全員、追加・変更はログイン済みの全ユーザーに許可します。
-- 意図しない全削除を避けるため、delete権限は付与しません。

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 200),
  horikogasa numeric(4,1) check (horikogasa between 0 and 100),
  ask0414 numeric(4,1) check (ask0414 between 0 and 100),
  average numeric(4,1) generated always as (
    case
      when horikogasa is null then ask0414
      when ask0414 is null then horikogasa
      else (horikogasa + ask0414) / 2
    end
  ) stored,
  high numeric(4,1) generated always as (greatest(horikogasa, ask0414)) stored,
  url text not null,
  thumbnail text not null,
  note text not null default '' check (char_length(note) <= 1000),
  confidence text not null default '確定' check (confidence in ('確定', '推定')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (horikogasa is not null or ask0414 is not null)
);

create or replace function public.set_song_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_song_updated_at on public.songs;
create trigger set_song_updated_at
before update on public.songs
for each row execute function public.set_song_updated_at();

alter table public.songs enable row level security;

revoke all on table public.songs from anon, authenticated;
grant select on table public.songs to anon, authenticated;
grant insert, update on table public.songs to authenticated;

drop policy if exists "songs are publicly readable" on public.songs;
create policy "songs are publicly readable"
on public.songs for select
to anon, authenticated
using (true);

drop policy if exists "logged in users can add songs" on public.songs;
create policy "logged in users can add songs"
on public.songs for insert
to authenticated
with check (true);

drop policy if exists "logged in users can update songs" on public.songs;
create policy "logged in users can update songs"
on public.songs for update
to authenticated
using (true)
with check (true);
