import { DEFAULT_BESTIARIO } from '../features/turn-combat';
import { supabase } from '../shared/supabase';
import { createInventoryItemInDB, efeitoAplicarRPC, giveCatalogItemViaRPC } from './dbService';

/**
 * Mapeamento canônico de tempo padrão do círculo por peso de preparo
 */
export const TEMPO_PADRAO_POR_PESO = {
  6: 1200,
  8: 900,
  10: 750,
  12: 600,
  14: 450,
};

/**
 * Mapeamento padrão de cortes por peso de preparo
 */
export const CORTES_PADRAO_POR_PESO = {
  6: 5,
  8: 6,
  10: 7,
  12: 8,
  14: 9,
};

/**
 * 1. Enriquecer qualquer fera (do catálogo, do bestiário ou do fallback) com as regras de Espólio
 */
export function enriquecerFeraComEspolios(fera = {}) {
  if (!fera) return null;

  // 1. Determinar Peso de Preparo (6 | 8 | 10 | 12 | 14)
  let peso = Number(fera.peso_preparo || fera.harvest_peso || 0);
  if (![6, 8, 10, 12, 14].includes(peso)) {
    const threat = Number(fera.threat || fera.ameaca || 2);
    if (threat <= 1) peso = 6;
    else if (threat <= 2) peso = 8;
    else if (threat <= 4) peso = 10;
    else if (threat <= 6) peso = 12;
    else peso = 14;
  }

  // 2. Tempo base do círculo em milissegundos
  const tempoCirculo = Number(fera.tempo_circulo_ms) || TEMPO_PADRAO_POR_PESO[peso] || 900;

  // 3. Número de cortes
  const numCortes = Number(fera.num_cortes) || CORTES_PADRAO_POR_PESO[peso] || 6;

  // 4. Detecção de veneno / peste
  const nomeStr = (fera.nome || fera.name || '').toLowerCase();
  const descStr = (fera.description || fera.descricao || '').toLowerCase();
  const attacksStr = JSON.stringify(fera.ataques || []).toLowerCase();
  const isVenenosa =
    nomeStr.includes('víbora') ||
    nomeStr.includes('vibora') ||
    nomeStr.includes('venen') ||
    nomeStr.includes('peste') ||
    descStr.includes('veneno') ||
    attacksStr.includes('envenenado');

  // 5. Círculos especiais
  let circulosEspeciais = fera.circulos_especiais;
  if (!Array.isArray(circulosEspeciais) || circulosEspeciais.length === 0) {
    circulosEspeciais = [
      { tipo: 'dourado', chance: 0.25, efeito: 'raro' },
      {
        tipo: 'vermelho',
        chance: isVenenosa ? 0.3 : 0.15,
        efeito: isVenenosa ? 'envenenar' : 'perde_item',
      },
    ];
  }

  // 6. Movimento dos círculos (ativo se for fera ágil ou peso >= 10)
  const movimento = typeof fera.movimento === 'boolean' ? fera.movimento : peso >= 10;

  // 7. Espólios por faixa
  let espolios = fera.espolios;
  if (!espolios || (!espolios.faixa_0 && !espolios.faixa_40)) {
    // 7.1 Extrair TODOS os itens de drops / loot / saques da criatura
    const dropRawList = [];
    const seenItemIds = new Set();

    const candidateLists = [
      fera.drops,
      fera.loot,
      fera.detalhes?.drops,
      fera.detalhes?.loot,
      fera.saques,
      fera.recompensas,
    ];

    for (const list of candidateLists) {
      if (Array.isArray(list)) {
        for (const item of list) {
          if (!item) continue;
          const itemId =
            item.item_id ||
            item.id ||
            (item.name || item.nome
              ? String(item.name || item.nome)
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9-]/g, '')
              : null);
          if (!itemId || seenItemIds.has(itemId)) continue;
          seenItemIds.add(itemId);

          const nome = item.name || item.nome || 'Despojo de Caça';
          const qtd = Math.max(1, Number(item.qty || item.qtd || 1));
          const chance = item.chance !== undefined ? Number(item.chance) : 100;

          // Ícone contextual refinado
          let icon = item.icon;
          if (!icon) {
            const nLow = nome.toLowerCase();
            if (nLow.includes('pele') || nLow.includes('couro')) icon = '🧥';
            else if (nLow.includes('presa') || nLow.includes('dente') || nLow.includes('chifre'))
              icon = '🦷';
            else if (nLow.includes('venen') || nLow.includes('toxina') || nLow.includes('ácid'))
              icon = '🧪';
            else if (nLow.includes('osso') || nLow.includes('crânio') || nLow.includes('carcaça'))
              icon = '🦴';
            else if (nLow.includes('olho')) icon = '👁️';
            else if (nLow.includes('asa') || nLow.includes('pena')) icon = '🪶';
            else if (
              nLow.includes('cristal') ||
              nLow.includes('gema') ||
              nLow.includes('fogo') ||
              nLow.includes('pedra')
            )
              icon = '💎';
            else if (nLow.includes('carne') || nLow.includes('gordura') || nLow.includes('fígado'))
              icon = '🥩';
            else if (nLow.includes('sangue') || nLow.includes('coração')) icon = '🩸';
            else if (nLow.includes('ferrão') || nLow.includes('garra') || nLow.includes('pata'))
              icon = '🗡️';
            else if (nLow.includes('mel') || nLow.includes('geleia') || nLow.includes('seiva'))
              icon = '🍯';
            else if (
              nLow.includes('escala') ||
              nLow.includes('quitina') ||
              nLow.includes('escama') ||
              nLow.includes('casca')
            )
              icon = '🛡️';
            else icon = '🎒';
          }

          const raridade =
            item.raridade ||
            item.rarity ||
            (chance <= 25 ? 'Raro' : chance <= 60 ? 'Incomum' : 'Comum');

          dropRawList.push({
            item_id: itemId,
            catalog_id: itemId,
            nome,
            name: nome,
            qtd,
            chance,
            icon,
            raridade,
          });
        }
      }
    }

    // Se a fera não tiver nenhum drop cadastrado, gera 3 drops temáticos baseados no nome da criatura
    if (dropRawList.length === 0) {
      const cName = fera.nome || fera.name || 'Criatura';
      const cId = (fera.id || 'fera').toLowerCase().replace(/[^a-z0-9-]/g, '');
      dropRawList.push(
        {
          item_id: `couro-${cId}`,
          catalog_id: `couro-${cId}`,
          nome: `Couro de ${cName}`,
          name: `Couro de ${cName}`,
          qtd: 1,
          chance: 85,
          icon: '🧥',
          raridade: 'Comum',
        },
        {
          item_id: `presa-${cId}`,
          catalog_id: `presa-${cId}`,
          nome: `Presas de ${cName}`,
          name: `Presas de ${cName}`,
          qtd: 1,
          chance: 50,
          icon: '🦷',
          raridade: 'Incomum',
        },
        {
          item_id: `reliquia-${cId}`,
          catalog_id: `reliquia-${cId}`,
          nome: `Coração Nobre de ${cName}`,
          name: `Coração Nobre de ${cName}`,
          qtd: 1,
          chance: 15,
          icon: '💎',
          raridade: 'Raro',
        },
      );
    }

    // 7.2 Distribuir os drops reais pelas faixas
    // Ordena por chance decrescente (mais comuns primeiro, mais raros no final)
    const sorted = [...dropRawList].sort((a, b) => (b.chance || 100) - (a.chance || 100));
    const rares = sorted.filter((d) => (d.chance || 100) < 35);
    const rareItem = rares.length > 0 ? rares[0] : sorted[sorted.length - 1] || sorted[0];

    espolios = {
      // Faixa 0: Falha ou < 40% -> Primeiro drop real com qtd mínima (1)
      faixa_0: [{ ...sorted[0], qtd: 1 }],
      // Faixa 40: 40% a 69% -> Até os 2 primeiros drops reais com quantidade base completa
      faixa_40: sorted.slice(0, 2).map((d) => ({ ...d, qtd: Math.max(1, d.qtd) })),
      // Faixa 70: 70% a 89% -> Até 3 drops reais com bônus no item principal
      faixa_70: sorted
        .slice(0, 3)
        .map((d, idx) => ({ ...d, qtd: Math.max(1, d.qtd) + (idx === 0 ? 1 : 0) })),
      // Faixa 90: 90%+ -> Todos os drops reais disponíveis (até 4) com bônus em todos
      faixa_90: sorted.slice(0, 4).map((d) => ({ ...d, qtd: Math.max(1, d.qtd) + 1 })),
      // Raro: Parte especial com menor chance de drop
      raro: [{ ...rareItem, qtd: Math.max(1, rareItem.qtd), raridade: 'Raro' }],
    };
  }

  return {
    ...fera,
    peso_preparo: peso,
    tempo_circulo_ms: tempoCirculo,
    num_cortes: numCortes,
    circulos_especiais: circulosEspeciais,
    movimento,
    espolios,
    is_venenosa: isVenenosa,
  };
}

