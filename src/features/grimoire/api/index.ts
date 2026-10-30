import { toast } from 'sonner';
import { type TablesUpdate, subscribeTable, supabase } from '../../../shared/supabase';

export interface GrimorioSpell {
  id: number | string;
  nome: string;
  circulo: number;
  escola?: string;
  custo_foco?: number;
  peso?: number;
  em_combate?: boolean;
  blocos?: unknown[];
  [key: string]: unknown;
}

export interface GrimorioMotorData {
  magias: GrimorioSpell[];
  condicoes: Record<string, unknown>;
}

let cachedGrimorio: GrimorioMotorData | null = null;
let grimorioPromise: Promise<GrimorioMotorData> | null = null;

/**
 * Carrega /data/grimorio_motor.json sob demanda (fora do bundle JS).
 */
export async function getGrimorioMotor(): Promise<GrimorioMotorData> {
  if (cachedGrimorio) return cachedGrimorio;
  if (grimorioPromise) return grimorioPromise;

  grimorioPromise = (async () => {
    try {
      const res = await fetch('/data/grimorio_motor.json');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ao carregar /data/grimorio_motor.json`);
      }
      const parsed = (await res.json()) as GrimorioMotorData;
      cachedGrimorio = parsed;
      return parsed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar grimório';
      toast.error(`Erro ao carregar catálogo de magias: ${msg}`, {
        action: {
          label: 'Tentar de novo',
          onClick: () => {
            cachedGrimorio = null;
            void getGrimorioMotor();
          },
        },
      });
      return { magias: [], condicoes: {} };
    } finally {
      grimorioPromise = null;
    }
  })();

  return grimorioPromise;
}

const MAGIAS_SELECT =
  'id, nome, escola, circulo, tipo_acao, alcance, area, duracao, custo_foco, peso, atributo_chave, pericia, descricao, efeito_sucesso, efeito_brilhante, efeito_falha, blocos, tags, em_combate, icone';

export async function fetchMagiasCatalogo(): Promise<GrimorioSpell[]> {
  const { data, error } = await supabase
    .from('magias')
    .select(MAGIAS_SELECT)
    .order('circulo', { ascending: true })
    .order('nome', { ascending: true });

  if (!error && data && data.length > 0) {
    return data as unknown as GrimorioSpell[];
  }
  const grimorio = await getGrimorioMotor();
  return grimorio.magias || [];
}

export async function fetchMagiasAfinidade() {
  const { data, error } = await supabase
    .from('magias_afinidade')
    .select('character_id, escola, nivel_afinidade, magias_conjuradas');
  if (error) {
    toast.error(`Erro ao buscar afinidades mágicas: ${error.message}`, {
      action: { label: 'Tentar de novo', onClick: () => void fetchMagiasAfinidade() },
    });
    throw error;
  }
  return data || [];
}

export async function salvarMagiaEditada(
  magiaId: number | string,
  dadosAtualizados: TablesUpdate<'magias'>,
) {
  const { data, error } = await supabase
    .from('magias')
    .update(dadosAtualizados)
    .eq('id', Number(magiaId))
    .select(MAGIAS_SELECT);

  if (error) {
    toast.error(`Erro ao salvar magia: ${error.message}`, {
      action: {
        label: 'Tentar de novo',
        onClick: () => void salvarMagiaEditada(magiaId, dadosAtualizados),
      },
    });
    throw error;
  }
  return { success: true, data };
}

export async function fetchHeroiMagias(characterId: string) {
  const { data, error } = await supabase
    .from('personagem_magias')
    .select(`character_id, magia_id, aprendida, equipada, vezes_usada, magias(${MAGIAS_SELECT})`)
    .eq('character_id', characterId);

  if (!error && data && data.length > 0) return data;

  const { data: hmData, error: hmErr } = await supabase
    .from('heroi_magias')
    .select(
      `character_id, magia_id, estado, custo_xp_pago, desbloqueada_em, magias(${MAGIAS_SELECT})`,
    )
    .eq('character_id', characterId);

  if (!hmErr && hmData && hmData.length > 0) return hmData;

  const grimorio = await getGrimorioMotor();
  const defaults = (grimorio.magias || [])
    .filter((m) => Number(m.circulo) <= 1 && m.em_combate)
    .slice(0, 8);
  return defaults.map((m) => ({
    character_id: characterId,
    magia_id: m.id,
    aprendida: true,
    magias: m,
  }));
}

export async function fetchAllHeroiMagias() {
  const { data, error } = await supabase
    .from('heroi_magias')
    .select(
      `character_id, magia_id, estado, custo_xp_pago, desbloqueada_em, magias(${MAGIAS_SELECT})`,
    );
  if (error) {
    toast.error(`Erro ao carregar magias dos heróis: ${error.message}`, {
      action: { label: 'Tentar de novo', onClick: () => void fetchAllHeroiMagias() },
    });
    throw error;
  }
  return data || [];
}

export async function magiaInvestirRPC(characterId: string, magiaId: string) {
  const { data, error } = await supabase.rpc('magia_investir', {
    p_character_id: characterId,
    p_magia_id: magiaId,
  });
  if (error) {
    toast.error(`Erro ao aprender magia: ${error.message}`);
    throw error;
  }
  return data;
}

export async function magiaMestreLiberarRPC(characterId: string, magiaId: string) {
  const { data, error } = await supabase.rpc('magia_mestre_liberar', {
    p_character_id: characterId,
    p_magia_id: magiaId,
  });
  if (error) {
    toast.error(`Erro ao liberar magia: ${error.message}`);
    throw error;
  }
  return data;
}

export async function magiaMestreEnsinarRPC(characterId: string, magiaId: string) {
  const { data, error } = await supabase.rpc('magia_mestre_ensinar', {
    p_character_id: characterId,
    p_magia_id: magiaId,
  });
  if (error) {
    toast.error(`Erro ao ensinar magia: ${error.message}`);
    throw error;
  }
  return data;
}

export async function magiaMestreDesfazerRPC(characterId: string, magiaId: string) {
  const { data, error } = await supabase.rpc('magia_mestre_desfazer', {
    p_character_id: characterId,
    p_magia_id: magiaId,
  });
  if (error) {
    toast.error(`Erro ao desfazer magia: ${error.message}`);
    throw error;
  }
  return data;
}

export async function magiaMestreRemover(characterId: string, magiaId: string | number) {
  const { error } = await supabase
    .from('heroi_magias')
    .delete()
    .eq('character_id', characterId)
    .eq('magia_id', Number(magiaId));
  if (error) {
    toast.error(`Erro ao remover magia: ${error.message}`);
    throw error;
  }
  return true;
}

export async function magiaConjurarRPC({
  characterId,
  magiaId,
  ampliar = 0,
  alvos = null,
  desesperada = null,
}: {
  characterId: string;
  magiaId: string;
  ampliar?: number;
  alvos?: string[] | null;
  desesperada?: string | null;
}) {
  const { data, error } = await supabase.rpc('magia_conjurar', {
    p_character_id: characterId,
    p_magia_id: magiaId,
    p_ampliar: ampliar,
    p_alvos: alvos || undefined,
    p_desesperada: desesperada || undefined,
  });
  if (error) {
    toast.error(`Erro ao conjurar magia: ${error.message}`);
    throw error;
  }
  return data;
}

export function subscribeToHeroiMagiasRealtime(
  callback?: (payload: unknown) => void,
  characterId: string | null = null,
) {
  return subscribeTable({
    table: 'heroi_magias',
    filter: characterId ? `character_id=eq.${characterId}` : undefined,
    onEvent: (payload) => {
      if (callback) callback(payload);
    },
  });
}
