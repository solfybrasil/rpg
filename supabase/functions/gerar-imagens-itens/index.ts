// Supabase Edge Function: gerar-imagens-itens
// Processa imagens de itens com o modelo FLUX-1-schnell da Cloudflare Workers AI
// Usado tanto na fila automática (pg_cron) quanto no botão "Gerar com IA" da tela de edição.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeFamily(name: string): string {
  let cleaned = (name || "").trim();
  cleaned = cleaned.replace(/\s*[\(\[].*?[\)\]]/g, "");
  cleaned = cleaned.replace(/\s*[\+\-]\d+/g, "");
  cleaned = cleaned.replace(/\s+\b(X|IX|VIII|VII|VI|V|IV|III|II|I)\b/gi, "");
  cleaned = cleaned.replace(
    /\s*[-–—]?\s*\b(menor|maior|superior|supremo|perfeito|perfeita|básico|basico|avançado|avancado|pequeno|pequena|médio|medio|média|media|grande|gigante|antigo|antiga|velho|velha|desgastado|desgastada|bruto|bruta|refinado|refinada)\b$/i,
    ""
  );
  cleaned = cleaned.replace(/\s+\d+$/g, "");
  cleaned = cleaned.trim();
  if (!cleaned) cleaned = (name || "").trim();

  return (
    cleaned
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cfAccountId = Deno.env.get("CF_ACCOUNT_ID")!;
    const cfApiToken = Deno.env.get("CF_API_TOKEN")!;

    if (!cfAccountId || !cfApiToken) {
      throw new Error("Secrets CF_ACCOUNT_ID ou CF_API_TOKEN ausentes nas configurações da Edge Function.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let reqBody: any = {};
    try {
      reqBody = await req.json();
    } catch {
      // Chamada sem body ou disparada por pg_cron
    }

    // =========================================================================
    // CASO 1: Geração sob demanda direta da tela de criação/edição do item
    // =========================================================================
    if (reqBody?.name) {
      const family = reqBody.family || normalizeFamily(reqBody.name);
      const promptEn = reqBody.promptEn || `${reqBody.name}, ${reqBody.category || "equipment"}`;
      const fullPrompt = `Fantasy RPG inventory icon of ${promptEn}, single object centered, full view, painterly game asset style, dark fantasy, warm soft lighting, plain dark stone background, no text, no border, square`;

      const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
      const resp = await fetch(cfUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: fullPrompt, steps: 4 }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Cloudflare FLUX error (${resp.status}): ${errText}`);
      }

      const json = await resp.json();
      if (!json.success && !json.result?.image) {
        throw new Error(`Erro Cloudflare: ${JSON.stringify(json.errors || json)}`);
      }

      const base64Data = json.result.image;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let b = 0; b < binaryString.length; b++) {
        bytes[b] = binaryString.charCodeAt(b);
      }

      const storagePath = `${family}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("itens")
        .upload(storagePath, bytes, {
          contentType: "image/jpeg",
          upsert: true,
          cacheControl: "31536000",
        });

      if (uploadError) {
        // Fallback caso o bucket itens ainda não esteja criado
        await supabase.storage.from("items").upload(`flux/${storagePath}`, bytes, {
          contentType: "image/jpeg",
          upsert: true,
        });
      }

      const { data: publicData } = supabase.storage.from("itens").getPublicUrl(storagePath);
      const publicUrl = publicData.publicUrl;

      // Se tiver itemId, atualiza no banco de dados imediatamente
      if (reqBody.itemId) {
        await supabase
          .from("item_catalog")
          .update({
            image_url: publicUrl,
            image_status: "pronta",
            image_error: null,
          })
          .eq("id", reqBody.itemId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          imageUrl: publicUrl,
          promptEn,
          family,
          provider: "cloudflare-flux",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // CASO 2: Fila agendada por lote (pg_cron a cada 10 min) ou por item/família
    // =========================================================================
    const targetItemId = reqBody?.itemId;
    const targetFamily = reqBody?.family;

    let pendingItems: any[] = [];

    if (targetItemId || targetFamily) {
      let query = supabase
        .from("item_catalog")
        .select("id, name, image_family, image_prompt_en, description, category");
      if (targetItemId) {
        query = query.eq("id", targetItemId);
      } else {
        query = query.eq("image_family", targetFamily);
      }
      const { data, error: targetError } = await query.limit(1);
      if (!targetError && data && data.length > 0) {
        pendingItems = data;
      }
    }

    if (pendingItems.length === 0) {
      const { data: batch, error: fetchError } = await supabase
        .from("item_catalog")
        .select("id, name, image_family, image_prompt_en, description, category")
        .eq("image_status", "pendente")
        .limit(30);

      if (fetchError) throw fetchError;
      pendingItems = batch || [];
    }

    if (!pendingItems || pendingItems.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum item pendente de imagem encontrado.", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Agrupa por família (máximo 10 famílias por execução)
    const familyMap = new Map<string, typeof pendingItems[0]>();
    for (const item of pendingItems) {
      const family = item.image_family || item.id;
      if (!familyMap.has(family) && familyMap.size < 10) {
        familyMap.set(family, item);
      }
    }

    const selectedFamilies = Array.from(familyMap.entries());
    const processedResults = [];

    // Marca as famílias selecionadas como 'gerando'
    for (const [family] of selectedFamilies) {
      await supabase
        .from("item_catalog")
        .update({ image_status: "gerando" })
        .eq("image_family", family);
    }

    // Processa cada família com FLUX
    for (let i = 0; i < selectedFamilies.length; i++) {
      const [family, sampleItem] = selectedFamilies[i];
      const promptEn = sampleItem.image_prompt_en || `${sampleItem.name}, ${sampleItem.category || "equipment"}`;
      const fullPrompt = `Fantasy RPG inventory icon of ${promptEn}, single object centered, full view, painterly game asset style, dark fantasy, warm soft lighting, plain dark stone background, no text, no border, square`;

      try {
        const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
        const resp = await fetch(cfUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: fullPrompt, steps: 4 }),
        });

        // Verificação de Cota / Limite
        if (resp.status === 429) {
          console.warn("⚠️ Cota diária da Cloudflare atingida (HTTP 429). Interrompendo execução.");
          for (let j = i; j < selectedFamilies.length; j++) {
            await supabase
              .from("item_catalog")
              .update({ image_status: "pendente" })
              .eq("image_family", selectedFamilies[j][0]);
          }
          return new Response(
            JSON.stringify({
              warning: "Cota diária da Cloudflare atingida (429). A fila continuará no próximo ciclo.",
              processed: processedResults.length,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const json = await resp.json();

        // Se mensagem indicar limite de neurons ou cota
        const responseText = JSON.stringify(json).toLowerCase();
        if (responseText.includes("limit") || responseText.includes("neuron") || responseText.includes("quota")) {
          console.warn("⚠️ Mensagem de cota detectada:", json);
          for (let j = i; j < selectedFamilies.length; j++) {
            await supabase
              .from("item_catalog")
              .update({ image_status: "pendente" })
              .eq("image_family", selectedFamilies[j][0]);
          }
          return new Response(
            JSON.stringify({
              warning: "Limite de cota/neurons detectado. Interrompendo fila até amanhã.",
              processed: processedResults.length,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!json.success && !json.result?.image) {
          throw new Error(`Erro Cloudflare: ${JSON.stringify(json.errors || json)}`);
        }

        const base64Data = json.result.image;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let b = 0; b < binaryString.length; b++) {
          bytes[b] = binaryString.charCodeAt(b);
        }

        // Salva em 'itens/{family}.jpg' no Storage do Supabase
        const storagePath = `${family}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("itens")
          .upload(storagePath, bytes, {
            contentType: "image/jpeg",
            upsert: true,
            cacheControl: "31536000",
          });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from("itens")
          .getPublicUrl(storagePath);
        const publicUrl = publicData.publicUrl;

        // Atualiza todos os itens da mesma família como 'pronta'
        await supabase
          .from("item_catalog")
          .update({
            image_url: publicUrl,
            image_status: "pronta",
            image_error: null,
          })
          .eq("image_family", family);

        processedResults.push({ family, url: publicUrl });
      } catch (err: any) {
        console.error(`Erro ao processar família ${family}:`, err.message);
        await supabase
          .from("item_catalog")
          .update({
            image_status: "erro",
            image_error: err.message,
          })
          .eq("image_family", family);
      }

      // Espera 2 segundos entre cada imagem para respeitar a taxa
      if (i < selectedFamilies.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: processedResults.length, families: processedResults }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
