-- Mercado automático por região: configuração, ajustes do Mestre e vendas.
-- Rode uma vez no SQL Editor do Supabase. É seguro rodar de novo.

create table if not exists public.market_config (
  session_code text primary key default 'MESA',
  mode text not null default 'auto',          -- auto: cidade mais perto do grupo · fixed: place_id
  place_id text,                              -- id do lugar no mapa (map_places.id ou "base-<n>")
  restock_days real not null default 3,       -- estoque renova a cada N dias do relógio do mundo
  period_offset integer not null default 0,   -- "renovar agora" soma 1
  price_mult real not null default 1,         -- ajuste geral de preços
  updated_at timestamptz not null default now()
);

create table if not exists public.market_overrides (
  id uuid primary key default gen_random_uuid(),
  session_code text not null default 'MESA',
  scope text not null default '*',            -- '*' = todos os mercados · id da região · 'place:<id>'
  catalog_id text not null,
  mode text not null default 'sempre',        -- sempre (fixa no mercado) · nunca (tira)
  price_bronze integer,                       -- preço fixo (opcional)
  stock integer,                              -- estoque fixo (opcional)
  created_at timestamptz not null default now()
);
create index if not exists market_overrides_scope_idx on public.market_overrides (session_code, scope);

create table if not exists public.market_sales (
  id uuid primary key default gen_random_uuid(),
  session_code text not null default 'MESA',
  market_key text not null,                   -- lugar + período do estoque
  catalog_id text not null,
  qty integer not null default 1,
  price_bronze integer not null default 0,
  character_id text,
  kind text not null default 'compra',        -- compra · venda
  created_at timestamptz not null default now()
);
create index if not exists market_sales_key_idx on public.market_sales (session_code, market_key);

alter table public.market_config enable row level security;
alter table public.market_overrides enable row level security;
alter table public.market_sales enable row level security;
do $$
declare t text;
begin
  foreach t in array array['market_config', 'market_overrides', 'market_sales'] loop
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'mesa_' || t) then
      execute format('create policy %I on public.%I for all using (true) with check (true)', 'mesa_' || t, t);
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
