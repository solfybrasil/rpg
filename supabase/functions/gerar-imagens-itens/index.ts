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

interface CloudflareAccount {
  accountId: string;
  apiToken: string;
}

function getCloudflareAccounts(): CloudflareAccount[] {
  const accounts: CloudflareAccount[] = [];
  const seen = new Set<string>();

  const add = (id?: string | null, token?: string | null) => {
    const cleanId = (id || "").trim();
    const cleanToken = (token || "").trim();
    if (cleanId && cleanToken && !seen.has(cleanId)) {
      seen.add(cleanId);
      accounts.push({ accountId: cleanId, apiToken: cleanToken });
    }
  };

  for (let i = 1; i <= 5; i++) {
    add(Deno.env.get(`CF_ACCOUNT_${i}_ID`), Deno.env.get(`CF_ACCOUNT_${i}_TOKEN`));
  }
  add(Deno.env.get("CF_ACCOUNT_ID"), Deno.env.get("CF_API_TOKEN"));

  return accounts;
}

async function translateToVisualEnglishPrompt(
  name: string,
  description: string,
  category: string,
  accounts: CloudflareAccount[]
): Promise<string> {
  for (let idx = 0; idx < accounts.length; idx++) {
    const { accountId, apiToken } = accounts[idx];
    try {
      const llamaUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`;
      const res = await fetch(llamaUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are an expert RPG visual asset artist. Convert the Portuguese item name, category, and description into a clear, precise English physical description for an icon generator.

RULES:
1. ALWAYS describe exactly ONE single standalone object (e.g. 'single battleaxe', 'single knight plate breastplate', 'one severed beast eyeball'). Never describe pairs, sets, characters, or multiples.
2. Category details:
   - Monster / Beast parts (olho, garra, presa, dente, pele, escama, chifre, coração, víscera, sangue): describe as an isolated grotesque trophy or organic part, wet texture, severed nerve/tissue, subtle dark blood traces if fitting (e.g. "isolated severed monster eyeball with wet texture and subtle dark blood traces", "sharp curved beast claw with dark dried blood on bone root").
   - Armor & Apparel (armadura, peitoral, cota de malha, elmo, botas, manoplas, manto): describe the standalone wearable armor piece (e.g. "ornate steel knight breastplate cuirass with engraved trim", "horned iron helmet with closed visor", "studded hardened leather tunic armor").
   - Axes & Melee weapons (machado, machadinha, espada, adaga, martelo, maça, lança): describe the head/blade shape, metal finish, wood haft, wrapped grip (e.g. "single heavy iron battleaxe with curved crescent blade and oak haft").
   - Alchemy / Potions / Acids / Poisons: describe the ornate glass vial/flask, cork stopper, bubbling or glowing liquid.
   - Magic & Relics (cajado, varinha, anel, tomo, amuleto): describe the carved staff with crystal, leatherbound spellbook, glowing gemstone ring.
3. Max 18 words. Physical visual description only (materials, colors, shapes). No quotes, no intro, no stats.`,
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
      console.warn(`[AI Translator] Falha no Llama 3.1 na conta ${idx + 1}:`, err.message);
    }
  }

    let cleanName = (name || "").toLowerCase();
  cleanName = cleanName.replace(/\b(olho de [^,]+|olho)\b/gi, "severed monster eyeball with wet texture and subtle dark blood traces");
  cleanName = cleanName.replace(/\b(garra de [^,]+|garra)\b/gi, "sharp curved beast claw with faint blood traces on bone root");
  cleanName = cleanName.replace(/\b(presa|dente)\b/gi, "jagged monster fang tooth with dark blood traces");
  cleanName = cleanName.replace(/\b(coracao|coração)\b/gi, "grotesque severed monster heart with visceral texture");
  cleanName = cleanName.replace(/\b(pele|escama)\b/gi, "reptilian dragon beast scale plate");
  cleanName = cleanName.replace(/\b(machado de batalha|machado de guerra)\b/gi, "heavy iron battleaxe with curved crescent blade and wood haft");
  cleanName = cleanName.replace(/\b(machadinha)\b/gi, "forged hand hatchet axe with leather wrapped grip");
  cleanName = cleanName.replace(/\b(machado)\b/gi, "iron battleaxe with sturdy wooden haft");
  cleanName = cleanName.replace(/\b(armadura de placas|peitoral)\b/gi, "ornate knight steel plate breastplate cuirass");
  cleanName = cleanName.replace(/\b(armadura de couro)\b/gi, "studded hardened leather armor cuirass");
  cleanName = cleanName.replace(/\b(cota de malha)\b/gi, "chainmail hauberk armor shirt");
  cleanName = cleanName.replace(/\b(armadura)\b/gi, "steel knight breastplate armor");
  cleanName = cleanName.replace(/\b(elmo)\b/gi, "steel knight helmet with closed visor");
  cleanName = cleanName.replace(/\b(alaude|alaúde)\b/gi, "wooden lute musical instrument with strings");
  cleanName = cleanName.replace(/\b(adaga)\b/gi, "sharp steel dagger with wrapped leather hilt");
  cleanName = cleanName.replace(/\b(espada curta)\b/gi, "iron shortsword with crossguard");
  cleanName = cleanName.replace(/\b(espada longa|espada)\b/gi, "longsword with ornate guard");
  cleanName = cleanName.replace(/\b(pocao|poção)\b/gi, "glass potion bottle with cork and glowing liquid");
  cleanName = cleanName.replace(/\b(acido|ácido)\b/gi, "bubbling acidic green liquid in glass potion vial");
  cleanName = cleanName.replace(/\b(arco)\b/gi, "recurve hunting bow with bowstring");
  cleanName = cleanName.replace(/\b(escudo)\b/gi, "iron rimmed heraldic shield");
  cleanName = cleanName.replace(/\b(cajado)\b/gi, "carved magic wooden staff with glowing crystal");
  cleanName = cleanName.replace(/\b(anel)\b/gi, "gold ring set with a faceted gemstone");
  cleanName = cleanName.replace(/\b(martelo)\b/gi, "heavy iron warhammer with spiked head");
  cleanName = cleanName.replace(/\b(tomo|livro)\b/gi, "ancient leatherbound spellbook with brass clasp");
  cleanName = cleanName.replace(/\b(cobre temperado)\b/gi, "tempered copper blade");

  return cleanName;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const accounts = getCloudflareAccounts();

    if (accounts.length === 0) {
      throw new Error("Nenhuma credencial da Cloudflare configurada nas variáveis da Edge Function.");
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
        accounts
      );

      const fullPrompt = `Fantasy RPG inventory item icon of exactly one single standalone ${visualPrompt}, solitary solo object centered, full view, isolated single item, detailed painted game asset, soft studio lighting, solid flat neutral gray background, plain uniform medium gray backdrop, no pattern, no texture, no multiple objects, no pairs, no second item, no dual weapons, no duplicates, no text, no border, square`;

      let base64Data: string | null = null;
      let lastError = "";

      for (let a = 0; a < accounts.length; a++) {
        const acc = accounts[a];
        try {
          const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${acc.accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
          const resp = await fetch(cfUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${acc.apiToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ prompt: fullPrompt, steps: 4 }),
          });

          if (resp.ok) {
            const json = await resp.json();
            if (json.success && json.result?.image) {
              base64Data = json.result.image;
              break;
            }
          }

          const errText = await resp.text();
          lastError = errText;
        } catch (e: any) {
          lastError = e.message;
        }
      }

      if (!base64Data) {
        throw new Error(`Todas as contas Cloudflare falharam ou atingiram a cota. Último erro: ${lastError}`);
      }
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
          accounts
        ));

      const fullPrompt = `Fantasy RPG inventory item icon of exactly one single standalone ${visualPrompt}, solitary solo object centered, full view, isolated single item, detailed painted game asset, soft studio lighting, solid flat neutral gray background, plain uniform medium gray backdrop, no pattern, no texture, no multiple objects, no pairs, no second item, no dual weapons, no duplicates, no text, no border, square`;

      let base64Data: string | null = null;

      for (let a = 0; a < accounts.length; a++) {
        const acc = accounts[a];
        try {
          const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${acc.accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
          const resp = await fetch(cfUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${acc.apiToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ prompt: fullPrompt, steps: 4 }),
          });

          if (resp.status === 429) {
            console.warn(`Conta ${a + 1} (${acc.accountId.slice(0, 6)}...) atingiu 429. Tentando próxima...`);
            continue;
          }

          const json = await resp.json();
          const responseText = JSON.stringify(json).toLowerCase();
          if (responseText.includes("limit") || responseText.includes("neuron") || responseText.includes("quota")) {
            console.warn(`Conta ${a + 1} (${acc.accountId.slice(0, 6)}...) limite de neurônios atingido. Tentando próxima...`);
            continue;
          }

          if (json.success && json.result?.image) {
            base64Data = json.result.image;
            break;
          }
        } catch (e: any) {
          console.warn(`Conta ${a + 1} erro:`, e.message);
        }
      }

      if (!base64Data) {
        console.warn("⚠️ Todas as contas Cloudflare atingiram o limite diário. Interrompendo fila até amanhã.");
        for (let j = i; j < selectedFamilies.length; j++) {
          await supabase
            .from("item_catalog")
            .update({ image_status: "pendente" })
            .eq("image_family", selectedFamilies[j][0]);
        }
        return new Response(
          JSON.stringify({
            warning: "Cota de todas as contas Cloudflare atingida. A fila continuará no próximo ciclo.",
            processed: processedResults.length,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
