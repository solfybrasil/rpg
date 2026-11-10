-- Base do grupo (taverna, covil, casa, embarcação…): cenário, armazenamentos e itens guardados.
-- Rode uma vez no SQL Editor do Supabase (projeto principal do app). É seguro rodar de novo.

create table if not exists public.base_state (
  session_code text primary key default 'MESA',
  name text not null default 'A Base',
  background_url text,
  img_w integer,
  img_h integer,
  updated_at timestamptz not null default now()
);

create table if not exists public.base_storages (
  id uuid primary key default gen_random_uuid(),
  session_code text not null default 'MESA',
  name text not null,
  kind text not null default 'bau',
  x real not null default 0.5,          -- posição na imagem (0 a 1)
  y real not null default 0.5,
  slots integer not null default 12,    -- espaços atuais
  owned boolean not null default true,  -- false = à venda para os jogadores
  price_bronze integer not null default 0,
  level integer not null default 1,
  max_level integer not null default 1,
  upgrade_price integer not null default 0,
  upgrade_slots integer not null default 0,
  hidden boolean not null default false,
  bought_by text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.base_items (
  id uuid primary key default gen_random_uuid(),
  session_code text not null default 'MESA',
  storage_id uuid not null references public.base_storages(id) on delete cascade,
  slot_index integer not null default 0,
  quantity integer not null default 1,
  item jsonb not null,                  -- cópia do item da mochila
  deposited_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists base_storages_session_idx on public.base_storages (session_code);
create index if not exists base_items_storage_idx on public.base_items (storage_id);

-- Acesso igual ao resto da mesa (chave pública do app).
alter table public.base_state enable row level security;
alter table public.base_storages enable row level security;
alter table public.base_items enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'base_state' and policyname = 'mesa_base_state') then
    create policy mesa_base_state on public.base_state for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'base_storages' and policyname = 'mesa_base_storages') then
    create policy mesa_base_storages on public.base_storages for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'base_items' and policyname = 'mesa_base_items') then
    create policy mesa_base_items on public.base_items for all using (true) with check (true);
  end if;
end $$;

-- Tempo real
do $$
declare t text;
begin
  foreach t in array array['base_state', 'base_storages', 'base_items'] loop
    if not exists (
      select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