/**
 * 2. Criar 1 espolio_pendente por fera derrotada ao fim da batalha
 */
export async function criarEspoliosPendentesParaBatalha(batalhaId, mundoMinutos = null) {
  try {
    if (!batalhaId) return { success: false, error: 'batalhaId obrigatório' };

    // Buscar participantes da batalha
    const { data: partes, error: pErr } = await supabase
      .from('batalha_participantes')
      .select('*')
      .eq('batalha_id', batalhaId)
      .eq('tipo', 'fera');

    if (pErr) throw pErr;
    if (!partes || partes.length === 0) return { success: true, criados: [] };

    // Buscar logs de combate para detectar tipo de morte (fogo, ácido ou normal)
    const { data: logs } = await supabase
      .from('batalha_log')
      .select('texto, dados')
      .eq('batalha_id', batalhaId);

    const logTextoTotal = (logs || []).map((l) => (l.texto || '').toLowerCase()).join(' ');
    let tipoMorteGlobal = 'normal';
    if (
      logTextoTotal.includes('fogo') ||
      logTextoTotal.includes('chama') ||
      logTextoTotal.includes('queim')
    ) {
      tipoMorteGlobal = 'fogo';
    } else if (
      logTextoTotal.includes('ácido') ||
      logTextoTotal.includes('acido') ||
      logTextoTotal.includes('corros')
    ) {
      tipoMorteGlobal = 'acido';
    }

    // Minutos atuais do mundo (+ 6 horas = 360 minutos)
    let minutosBase = mundoMinutos;
    if (!minutosBase) {
      const { data: gs } = await supabase
        .from('game_state')
        .select('mundo_minutos')
        .limit(1)
        .single();
      minutosBase = Number(gs?.mundo_minutos || 439259940);
    }
    const expiraEm = Number(minutosBase) + 360;

    // Verificar se já foram criados para evitar duplicidade
    const { data: existentes } = await supabase
      .from('espolios_pendentes')
      .select('id, bestiario_id')
      .eq('batalha_id', batalhaId);

    const jaCriados = new Set((existentes || []).map((e) => e.bestiario_id));
    const criados = [];

    for (const feraPart of partes) {
      // Se a fera ainda está viva ou fugiu viva, nenhuma carcaça é deixada
      if (Number(feraPart.vida_atual) > 0) continue;

      const bestId = feraPart.bestiario_id || feraPart.id;
      if (jaCriados.has(bestId)) continue;

      const payload = {
        batalha_id: batalhaId,
        bestiario_id: bestId,
        morreu_por: tipoMorteGlobal,
        expira_em: expiraEm,
        recolhido: false,
        recolhido_por: null,
        ajudantes: [],
        resultado: {},
        progresso_ao_vivo: { status: 'aguardando', pontos: 0, combo: 0, pct: 0 },
      };

      const { data: novo, error: insErr } = await supabase
        .from('espolios_pendentes')
        .insert(payload)
        .select()
        .single();

      if (!insErr && novo) {
        criados.push(novo);
        jaCriados.add(bestId);
      }
    }

    // Registrar no batalha_log
    if (criados.length > 0) {
      await supabase.from('batalha_log').insert({
        batalha_id: batalhaId,
        rodada: 1,
        texto: `🗡️ Carcaças intactas no campo de batalha! ${criados.length} espólio(s) disponível(is) para coleta (expiram em 6 horas).`,
        dados: { tipo: 'espolios_disponiveis', qtd: criados.length },
      });
    }

    return { success: true, criados };
  } catch (err) {
    console.warn('[EspolioService] Aviso ao criar espólios pendentes no DB:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 3. Buscar espólios pendentes de uma batalha com dados enriquecidos da criatura
 */
export async function buscarEspoliosBatalha(batalhaId) {
  try {
    if (!batalhaId) return { success: false, espolios: [] };

    // 1. Buscar registros de espolios_pendentes
    const { data, error } = await supabase
      .from('espolios_pendentes')
      .select(
        'id, batalha_id, bestiario_id, heroi_id, status, preparo_rolado, preparo_total, preparo_sucesso, qualidade_max, resultado_faca, itens_obtidos, created_at',
      )
      .eq('batalha_id', batalhaId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return { success: true, espolios: [] };

    // 2. Buscar participantes feras da batalha para cruzar nomes e imagens
    const { data: ferasPart } = await supabase
      .from('batalha_participantes')
      .select('id, batalha_id, tipo, bestiario_id, vida_atual, vida_max, defesa')
      .eq('batalha_id', batalhaId)
      .eq('tipo', 'fera');

    // 3. Montar mapa de feras a partir do DEFAULT_BESTIARIO e da tabela bestiario
    const { data: bestDb } = await supabase
      .from('bestiario')
      .select(
        'id, nome, imagem, vida, defesa, ataque_bonus, ataques, comportamento, fuga_em_percent, drops, peso_preparo, tempo_circulo_ms, num_cortes, movimento, circulos_especiais, espolios',
      );
    const beastMap = {};
    DEFAULT_BESTIARIO.forEach((b) => {
      beastMap[b.id] = enriquecerFeraComEspolios(b);
    });
    (bestDb || []).forEach((b) => {
      beastMap[b.id] = enriquecerFeraComEspolios({ ...(beastMap[b.id] || {}), ...b });
    });

    // 4. Buscar criaturas que possam pertencer ao creature_catalog (catálogo completo de 1500 feras)
    const neededBeastIds = data.map((e) => e.bestiario_id).filter((id) => id && !beastMap[id]);
    if (neededBeastIds.length > 0) {
      try {
        const { data: catBeasts } = await supabase
          .from('creature_catalog')
          .select(
            'id, name, category, tier, threat, max_hp, defense, loot, harvest_skill, harvest_peso, image_url, icon',
          )
          .in('id', neededBeastIds);
        (catBeasts || []).forEach((cb) => {
          beastMap[cb.id] = enriquecerFeraComEspolios({
            id: cb.id,
            nome: cb.name,
            name: cb.name,
            imagem: cb.image_url,
            vida: cb.max_hp || 15,
            defesa: cb.defense || 9,
            threat: cb.threat || 2,
            peso_preparo: cb.harvest_peso,
            harvest_peso: cb.harvest_peso,
            loot: cb.loot || [],
            drops: Array.isArray(cb.loot)
              ? cb.loot.map((l) => ({
                  item_id: l.item_id || l.id,
                  nome: l.name || l.nome,
                  name: l.name || l.nome,
                  qtd: Number(l.qty || 1),
                  chance: Number(l.chance ?? 100),
                }))
              : [],
            comportamento: cb.behavior,
            descricao: cb.description,
          });
        });
      } catch (catErr) {
        console.warn('[EspolioService] Erro ao buscar criaturas no creature_catalog:', catErr);
      }
    }

    const espoliosCompletos = data
      .map((esp) => {
        const part = (ferasPart || []).find(
          (p) => p.bestiario_id === esp.bestiario_id || p.id === esp.bestiario_id,
        );
        // Se a fera fugiu viva, nunca deve aparecer opção de espólios
        if (part?.fugiu && Number(part?.vida_atual) > 0) return null;

        let feraData = beastMap[esp.bestiario_id];
        if (!feraData && part?.detalhes) {
          feraData = enriquecerFeraComEspolios(part.detalhes);
        }
        if (!feraData && part) {
          feraData = enriquecerFeraComEspolios({
            id: esp.bestiario_id,
            nome: part.nome || 'Fera Derrotada',
            imagem: part.imagem || null,
            vida: part.vida_max || 15,
            defesa: part.defesa || 9,
          });
        }
        if (!feraData) {
          feraData = enriquecerFeraComEspolios({
            id: esp.bestiario_id,
            nome: 'Fera Derrotada',
            vida: 15,
            defesa: 9,
          });
        }

        return {
          ...esp,
          fera: feraData,
        };
      })
      .filter(Boolean);

    return { success: true, espolios: espoliosCompletos };
  } catch (err) {
    console.warn('[EspolioService] Aviso ao buscar espólios pendentes:', err.message);
    return { success: false, error: err.message, espolios: [] };
  }
}

/**
 * 4. Assinar em tempo real a tabela espolios_pendentes para a batalha
 */
export function assinarEspoliosBatalha(batalhaId, onUpdate) {
  if (!batalhaId) return () => {};

  const channel = supabase
    .channel(`espolios_realtime_${batalhaId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'espolios_pendentes',
        filter: `batalha_id=eq.${batalhaId}`,
      },
      (payload) => {
        if (typeof onUpdate === 'function') onUpdate(payload);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * 5. Primeiro jogador a tocar vira o cortador (exclusivo, apenas 1 cortador)
 */
export async function assumirCortadorEspolio(espolioId, heroiId, heroiNome) {
  try {
    // Checa se o espólio já foi recolhido ou já possui outro cortador
    const { data: espAtual } = await supabase
      .from('espolios_pendentes')
      .select('id, recolhido, recolhido_por')
      .eq('id', espolioId)
      .maybeSingle();

    if (espAtual?.recolhido) {
      return { success: false, alreadyCollected: true, error: 'Este espólio já foi recolhido!' };
    }

    if (espAtual?.recolhido_por && espAtual.recolhido_por !== heroiId) {
      return { success: false, alreadyHasCortador: true, cortadorId: espAtual.recolhido_por };
    }

    const { data, error } = await supabase
      .from('espolios_pendentes')
      .update({
        recolhido_por: heroiId,
        progresso_ao_vivo: {
          status: 'preparando',
          cortador_nome: heroiNome,
          pontos: 0,
          combo: 0,
          pct: 0,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', espolioId)
      .eq('recolhido', false)
      .select()
      .maybeSingle();

    if (error) throw error;
    return { success: true, espolio: data };
  } catch (err) {
    console.error('[EspolioService] Erro ao assumir cortador:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 6. Outro jogador entra como ajudante (máximo 2 ajudantes)
 */
export async function adicionarAjudanteEspolio(espolioId, heroiId, heroiNome) {
  try {
    // Buscar ajudantes atuais
    const { data: esp, error: fErr } = await supabase
      .from('espolios_pendentes')
      .select('ajudantes, recolhido_por')
      .eq('id', espolioId)
      .single();

    if (fErr) throw fErr;
    if (esp.recolhido_por === heroiId) {
      return { success: false, error: 'Você já é o cortador principal desta carcaça.' };
    }

    const ajudantes = Array.isArray(esp.ajudantes) ? esp.ajudantes : [];
    if (ajudantes.some((a) => a.personagem_id === heroiId)) {
      return { success: true, ajudantes }; // já está ajudando
    }

    if (ajudantes.length >= 2) {
      return { success: false, error: 'Capacidade máxima de ajudantes atingida (máx. 2).' };
    }

    const novosAjudantes = [...ajudantes, { personagem_id: heroiId, nome: heroiNome }];

    const { data: updated, error: uErr } = await supabase
      .from('espolios_pendentes')
      .update({
        ajudantes: novosAjudantes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', espolioId)
      .select()
      .single();

    if (uErr) throw uErr;
    return { success: true, espolio: updated };
  } catch (err) {
    console.error('[EspolioService] Erro ao adicionar ajudante:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 7. Atualizar progresso do minigame ao vivo para o Mestre e Grupo assistirem
 */
export async function atualizarProgressoAoVivo(espolioId, progresso) {
  try {
    await supabase
      .from('espolios_pendentes')
      .update({
        progresso_ao_vivo: progresso,
        updated_at: new Date().toISOString(),
      })
      .eq('id', espolioId);
  } catch (_) {
    // Silencioso em caso de rate limit
  }
}

/**
 * 8. Calcular modificadores e dificuldade antes de começar o corte
 */
export function calcularDificuldadeEspolio({
  fera,
  heroi,
  inventarioItens = [],
  ajudantes = [],
  morreuPor = 'normal',
}) {
  if (!fera) return null;

  const tempoBase = fera.tempo_circulo_ms || TEMPO_PADRAO_POR_PESO[fera.peso_preparo] || 900;
  const numCortesBase = fera.num_cortes || CORTES_PADRAO_POR_PESO[fera.peso_preparo] || 6;

  // Modificador 1: Sobrevivência treinada na ficha (×1.2)
  const skillsHeroi = (heroi?.skills || []).map((s) => String(s).toLowerCase());
  const temSobrevivencia = skillsHeroi.some((s) => s.includes('sobreviv'));

  // Modificador 2: Faca de caça no inventário (×1.1)
  const temFacaCaca = (inventarioItens || []).some((item) => {
    const nome = (item.name || '').toLowerCase();
    return (
      nome.includes('faca') ||
      nome.includes('adaga') ||
      nome.includes('cutelo') ||
      nome.includes('punhal') ||
      nome.includes('caça') ||
      nome.includes('caca')
    );
  });

  // Modificador 3: Ajudantes (+10% no tempo por ajudante, máx 2 ajudantes)
  const qtdAjudantes = Math.min(2, (ajudantes || []).length);
  const multAjudantes = 1 + qtdAjudantes * 0.1;

  // Tempo efetivo do círculo
  let multTempo = 1.0;
  if (temSobrevivencia) multTempo *= 1.2;
  if (temFacaCaca) multTempo *= 1.1;
  multTempo *= multAjudantes;

  const tempoEfetivoMs = Math.round(tempoBase * multTempo);

  // Se morreu por fogo ou ácido: cortes × 0.7
  let numCortesEfetivo = numCortesBase;
  if (morreuPor === 'fogo' || morreuPor === 'acido') {
    numCortesEfetivo = Math.max(3, Math.round(numCortesBase * 0.7));
  }

  return {
    tempoBase,
    tempoEfetivoMs,
    multTempo: Number(multTempo.toFixed(2)),
    temSobrevivencia,
    temFacaCaca,
    qtdAjudantes,
    numCortesBase,
    numCortesEfetivo,
    morreuPor,
    movimento: !!fera.movimento,
    circulosEspeciais: fera.circulos_especiais || [],
  };
}

/**
 * 9. Concluir Espólio e Entregar Itens no Inventário
 */
export async function concluirEspolio({
  espolio,
  heroi,
  resultadoMinigame,
  itensEscolhidos = [],
  batalhaId = null,
}) {
  try {
    if (!espolio?.id || !heroi?.id) {
      throw new Error('Espólio e Herói são necessários para a conclusão.');
    }

    const playerId = heroi.player_id || heroi.id;
    const sessionCode = heroi.session_code || 'MESA';
    const characterId = heroi.id;

    // 0. TRAVA DE EXCLUSIVIDADE: Verificar se o espólio já foi recolhido anteriormente
    const { data: espChecagem } = await supabase
      .from('espolios_pendentes')
      .select('id, recolhido, recolhido_por')
      .eq('id', espolio.id)
      .maybeSingle();

    if (espChecagem?.recolhido) {
      console.warn('[EspolioService] Espólio já recolhido anteriormente. Bloqueando duplicação.');
      return { success: false, alreadyCollected: true, error: 'Este espólio já foi recolhido!' };
    }

    // 1. Garantir que a lista de itens a entregar nunca seja vazia se a fera possuir espólios
    let itensParaEntregar =
      Array.isArray(itensEscolhidos) && itensEscolhidos.length > 0 ? [...itensEscolhidos] : [];
    if (itensParaEntregar.length === 0 && espolio?.fera) {
      const espData = espolio.fera.espolios || {};
      const faixa = resultadoMinigame?.faixa || 'faixa_40';
      if (Array.isArray(espData[faixa]) && espData[faixa].length > 0) {
        itensParaEntregar = [...espData[faixa]];
      } else if (Array.isArray(espolio.fera.drops) && espolio.fera.drops.length > 0) {
        itensParaEntregar = espolio.fera.drops.slice(0, 2);
      } else if (Array.isArray(espolio.fera.loot) && espolio.fera.loot.length > 0) {
        itensParaEntregar = espolio.fera.loot.slice(0, 2).map((l) => ({
          item_id: l.item_id || l.id,
          nome: l.name || l.nome,
          qtd: Number(l.qty || 1),
          icon: '🥩',
        }));
      }
    }

    // 2. Entregar cada item no inventário do jogador
    const entregues = [];
    for (const item of itensParaEntregar) {
      try {
        let entregueComSucesso = false;
        // Tentar via RPC oficial do catálogo se catalog_id existir
        const catId = item.catalog_id || item.item_id;
        if (catId) {
          try {
            await giveCatalogItemViaRPC(catId, characterId, item.qtd || 1);
            entregues.push({ ...item, entregueVia: 'rpc' });
            entregueComSucesso = true;
          } catch (_) {
            // Se o RPC falhar por item não cadastrado no catálogo oficial, cria diretamente no inventário
          }
        }

        if (!entregueComSucesso) {
          // Inserção direta no inventário
          const novoItem = await createInventoryItemInDB({
            session_code: sessionCode,
            player_id: playerId,
            character_id: characterId,
            name: item.nome || item.name || 'Material de Espólio',
            description: `Espólio colhido de ${espolio.fera?.nome || 'Fera'}. Ingrediente para oficinas e receitas de Aldrenor.`,
            icon: item.icon || '🥩',
            category: 'ingrediente',
            rarity: item.raridade || 'Comum',
            quantity: Number(item.qtd) || 1,
            metadata: { characterId, item_id: item.item_id, catalog_id: catId },
          });

          entregues.push({ ...item, item_criado: novoItem, entregueVia: 'direct_db' });
        }
      } catch (itemErr) {
        console.warn('[EspolioService] Erro ao entregar item específico:', itemErr);
      }
    }

    // 2. Se tocou no círculo vermelho de fera venenosa: aplicar efeito Envenenado na ficha
    if (resultadoMinigame?.envenenadoAplicado) {
      try {
        await efeitoAplicarRPC(
          characterId,
          'envenenado',
          1,
          null,
          'Recolher Espólios',
          'Toxina de carcaça tocada durante a colheita',
        );
      } catch (efErr) {
        console.warn('[EspolioService] Não foi possível aplicar status envenenado:', efErr);
      }
    }

    // 3. Atualizar registro em espolios_pendentes
    const { data: espAtualizado, error: updErr } = await supabase
      .from('espolios_pendentes')
      .update({
        recolhido: true,
        recolhido_por: characterId,
        resultado: {
          ...resultadoMinigame,
          itens_entregues: entregues,
          data_conclusao: new Date().toISOString(),
        },
        progresso_ao_vivo: { status: 'concluido', pct: resultadoMinigame.porcentagem || 100 },
        updated_at: new Date().toISOString(),
      })
      .eq('id', espolio.id)
      .eq('recolhido', false)
      .select()
      .maybeSingle();

    if (updErr) throw updErr;
    if (!espAtualizado) {
      console.warn('[EspolioService] Falha atômica: espólio já havia sido marcado como recolhido.');
      return {
        success: false,
        alreadyCollected: true,
        error: 'Este espólio já foi recolhido por outro jogador!',
      };
    }

    // 4. Registrar no batalha_log
    const batId = batalhaId || espolio.batalha_id;
    if (batId) {
      const nomesItens = entregues.map((i) => `${i.qtd || 1}x ${i.nome || i.name}`).join(', ');
      const descPct = `${resultadoMinigame.porcentagem || 0}% de aproveitamento`;
      await supabase.from('batalha_log').insert({
        batalha_id: batId,
        rodada: 1,
        texto: `🍖 ${heroi.name} preparou a carcaça de ${espolio.fera?.nome || 'Fera'} (${descPct}). Obteve: ${nomesItens || 'Restos menores'}.`,
        dados: { tipo: 'espolio_recolhido', heroi_id: characterId, itens: entregues },
      });
    }

    return { success: true, espolio: espAtualizado, itensEntregues: entregues };
  } catch (err) {
    console.error('[EspolioService] Erro ao concluir espólio:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 10. Ações do Mestre (Dar espólio extra / Renovar prazo +6h)
 */
export async function dmAcoesEspolio(espolioId, acao, dadosExtras = {}) {
  try {
    if (!espolioId) return { success: false, error: 'espolioId obrigatório' };

    if (acao === 'renovar_prazo') {
      // Adicionar +360 minutos (+6 horas) no expira_em
      const { data: atual } = await supabase
        .from('espolios_pendentes')
        .select('expira_em')
        .eq('id', espolioId)
        .single();
      const novoExpira = Number(atual?.expira_em || 439259940) + 360;

      const { data, error } = await supabase
        .from('espolios_pendentes')
        .update({ expira_em: novoExpira, updated_at: new Date().toISOString() })
        .eq('id', espolioId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, acao: 'prazo_renovado', expira_em: novoExpira, espolio: data };
    }

    if (acao === 'dar_espolio_extra') {
      // Adicionar um item extra ao resultado ou no inventário
      const itemExtra = dadosExtras.item || {
        item_id: 'reliquia-mestre',
        qtd: 1,
        nome: 'Bênção de Espólio do Mestre',
      };
      const { data: esp } = await supabase
        .from('espolios_pendentes')
        .select('resultado, recolhido_por, batalha_id')
        .eq('id', espolioId)
        .single();

      const resAtual = esp?.resultado || {};
      const itensNovos = [...(resAtual.itens_entregues || []), itemExtra];

      const { data, error } = await supabase
        .from('espolios_pendentes')
        .update({
          resultado: { ...resAtual, itens_entregues: itensNovos, extra_mestre: true },
          updated_at: new Date().toISOString(),
        })
        .eq('id', espolioId)
        .select()
        .single();

      if (error) throw error;

      if (esp?.batalha_id) {
        await supabase.from('batalha_log').insert({
          batalha_id: esp.batalha_id,
          rodada: 1,
          texto: `✨ O Mestre concedeu um Espólio Extra: 1x ${itemExtra.nome}!`,
          dados: { tipo: 'espolio_extra_mestre', item: itemExtra },
        });
      }

      return { success: true, acao: 'espolio_extra_concedido', espolio: data };
    }

    return { success: false, error: 'Ação do Mestre desconhecida' };
  } catch (err) {
    console.error('[EspolioService] Erro em dmAcoesEspolio:', err);
    return { success: false, error: err.message };
  }
}
