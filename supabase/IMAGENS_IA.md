# Imagens dos itens com IA (Cloudflare Workers AI)

A Edge Function `gerar-imagens-itens` pega itens do catálogo **sem imagem**, gera
um ícone com o Flux (Cloudflare Workers AI), salva no Storage (bucket `items`,
pasta `catalogo/`) e preenche o `image_url` do item. Mochilas e a loja antiga que
tinham cópias desse item sem imagem também recebem a imagem.

Todas as imagens usam o mesmo prompt-modelo, para os ícones terem a mesma cara:

```
Fantasy RPG inventory icon of {nome do item}, {descrição curta}, single object centered,
painterly game asset style, dark fantasy, warm ember lighting, soft shadow,
plain dark stone background, no text, no border, square 1:1
```

O nome e a descrição são traduzidos para inglês antes (modelo de texto da própria
Cloudflare), porque o gerador entende inglês muito melhor.

## 1. Token novo da Cloudflare

O token que foi colado no chat deve ser trocado.

1. Cloudflare → **My Profile → API Tokens → Create Token**.
2. Use o modelo **Workers AI** (permissões de Workers AI para a sua conta).
3. Copie o token novo e **apague o antigo** na mesma tela.
4. Anote o **Account ID**: Cloudflare → **Workers & Pages** → coluna da direita.

## 2. Publicar a função no Supabase

**Pelo painel (sem instalar nada):**

1. Supabase → **Edge Functions → Deploy a new function → Via Editor**.
2. Nome: `gerar-imagens-itens`.
3. Apague o exemplo, cole todo o conteúdo de
   `supabase/functions/gerar-imagens-itens/index.ts` e clique em **Deploy**.

**Ou pelo terminal:**

```bash
npx supabase functions deploy gerar-imagens-itens --project-ref SEU-PROJETO
```

## 3. Secrets (a chave fica só aqui)

Supabase → **Edge Functions → Secrets** → adicione:

| Nome | Valor |
|---|---|
| `CF_ACCOUNT_ID` | o Account ID da Cloudflare |
| `CF_API_TOKEN` | o token novo |

Opcionais: `CF_IMAGE_MODEL` (padrão `@cf/black-forest-labs/flux-1-schnell`),
`CF_TEXT_MODEL` (padrão `@cf/meta/llama-3.1-8b-instruct`),
`ITEM_IMAGES_BUCKET` (padrão `items`).

## 4. Testar

No app do Mestre: **Itens** (ou **Oficina → Mercado**) → painel **Imagens com IA** →
**Gerar as próximas 50**. Leva até 2 minutos. O painel mostra quantos itens já
têm imagem.

Itens novos criados no catálogo ganham imagem sozinhos alguns segundos depois de salvar.

## 5. Rodar sozinho todo dia

1. Supabase → **Integrations** → ative **Cron** (pg_cron) e **pg_net**.
2. No **SQL Editor**, rode (troque `SEU-PROJETO` e `SUA_ANON_KEY`, que ficam em
   **Project Settings → API**):

```sql
select cron.schedule(
  'gerar-imagens-itens',
  '17 3,11,19 * * *', -- 3 vezes por dia (horário UTC)
  $$
  select net.http_post(
    url := 'https://SEU-PROJETO.supabase.co/functions/v1/gerar-imagens-itens',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SUA_ANON_KEY'
    ),
    body := '{"limit": 50}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);
```

Para parar: `select cron.unschedule('gerar-imagens-itens');`

## Quanto custa e quanto demora

- O plano grátis da Cloudflare dá uma cota diária de uso de IA. Quando ela acaba,
  a função para sozinha e o resto fica para a próxima rodada; nada se perde.
- Com 3 rodadas de 50 por dia, 3.000 itens levam cerca de 20 dias (menos se a
  cota permitir chamar mais vezes pelo botão).
- Cada imagem é um JPEG de 1024×1024 (cerca de 100 KB). 3.000 imagens ocupam
  perto de 300 MB no Storage.

## Refazer imagens

Chamada com `{"ids": ["id-do-item"], "regenerate": true}` refaz a imagem
daqueles itens (até 50 por vez).
