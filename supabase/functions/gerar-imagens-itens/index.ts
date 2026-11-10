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

async function translateToVisualEnglishPrompt(
  name: string,
  description: string,
  category: string,
  cfAccountId: string,
  cfApiToken: string
): Promise<string> {
  try {
    const llamaUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`;
    const res = await fetch(llamaUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfApiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `You are an expert RPG visual asset artist. Convert the Portuguese item name and description into a clear, precise English physical description for an icon generator.
Identify the exact physical object (e.g. "Alaúde" -> "wooden lute musical instrument", "Adaga" -> "dagger", "Ácido" -> "acid potion vial", "Espada" -> "sword", "Poção" -> "potion bottle", "Armadura" -> "armor").
CRITICAL RULE: Always describe exactly ONE single solitary object. Never describe pairs, dual weapons, sets, or multiples (e.g. "single dagger", "one potion vial", "single sword").
Describe its material, color, and distinctive physical visual shape.
Ignore RPG game stats, dice, damage numbers, mechanics, and lore. Focus ONLY on what the object physically looks like.
Reply with ONLY the English visual description (max 15 words). No quotes, no explanations.
Examples:
- "Alaúde do Bardo" -> "single wooden lute musical instrument, polished dark pear-shaped body with strings"
- "Adaga de cobre temperado" -> "single tempered copper dagger, sharp reddish copper blade with dark hilt"
- "Ácido de pedra" -> "one bubbling green acid potion vial in ornate glass bottle"`,
          },
          {
            role: "user",
            content: `Nome: "${name}"\nCategoria: "${category || ""}"\nDescrição: "${(description || "").slice(0, 150)}"`,
          },
        ],
        temperature: 0.1,
        max_tokens: 45,
      }),
    });

    if (res.ok) {
      const data: any = await res.json();
      const output = data.result?.response?.trim().replace(/^["']|["']$/g, "");
      if (output && output.length > 3) {
        return output;
      }
    }
  } catch (err: any) {
    console.warn("[AI Translator] Falha no Llama 3.1:", err.message);
  }

  let cleanName = (name || "").toLowerCase();
  cleanName = cleanName.replace(/\b(alaude|alaúde)\b/gi, "wooden lute musical instrument");
  cleanName = cleanName.replace(/\b(adaga)\b/gi, "dagger");
  cleanName = cleanName.replace(/\b(pocao|poção)\b/gi, "potion bottle");
  cleanName = cleanName.replace(/\b(espada)\b/gi, "sword");
  cleanName = cleanName.replace(/\b(escudo)\b/gi, "shield");
  cleanName = cleanName.replace(/\b(cajado)\b/gi, "magic staff");
  return cleanName;
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
      const visualPrompt = await translateToVisualEnglishPrompt(
        reqBody.name,
        reqBody.description || "",
        reqBody.category || "",
        cfAccountId,
        cfApiToken
      );

      const fullPrompt = `Fantasy RPG inventory item icon of exactly one single standalone ${visualPrompt}, solitary solo object centered, full view, isolated single item, detailed painted game asset, soft studio lighting, solid flat neutral gray background, plain uniform medium gray backdrop, no pattern, no texture, no multiple objects, no pairs, no second item, no dual weapons, no duplicates, no text, no border, square`;

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
        await supabase.storage.from("items").upload(`flux/${storagePath}`, bytes, {
          contentType: "image/jpeg",
          upsert: true,
        });
      }

      const { data: publicData } = supabase.storage.from("itens").getPublicUrl(storagePath);
      const publicUrl = publicData.publicUrl;

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
          promptEn: visualPrompt,
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

    const familyMap = new Map<string, typeof pendingItems[0]>();
    for (const item of pendingItems) {
      const family = item.image_family || item.id;
      if (!familyMap.has(family) && familyMap.size < 10) {
        familyMap.set(family, item);
      }
    }

    const selectedFamilies = Array.from(familyMap.entries());
    const processedResults = [];

    for (const [family] of selectedFamilies) {
      await supabase
        .from("item_catalog")
        .update({ image_status: "gerando" })
        .eq("image_family", family);
    }

    for (let i = 0; i < selectedFamilies.length; i++) {
      const [family, sampleItem] = selectedFamilies[i];
      const visualPrompt =
        sampleItem.image_prompt_en ||
        (await translateToVisualEnglishPrompt(
          sampleItem.name,
          sampleItem.description || "",
          sampleItem.category || "",
          cfAccountId,
          cfApiToken
        ));

      const fullPrompt = `Fantasy RPG inventory item icon of exactly one single standalone ${visualPrompt}, solitary solo object centered, full view, isolated single item, detailed painted game asset, soft studio lighting, solid flat neutral gray background, plain uniform medium gray backdrop, no pattern, no texture, no multiple objects, no pairs, no second item, no dual weapons, no duplicates, no text, no border, square`;

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

        await supabase
          .from("item_catalog")
          .update({
            image_url: publicUrl,
            image_status: "pronta",
            image_prompt_en: visualPrompt,
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
