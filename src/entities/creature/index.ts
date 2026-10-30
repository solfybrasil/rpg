import {
  CORTES_PADRAO_POR_PESO,
  TEMPO_PADRAO_POR_PESO,
  calcularDificuldadeEspolio,
  enriquecerFeraComEspolios,
} from '../../services/espolioService';
import { gerarEfeitosAutomaticosBestiario } from '../condition';

export interface RawCreature {
  id: string;
  name?: string;
  nome?: string;
  image_url?: string;
  max_hp?: number;
  vida?: number;
  defense?: number;
  defesa?: number;
  attack_bonus?: number;
  behavior?: string;
  fuga_em_percent?: number | null;
  abilities?: Array<{
    name?: string;
    damage?: string;
    type?: string;
    effect?: string;
  }>;
  damage_dice?: string;
  loot?: Array<{
    item_id?: string;
    id?: string;
    qty?: number;
    name?: string;
    chance?: number;
  }>;
  threat?: number;
  tier?: string;
  category?: string;
  harvest_peso?: number | null;
  description?: string;
  species?: string;
  efeitos_auto?: unknown;
  [key: string]: unknown;
}

export function formatarCriaturaParaBatalha(
  creature: RawCreature | null | undefined,
): Record<string, unknown> | null {
  if (!creature) return null;

  let comp = (creature.behavior || '').toLowerCase();
  if (!['agressivo', 'cacador', 'vingativo', 'covarde', 'esperto'].includes(comp)) {
    if ((creature.threat ?? 0) >= 7 || creature.tier === 'Chefe' || creature.tier === 'Lendário') {
      comp = 'esperto';
    } else if (creature.category === 'Animal' || creature.category === 'Fera') {
      comp = 'cacador';
    } else if (creature.category === 'Criatura da Peste' || creature.category === 'Aberração') {
      comp = 'vingativo';
    } else if ((creature.threat ?? 0) <= 2 || creature.tier === 'Lacaio') {
      comp = 'agressivo';
    } else {
      comp = 'agressivo';
    }
  }

  const fuga = typeof creature.fuga_em_percent === 'number' ? creature.fuga_em_percent : null;

  let ataques: Array<{
    nome: string;
    dano: string;
    tipo: string;
    peso_chance: number;
    recarga: string | null;
    efeito: { condicao: string; peso_teste: number } | null;
  }> = [];

  if (Array.isArray(creature.abilities) && creature.abilities.length > 0) {
    ataques = creature.abilities.map((ab, idx) => ({
      nome: ab.name || `Habilidade ${idx + 1}`,
      dano: ab.damage || creature.damage_dice || '1d8',
      tipo: ab.type || 'fisico',
      peso_chance: idx === 0 ? 65 : 35,
      recarga: idx > 0 ? '5-6' : null,
      efeito: ab.effect ? { condicao: ab.effect, peso_teste: 10 } : null,
    }));
  }

  if (ataques.length === 0) {
    ataques = [
      {
        nome: 'Golpe Selvagem',
        dano: creature.damage_dice || '1d8',
        tipo: 'fisico',
        peso_chance: 70,
        recarga: null,
        efeito: null,
      },
      {
        nome: 'Investida Feroz',
        dano: '1d10',
        tipo: 'fisico',
        peso_chance: 30,
        recarga: '5-6',
        efeito: { condicao: 'derrubado', peso_teste: 10 },
      },
    ];
  }

  let drops: Array<{
    item_id: string;
    qtd: number;
    nome: string;
    chance: number;
  }> = [];

  if (Array.isArray(creature.loot) && creature.loot.length > 0) {
    drops = creature.loot.map((l) => ({
      item_id: l.item_id || l.id || 'despojo',
      qtd: Number(l.qty || 1),
      nome: l.name || 'Despojo de Caça',
      chance: Number(l.chance ?? 100),
    }));
  } else {
    drops = [
      { item_id: 'couro_bruto', qtd: 1, nome: `Couro de ${creature.name || 'Fera'}`, chance: 80 },
      { item_id: 'carne_caca', qtd: 2, nome: 'Carne de Caça', chance: 90 },
    ];
  }

  const criaturaFormatada = {
    id: creature.id,
    nome: creature.name || creature.nome,
    imagem:
      creature.image_url ||
      'https://images.unsplash.com/photo-1564865878688-9a244444042a?auto=format&fit=crop&w=600&q=80',
    vida: Number(creature.max_hp || creature.vida || 14),
    defesa: Number(creature.defense || creature.defesa || 9),
    ataque_bonus: Number(creature.attack_bonus || 1),
    comportamento: comp,
    fuga_em_percent: fuga,
    ataques,
    drops,
    threat: creature.threat || 1,
    tier: creature.tier || 'Soldado',
    category: creature.category || 'Fera',
    loot: creature.loot || [],
    peso_preparo: creature.harvest_peso || null,
    harvest_peso: creature.harvest_peso || null,
    descricao: creature.description || '',
    species: creature.species || '',
    efeitos_auto: creature.efeitos_auto,
  };

  return gerarEfeitosAutomaticosBestiario(criaturaFormatada);
}

