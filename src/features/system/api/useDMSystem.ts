import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../../../shared/supabase';
import { GRAPH } from '../../../data/oathTreeGraph';

export interface CompiledPlayerJson {
  id: string;
  nome: string;
  titulo?: string | null;
  raca: string;
  traco_racial?: string | null;
  caminho: string;
  nivel: number;
  xp: number;
  juramento: {
    tipo?: string | null;
    nome?: string | null;
    poder?: string | null;
    dadiva?: string | null;
    item_sagrado?: string | null;
  };
  status_vitais: {
    vida_atual: number;
    vida_maxima: number;
    porcentagem_vida: string;
    peste: number;
    estagio_peste: string;
    foco_atual: number;
    foco_maximo: number;
    inspiracao: number;
    defesa_total: number;
    defesa_base: number;
    caido: boolean;
    testes_contra_morte: { s: number; f: number };
  };
  condicao_fisica: {
    saciedade: number;
    horas_faminto: number;
    penalidade_vida_fome: number;
    exausto: boolean;
    horas_acordado: number;
  };
  atributos: {
    corpo: number;
    vontade: number;
    astucia: number;
    presenca: number;
  };
  moedas: {
    total_bronze: number;
    ouro: number;
    prata: number;
    bronze: number;
    formatado: string;
  };
  inventario: Array<{
    id: string;
    nome: string;
    tipo: string;
    quantidade: number;
    peso: number;
    slot_index: number;
    equipado: boolean;
    slot_equipado?: string | null;
    durabilidade_atual?: number | null;
    durabilidade_maxima?: number | null;
    propriedades?: Record<string, any>;
  }>;
  talentos_arvore: Array<{
    no_id: string;
    nome: string;
    descricao: string;
    regiao: string;
    tipo: string;
    marcas: number;
    gratis: boolean;
    liberado: boolean;
  }>;
  pericias: Array<{
    pericia: string;
    bonus?: number;
    grau: string;
  }>;
}

export function fromBronzeToCoins(totalBronze: number) {
  const b = Math.max(0, Number(totalBronze) || 0);
  const gold = Math.floor(b / 100);
  const silver = Math.floor((b % 100) / 10);
  const bronze = b % 10;
  return { gold, silver, bronze, formatado: `${gold} PO, ${silver} PP, ${bronze} PB` };
}

/**
 * Hook para buscar dados completos e compilar o JSON dos jogadores.
 */
