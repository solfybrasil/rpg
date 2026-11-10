-- Baús de tesouro: o Mestre sorteia, confere e libera; os jogadores pegam.
-- Rode uma vez no SQL Editor do Supabase. É seguro rodar de novo.

create table if not exists public.treasure_chests (
  id uuid primary key default gen_random_uuid(),
  session_code text not null default 'MESA',
  name text not null default 'Baú',
  tier text not null default 'madeira',     -- madeira · ferro · ouro · amaldicoado · lendario
  status text not null default 'rascunho',  -- rascunho (só o Mestre vê) · liberado · vazio
  for_heroes text[],                        -- null = qualquer jurado
  items jsonb not null default '[]',        -- [{ key, catalog_id, name, rarity, category, image_url, qty, for, taken_by }]
  coins integer not null default 0,         -- em bronze
  coins_taken_by text,
  map_id text,                              -- espalhado no mapa de batalha
  map_token_id text,
  version integer not null default 0,       -- cada mudança soma 1 (dois jogadores não pegam o mesmo item)
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists treasure_chests_status_idx on public.treasure_chests (session_code, status);

alter table public.treasure_chests enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'treasure_chests' and policyname = 'mesa_treasure_chests') then
    create policy mesa_treasure_chests on public.treasure_chests for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'treasure_chests') then
    alter publication supabase_realtime add table public.treasure_chests;
  end if;
end $$;