export interface CombatParticipant {
  id: string;
  nome?: string;
  tipo: 'heroi' | 'fera';
  iniciativa: number;
  vida_atual: number;
  vida_max: number;
  defesa?: number;
  defendendo?: boolean;
  fugiu?: boolean;
  dano_recebido_de?: Record<string, number>;
  [key: string]: unknown;
}

export function sortTurnOrder<T extends CombatParticipant>(participantes: T[]): T[] {
  return [...participantes].sort((a, b) => {
    if (b.iniciativa !== a.iniciativa) return b.iniciativa - a.iniciativa;
    if (a.tipo === 'heroi' && b.tipo !== 'heroi') return -1;
    if (b.tipo === 'heroi' && a.tipo !== 'heroi') return 1;
    return 0;
  });
}

export function advanceTurnOrder(
  ordem: string[],
  participantesMap: Record<string, CombatParticipant>,
  currentIndex: number,
  currentRound: number,
): { novoIndex: number; novaRodada: number; ativoId: string } {
  let novoIndex = currentIndex + 1;
  let novaRodada = currentRound;
  let tentativas = 0;

  while (tentativas < ordem.length * 2) {
    if (novoIndex >= ordem.length) {
      novoIndex = 0;
      novaRodada += 1;
    }
    const proxId = ordem[novoIndex];
    const proxPart = participantesMap[proxId];
    if (proxPart && !proxPart.fugiu) {
      if (proxPart.tipo === 'heroi') break;
      if (proxPart.tipo === 'fera' && proxPart.vida_atual > 0) break;
    }
    novoIndex++;
    tentativas++;
  }

  return { novoIndex, novaRodada, ativoId: ordem[novoIndex] };
}

export function selectBeastTarget<T extends CombatParticipant>(
  fera: CombatParticipant,
  herois: T[],
  comportamento?: string,
): T | null {
  const conscientes = herois.filter((h) => !h.fugiu && h.vida_atual > 0);
  if (conscientes.length === 0) return null;

  const comp = (comportamento || 'agressivo').toLowerCase();
  if (comp === 'agressivo') {
    return [...conscientes].sort(
      (a, b) =>
        (a.defesa ?? 0) + (a.defendendo ? 2 : 0) - ((b.defesa ?? 0) + (b.defendendo ? 2 : 0)),
    )[0];
  }
  if (comp === 'cacador') {
    return [...conscientes].sort(
      (a, b) => a.vida_atual / (a.vida_max || 1) - b.vida_atual / (b.vida_max || 1),
    )[0];
  }
  if (comp === 'vingativo') {
    const hist = fera.dano_recebido_de || {};
    let maxDano = -1;
    let vilao: T | null = null;
    for (const h of conscientes) {
      const d = Number(hist[h.id] || 0);
      if (d > maxDano) {
        maxDano = d;
        vilao = h;
      }
    }
    return vilao && maxDano > 0 ? vilao : conscientes[0];
  }
  if (comp === 'esperto') {
    return [...conscientes].sort((a, b) => b.vida_atual - a.vida_atual)[0];
  }
  return conscientes[0];
}

export {
  enriquecerFeraComEspolios,
  calcularDificuldadeEspolio,
  TEMPO_PADRAO_POR_PESO,
  CORTES_PADRAO_POR_PESO,
};