export function useCompiledPlayersJson() {
  return useQuery({
    queryKey: ['dm-compiled-players-json'],
    queryFn: async () => {
      const [charsRes, invRes, treeRes] = await Promise.all([
        supabase.from('characters').select('*').order('name'),
        supabase.from('inventory_items').select('*').order('slot_index'),
        supabase.from('heroi_arvore').select('*'),
      ]);

      const characters = charsRes.data || [];
      const inventory = invRes.data || [];
      const treeRows = treeRes.data || [];

      // Mapeamento da árvore por herói
      const treeMap: Record<string, any[]> = {};
      treeRows.forEach((row) => {
        if (!treeMap[row.character_id]) treeMap[row.character_id] = [];
        const nodeDef = GRAPH.N[row.no_id] || {};
        treeMap[row.character_id].push({
          no_id: row.no_id,
          nome: nodeDef.nm || row.no_id,
          descricao: nodeDef.ds || '',
          regiao: nodeDef.reg || '',
          tipo: nodeDef.tipo || '',
          marcas: row.marcas || 1,
          gratis: Boolean(row.gratis),
          liberado: Boolean(row.liberado),
        });
      });

      const compiled: CompiledPlayerJson[] = characters.map((c: any) => {
        const charId = c.id;
        const health = Number(c.health ?? (6 + (c.attributes?.corpo || 0)));
        const maxHealth = Number(c.max_health || c.maxHealth || (6 + (c.attributes?.corpo || 0)));
        const plague = Number(c.plague ?? 0);
        const focus = Number(c.focus ?? c.max_focus ?? 3);
        const maxFocus = Number(c.max_focus || 3);
        const inspiration = Number(c.inspiration ?? 0);
        const defense = Number(c.defense ?? 8);
        const baseDefense = Number(c.base_defense ?? 8);

        const stageName =
          plague >= 8
            ? 'Transformação (Estágio 3)'
            : plague >= 4
            ? 'Corrupção (Estágio 2)'
            : 'Mancha (Estágio 1)';

        const coinsBronze = Number(c.coins_bronze ?? 0);
        const coins = fromBronzeToCoins(coinsBronze);

        const charInv = inventory.filter(
          (it: any) =>
            String(it.player_id || '').toLowerCase() === String(charId || '').toLowerCase(),
        );

        const formattedInv = charInv.map((it: any) => ({
          id: it.id,
          nome: it.name || it.item_name || 'Item Desconhecido',
          tipo: it.item_type || it.type || 'geral',
          quantidade: it.quantity ?? 1,
          peso: it.weight ?? 1,
          slot_index: it.slot_index ?? -1,
          equipado: it.equip_slot !== null && it.equip_slot !== undefined,
          slot_equipado: it.equip_slot || null,
          durabilidade_atual: it.durability ?? null,
          durabilidade_maxima: it.max_durability ?? null,
          propriedades: {
            dano: it.damage || null,
            armadura: it.armor || null,
            efeito: it.effect || null,
            descricao: it.description || null,
            raridade: it.rarity || 'comum',
            tags: it.tags || [],
          },
        }));

        const rawSkills = Array.isArray(c.skills) ? c.skills : [];
        const formattedSkills = rawSkills.map((s: any) => {
          if (typeof s === 'string') return { pericia: s, grau: 'Treinada' };
          return {
            pericia: s.name || s.pericia || s.skill || 'Desconhecida',
            bonus: s.bonus || s.value || s.mod || 0,
            grau: s.mastery || s.grau || (s.bonus >= 2 ? 'Especialista' : 'Treinada'),
          };
        });

        return {
          id: charId,
          nome: c.name || 'Sem Nome',
          titulo: c.title || null,
          raca: c.race || 'Humano',
          traco_racial: c.racial_trait || c.racialTrait || null,
          caminho: c.caminho || c.oathType || 'Jurado',
          nivel: Number(c.level || 1),
          xp: Number(c.xp || 0),
          juramento: {
            tipo: c.oath_type || c.oathType || null,
            nome: c.oath || null,
            poder: c.oath_power || c.oathPower || null,
            dadiva: c.gift || null,
            item_sagrado: c.oath_item || c.oathItem || null,
          },
          status_vitais: {
            vida_atual: health,
            vida_maxima: maxHealth,
            porcentagem_vida: `${Math.round((health / (maxHealth || 1)) * 100)}%`,
            peste: plague,
            estagio_peste: stageName,
            foco_atual: focus,
            foco_maximo: maxFocus,
            inspiracao: inspiration,
            defesa_total: defense,
            defesa_base: baseDefense,
            caido: health <= 0,
            testes_contra_morte: c.death_saves || { s: 0, f: 0 },
          },
          condicao_fisica: {
            saciedade: Number(c.saciedade ?? 8),
            horas_faminto: Number(c.horas_faminto ?? 0),
            penalidade_vida_fome: Number(c.vida_max_fome ?? 0),
            exausto: Boolean(c.exausto),
            horas_acordado: Number(c.horas_acordado ?? 0),
          },
          atributos: c.attributes || {
            corpo: 0,
            vontade: 0,
            astucia: 0,
            presenca: 0,
          },
          moedas: {
            total_bronze: coinsBronze,
            ouro: coins.gold,
            prata: coins.silver,
            bronze: coins.bronze,
            formatado: coins.formatado,
          },
          inventario: formattedInv,
          talentos_arvore: treeMap[charId] || [],
          pericias: formattedSkills,
        };
      });

      return compiled;
    },
    staleTime: 1000 * 15,
  });
}

