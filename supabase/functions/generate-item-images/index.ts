// Supabase Edge Function: generate-item-images
// Processa lotes de itens sem imagem e gera com IA (Cloudflare Workers AI ou Pollinations)
// Pode ser acionada manualmente ou via pg_cron no Supabase.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const cfAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const provider = url.searchParams.get("provider") || (cfToken && cfAccountId ? "cloudflare" : "pollinations");

    // 1. Busca itens sem image_url
    const { data: items, error: fetchError } = await supabase
      .from("item_catalog")
      .select("id, name, description, category")
      .is("image_url", null)
      .limit(limit);

    if (fetchError) throw fetchError;
    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum item sem imagem pendente.", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const item of items) {
      const desc = item.description ? item.description.slice(0, 120) : item.category || "item lendario";
      const prompt = `Fantasy RPG inventory icon of ${item.name}, ${desc}, single object centered, painterly game asset style, dark fantasy, warm ember lighting, soft shadow, plain dark stone background, no text, no border, square 1:1`;

      let imageUrl = "";

      if (provider === "cloudflare" && cfAccountId && cfToken) {
    const model = "@cf/lykon/dreamshaper-8-lcm";
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, num_steps: 8 }),
      }
    );

        if (!cfRes.ok) {
          console.error(`Erro CF no item ${item.id}:`, await cfRes.text());
          continue;
        }

        const imgBytes = new Uint8Array(await cfRes.arrayBuffer());
        const filePath = `items/${item.id}_${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
          .from("items")
          .upload(filePath, imgBytes, { contentType: "image/png", upsert: true });

        if (uploadError) {
          console.error(`Erro storage ${item.id}:`, uploadError.message);
          continue;
        }

        const { data: publicData } = supabase.storage.from("items").getPublicUrl(filePath);
        imageUrl = publicData.publicUrl;
      } else {
        // Fallback Pollinations (zero-config)
        const seed = Math.floor(Math.random() * 1000000);
        imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed}`;
      }

      await supabase
        .from("item_catalog")
        .update({ image_url: imageUrl })
        .eq("id", item.id);

      results.push({ id: item.id, name: item.name, image_url: imageUrl });
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, items: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
