-- Migração: Sistema de Imagens de Itens com FLUX (Cloudflare Workers AI)
-- Rode este script no SQL Editor do Supabase (projeto ermkaldfvvjgnhgnvcqo).

-- 1. Colunas na tabela item_catalog
alter table public.item_catalog add column if not exists image_url text;
alter table public.item_catalog add column if not exists image_status text default 'pendente';
alter table public.item_catalog add column if not exists image_prompt_en text;
alter table public.item_catalog add column if not exists image_family text;
alter table public.item_catalog add column if not exists image_error text;

-- Índices para performance das consultas em lote
create index if not exists idx_item_catalog_image_status on public.item_catalog (image_status);
create index if not exists idx_item_catalog_image_family on public.item_catalog (image_family);

-- 2. Criar bucket público 'itens' no Storage
insert into storage.buckets (id, name, public)
values ('itens', 'itens', true)
on conflict (id) do update set public = true;

-- Políticas de acesso para o bucket 'itens'
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Public read itens') then
    create policy "Public read itens" on storage.objects for select using (bucket_id = 'itens');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Allow upload itens') then
    create policy "Allow upload itens" on storage.objects for insert with check (bucket_id = 'itens');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Allow update itens') then
    create policy "Allow update itens" on storage.objects for update using (bucket_id = 'itens');
  end if;
end $$;

-- 3. Atualizar itens existentes que não tenham status
update public.item_catalog
set image_status = case
  when image_url is not null and image_url != '' then 'pronta'
  else 'pendente'
end
where image_status is null;

-- 4. Agendamento com pg_cron + pg_net (a cada 10 minutos)
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'gerar-imagens-itens-cron') then
    perform cron.unschedule('gerar-imagens-itens-cron');
  end if;
end $$;

select cron.schedule(
  'gerar-imagens-itens-cron',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://ermkaldfvvjgnhgnvcqo.supabase.co/functions/v1/gerar-imagens-itens',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Recarregar cache do PostgREST para enxergar as colunas na hora
notify pgrst, 'reload schema';
