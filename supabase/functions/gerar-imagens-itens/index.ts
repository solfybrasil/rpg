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

    //
});
