-- Lado de fora da base: imagem externa e partes que precisam de manutenção.
-- Rode uma vez no SQL Editor do Supabase, depois do 20261110_base.sql. É seguro rodar de novo.

alter table public.base_state add column if not exists exterior_url text;
alter table public.base_state add column if not exists ext_w integer;
alter table public.base_state add column if not exists ext_h integer;

create table if not exists public.base_parts (
  id uuid primary key default gen_random_uuid(),
  session_code text not null default 'MESA',
  name text not null,
  kind text not null default 'reparo',
  description text,
  x real not null default 0.5,              -- posição na imagem externa (0 a 1)
  y real not null default 0.5,
  condition real not null default 100,      -- estado no momento cond_minutes
  max_condition integer not null default 100,
  wear_per_day real not null default 0,     -- quanto perde por dia do mundo (0 = não desgasta)
  cond_minutes bigint not null default 0,   -- minuto do relógio do mundo em que o estado foi gravado
  repair_items jsonb not null default '[]', -- [{ "name": "Tábua", "qty": 2 }]
  repair_amount integer not null default 0, -- quanto cada conserto devolve (0 = tudo)
  hidden boolean not null default false,
  last_repaired_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists base_parts_session_idx on public.base_parts (session_code);

alter table public.base_parts enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'base_parts' and policyname = 'mesa_base_parts') then
    create policy mesa_base_parts on public.base_parts for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'base_parts') then
    alter publication supabase_realtime add table public.base_parts;
  end if;
end $$;

-- Faz a API do Supabase enxergar as colunas novas na hora.
notify pgrst, 'reload schema';
