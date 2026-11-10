/**
 * Script: Agrupamento de Itens por Família
 *
 * Agrupa itens do catálogo que são variações do mesmo item base:
 * - Numerais romanos: "Poção I", "Poção II", "Poção III" -> "Poção"
 * - Graus / Bônus: "Espada Longa +1", "Espada Longa +2" -> "Espada Longa"
 * - Sufixos de qualidade: "Poção de Vida Menor/Maior" -> "Poção de Vida"
 * - Numeração no final: "Tomo 1", "Tomo 2" -> "Tomo"
 * - Anotações entre parênteses ou colchetes: "Adaga (Comum)" -> "Adaga"
 *
 * Uso:
 *   npx tsx scripts/group-item-families.ts
 *   npx tsx scripts/group-item-families.ts --apply
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ermkaldfvvjgnhgnvcqo.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Hnsb7fiVx3sKa7eFmxiD8w_aB0eoaGr';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export function normalizeFamily(name: string): { familyName: string; familySlug: string } {
  let cleaned = name.trim();

  // 1. Remove parênteses e colchetes e seu conteúdo
  cleaned = cleaned.replace(/\s*[\(\[].*?[\)\]]/g, '');

  // 2. Remove bônus numéricos do tipo +1, +2, +3, -1
  cleaned = cleaned.replace(/\s*[\+\-]\d+/g, '');

  // 3. Remove numerais romanos no final ou isolados
  cleaned = cleaned.replace(/\s+\b(X|IX|VIII|VII|VI|V|IV|III|II|I)\b/gi, '');

  // 4. Remove sufixos de escala/qualidade comuns
  cleaned = cleaned.replace(
    /\s*[-–—]?\s*\b(menor|maior|superior|supremo|perfeito|perfeita|básico|basico|avançado|avancado|pequeno|pequena|médio|medio|média|media|grande|gigante|antigo|antiga|velho|velha|desgastado|desgastada|bruto|bruta|refinado|refinada)\b$/i,
    ''
  );

  // 5. Remove números soltos no final
  cleaned = cleaned.replace(/\s+\d+$/g, '');

  cleaned = cleaned.trim();
  if (!cleaned) cleaned = name.trim();

  // Slug identificador estável para storage e agrupamento
  const familySlug = cleaned
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return { familyName: cleaned, familySlug };
}

async function fetchAllItems() {
  const pageSize = 1000;
  let from = 0;
  let allItems: Array<{ id: string; name: string; category?: string; subcategory?: string }> = [];

  while (true) {
    const { data, error } = await supabase
      .from('item_catalog')
      .select('id, name, category, subcategory')
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allItems = allItems.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allItems;
}

async function main() {
  const apply = process.argv.includes('--apply');

  console.log('🔍 Buscando todos os itens do item_catalog no Supabase...');
  const items = await fetchAllItems();
  console.log(`📦 Total de itens encontrados: ${items.length}\n`);

  const familyMap = new Map<string, { familyName: string; items: typeof items }>();

  for (const item of items) {
    const { familyName, familySlug } = normalizeFamily(item.name);
    const existing = familyMap.get(familySlug);
    if (existing) {
      existing.items.push(item);
    } else {
      familyMap.set(familySlug, { familyName, items: [item] });
    }
  }

  console.log('====================================================');
  console.log(`📊 RESULTADO DO AGRUPAMENTO:`);
  console.log(`   Total de Itens: ${items.length}`);
  console.log(`   Total de Famílias Únicas: ${familyMap.size}`);
  console.log(`   Economia de Imagens Geradas: ${items.length - familyMap.size} imagens a menos`);
  console.log('====================================================\n');

  // Mostrar exemplos de famílias com múltiplos itens
  console.log('✨ Exemplos de famílias agrupadas:');
  let multiCount = 0;
  for (const [slug, data] of familyMap.entries()) {
    if (data.items.length > 1 && multiCount < 10) {
      console.log(`\n• Família: "${data.familyName}" (slug: ${slug}) - ${data.items.length} itens:`);
      data.items.slice(0, 5).forEach((it) => console.log(`   - ${it.name}`));
      if (data.items.length > 5) console.log(`   ... e mais ${data.items.length - 5} itens`);
      multiCount++;
    }
  }

  if (apply) {
    console.log('\n💾 Aplicando image_family e image_status no banco de dados...');
    let updated = 0;
    const batchSize = 50;

    for (let i = 0; i < items.length; i += batchSize) {
      const slice = items.slice(i, i + batchSize);
      await Promise.all(
        slice.map(async (item) => {
          const { familySlug } = normalizeFamily(item.name);
          const { error } = await supabase
            .from('item_catalog')
            .update({
              image_family: familySlug,
              image_status: 'pendente',
            })
            .eq('id', item.id);

          if (!error) updated++;
        })
      );
      process.stdout.write(`\r   Atualizados: ${updated}/${items.length}`);
    }
    console.log(`\n✅ Sucesso! ${updated} itens atualizados com suas respectivas famílias.\n`);
  } else {
    console.log('\n💡 Dica: Para gravar as famílias no banco, execute:');
    console.log('   npx tsx scripts/group-item-families.ts --apply\n');
  }
}

main().catch(console.error);