/**
 * Mutação: Importar e aplicar dados de personagem via JSON.
 */
export function useImportPlayerJsonMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jsonInput: string | Record<string, any>) => {
      let data: any = jsonInput;
      if (typeof jsonInput === 'string') {
        data = JSON.parse(jsonInput);
      }

      if (!data || !data.id || !data.nome) {
        throw new Error('Formato JSON inválido: esperado objeto com "id" e "nome".');
      }

      const updates: Record<string, any> = {
        name: data.nome,
        level: data.nivel ?? 1,
        xp: data.xp ?? 0,
        health: data.status_vitais?.vida_atual,
        max_health: data.status_vitais?.vida_maxima,
        plague: data.status_vitais?.peste,
        focus: data.status_vitais?.foco_atual,
        max_focus: data.status_vitais?.foco_maximo,
        inspiration: data.status_vitais?.inspiracao,
        defense: data.status_vitais?.defesa_total,
        coins_bronze: data.moedas?.total_bronze,
        attributes: data.atributos,
        updated_at: new Date().toISOString(),
      };

      // Limpa campos undefined
      Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

      const { error } = await supabase
        .from('characters')
        .update(updates)
        .eq('id', data.id);

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Ficha de "${data.nome}" importada e sincronizada com sucesso!`);
      void queryClient.invalidateQueries({ queryKey: ['dm-compiled-players-json'] });
      void queryClient.invalidateQueries({ queryKey: ['characters'] });
    },
    onError: (err: any) => {
      toast.error(`Falha ao importar JSON: ${err.message}`);
    },
  });
}

/**
 * Mutação: Restaurar backup completo do jogo.
 */
export function useRestoreBackupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jsonInput: string | Record<string, any>) => {
      let data: any = jsonInput;
      if (typeof jsonInput === 'string') {
        data = JSON.parse(jsonInput);
      }
      if (!data || !data.data) {
        throw new Error('Arquivo de backup inválido: bloco "data" não encontrado.');
      }
      const payload = data.data;
      let restoredCount = 0;

      // 1. Game State
      if (payload.game_state && payload.game_state.id) {
        await supabase.from('game_state').upsert(payload.game_state);
        restoredCount++;
      }

      // 2. Characters
      if (Array.isArray(payload.characters) && payload.characters.length > 0) {
        for (const char of payload.characters) {
          await supabase.from('characters').upsert(char);
          restoredCount++;
        }
      }

      return { restoredCount, timestamp: data.timestamp };
    },
    onSuccess: (res) => {
      toast.success(`Backup restaurado! ${res.restoredCount} entidades sincronizadas.`);
      void queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error(`Falha na restauração do backup: ${err.message}`);
    },
  });
}

/**
 * Backup completo do banco de dados (tabelas principais do jogo).
 */
export async function generateFullGameStateBackup() {
  const [
    charsRes,
    gameStateRes,
    invRes,
    recipesRes,
    shopRes,
    heroiMagiasRes,
    heroiArvoreRes,
  ] = await Promise.all([
    supabase.from('characters').select('*'),
    supabase.from('game_state').select('*').limit(1).maybeSingle(),
    supabase.from('inventory_items').select('*'),
    supabase.from('crafting_grid_recipes').select('*'),
    supabase.from('shop_items').select('*'),
    supabase.from('heroi_magias').select('*'),
    supabase.from('heroi_arvore').select('*'),
  ]);

  return {
    version: '2.0',
    timestamp: new Date().toISOString(),
    system: 'Peste do Juramento',
    data: {
      game_state: gameStateRes.data || null,
      characters: charsRes.data || [],
      inventory_items: invRes.data || [],
      crafting_grid_recipes: recipesRes.data || [],
      shop_items: shopRes.data || [],
      heroi_magias: heroiMagiasRes.data || [],
      heroi_arvore: heroiArvoreRes.data || [],
    },
  };
}
