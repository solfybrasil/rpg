import { toast } from 'sonner';
import { type TablesUpdate, subscribeTable, supabase } from '../../../shared/supabase';

export interface GrimorioSpell {
  id: number | string;
  nome: string;
  circulo: number;
  escola?: string;
  fonte?: string;
  custo_foco?: number;
  custo_inspiracao?: number;
  nivel_min?: number;
  peso?: number;
  alcance?: string;
  area?: string;
  duracao?: string;
  tipo_acao?: string;
  descricao?: string;
  resumo?: string;
  efeito_sucesso?: string;
  efeito_brilhante?: string;
  efeito_falha?: string;
  ampliar?: string;
  raridade?: string;
  em_combate?: boolean;
  icone?: string;
  risco?: {
    peste?: boolean;
    texto?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export interface GrimorioMotorData {
  magias: GrimorioSpell[];
  condicoes: Record<string, unknown>;
}

let cachedGrimorio: GrimorioMotorData | null = null;
let grimorioPromise: Promise<GrimorioMotorData> | null = null;

export function normalizeSpell(m: Record<string, any>): GrimorioSpell {
  const circulo = Number(m.circulo ?? 0);
  const custoFoco = Number(m.custo?.foco ?? m.custo_foco ?? circulo);
  const nivelMin = Number(m.nivel_minimo ?? m.nivel_min ?? 1);
  const custoInsp = Number(m.custo_inspiracao ?? 1);

  let duracaoStr = 'Instantânea';
  if (typeof m.duracao === 'string') {
    duracaoStr = m.duracao;
  } else if (m.duracao && typeof m.duracao === 'object') {
    const val = m.duracao.valor ?? '';
    const unit = m.duracao.unidade ?? m.duracao.tipo ?? '';
    duracaoStr = `${val} ${unit}`.trim() || 'Instantânea';
  }

  let alvoStr = '1 Alvo';
  if (m.area && typeof m.area === 'string') {
    alvoStr = m.area;
  } else if (m.alvo && typeof m.alvo === 'object') {
    if (m.alvo.tipo === 'eu') alvoStr = 'Pessoal (Você mesmo)';
    else if (m.alvo.tipo === 'eu_ou_aliado') alvoStr = 'Você ou 1 aliado';
    else if (m.alvo.tipo === 'todos_aliados') alvoStr = 'Todos os aliados';
    else alvoStr = String(m.alvo.tipo || '1 Alvo');
  }

  let ampliarStr = '';
  if (typeof m.ampliar === 'string') {
    ampliarStr = m.ampliar;
  } else if (Array.isArray(m.ampliar)) {
    ampliarStr = m.ampliar
      .map(
        (a: any) =>
          a.descricao || a.texto || `+${a.foco || 1} Foco: ${a.efeito || ''}`,
      )
      .join('; ');
  }

  return {
    ...m,
    id: m.id,
    nome: m.nome,
    circulo,
    escola: m.escola || 'Geral',
    fonte: m.fonte || 'Arcana',
    custo_foco: custoFoco,
    custo_inspiracao: custoInsp,
    nivel_min: nivelMin,
    duracao: duracaoStr,
    area: alvoStr,
    alcance: m.alcance || 'Toque',
    ampliar: ampliarStr,
    resumo: m.resumo || m.descricao || '',
    descricao: m.descricao || m.resumo || '',
    raridade: m.raridade || 'Comum',
    em_combate: m.em_combate ?? true,
    risco: m.risco || null,
  };
}

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
      console.warn(`[Grimorio] Aviso ao carregar catálogo de magias: ${msg}`);
      return { magias: [], condicoes: {} };
    } finally {
      grimorioPromise = null;
    }
  })();

  return grimorioPromise;
}

export async function fetchMagiasCatalogo(): Promise<GrimorioSpell[]> {
  const grimorio = await getGrimorioMotor();
  return (grimorio.magias || []).map(normalizeSpell);
}

export async function fetchMagiasAfinidade() {
  try {
    const { data, error } = await supabase
      .from('magias_afinidade')
      .select('caminho, fonte');

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('[Grimorio] Exceção ao buscar afinidades:', err);
  }
  return [];
}

export async function salvarMagiaEditada(
  magiaId: number | string,
  dadosAtualizados: TablesUpdate<'magias'>,
) {
  const { data, error } = await supabase
    .from('magias')
    .update(dadosAtualizados)
    .eq('id', Number(magiaId))
    .select();

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
  try {
    const grimorio = await getGrimorioMotor();
    const spells = (grimorio.magias || []).map(normalizeSpell);
    const spellsMap = new Map(spells.map((m) => [m.id, m]));

    const { data, error } = await supabase
      .from('heroi_magias')
      .select('character_id, magia_id, marcas, aprendida, liberada_pelo_mestre, gratis, usos')
      .eq('character_id', characterId);

    if (!error && data && data.length > 0) {
      return data.map((row) => ({
        ...row,
        magias: spellsMap.get(row.magia_id as number),
      }));
    }

    // Default spells when character has no records yet
    const defaults = spells
      .filter((m) => Number(m.circulo) === 0 || (Number(m.circulo) === 1 && m.em_combate))
      .slice(0, 6);

    return defaults.map((m) => ({
      character_id: characterId,
      magia_id: m.id,
      aprendida: true,
      marcas: 1,
      liberada_pelo_mestre: true,
      gratis: true,
      usos: 0,
      magias: m,
    }));
  } catch (err) {
    console.warn('[Grimorio] Exceção ao buscar magias do herói:', err);
    return [];
  }
}

export async function fetchAllHeroiMagias() {
  try {
    const grimorio = await getGrimorioMotor();
    const spells = (grimorio.magias || []).map(normalizeSpell);
    const spellsMap = new Map(spells.map((m) => [m.id, m]));

    const { data, error } = await supabase
      .from('heroi_magias')
      .select('character_id, magia_id, marcas, aprendida, liberada_pelo_mestre, gratis, usos');

    if (!error && data) {
      return data.map((row) => ({
        ...row,
        magias: spellsMap.get(row.magia_id as number),
      }));
    }
  } catch (err) {
    console.warn('[Grimorio] Erro ao carregar todas as magias:', err);
  }
  return [];
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
