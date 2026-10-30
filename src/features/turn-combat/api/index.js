import { supabase } from '../../../shared/supabase';
const BATALHA_COLS =
  'id, status, modo_dados, rodada, turno_index, ordem_turnos, criado_por_mestre, created_at, updated_at';
const PARTICIPANTE_COLS =
  'id, batalha_id, tipo, personagem_id, bestiario_id, vida_atual, vida_max, defesa, iniciativa, condicoes, defendendo, vantagem_proxima, desvantagem_proxima, recargas, dano_recebido_de, a_beira, fugiu, created_at, updated_at';
const LOG_COLS = 'id, batalha_id, rodada, texto, dados, created_at';
const CREATURE_CATALOG_COLS =
  'id, name, species, category, size, region, region_key, stage, tier, threat, max_hp, defense, attack_bonus, damage_dice, attacks_per_turn, abilities, weakness, loot, harvest_skill, harvest_peso, edible, cooking, eat_effect, plague, unique, lair, description, icon, image_url, tags, archived';
const BESTIARIO_COLS =
  'id, nome, imagem, vida, defesa, ataque_bonus, ataques, comportamento, fuga_em_percent, drops, peso_preparo, tempo_circulo_ms, num_cortes, movimento, circulos_especiais, espolios';
const CHAR_BATTLE_COLS =
  'id, name, title, race, race_id, caminho, level, xp, attributes, health, max_health, focus, max_focus, plague, defense, inspiration, skills, conditions, death_saves, alive, avatar_icon, oath_tree';

import {
  CONDICOES_CATALOGO,
  aplicarCondicao,
  avaliarCombosElementais,
  gerarEfeitosAutomaticosBestiario,
  inferirEfeitosPocao,
  normalizarCondicao,
  persistirCondicoesFimDeBatalha,
  processarTiqueInicioTurno,
  removerCondicao,
  rolarFormulaTique,
  testarEfeitosAtaqueFera,
} from '../../../services/conditionEngine';
import { criarEspoliosPendentesParaBatalha } from '../../../services/espolioService';
import { resolverMagiaMotor } from '../../../services/spellEngine';

/**
 * SERVIÇO DO SISTEMA DE BATALHA DE ALDRENOR
 * Autoridade no Servidor via Edge Function "batalha" com fallback para RPC.
 * Assinatura em Tempo Real com Supabase Realtime.
 */

const FUNCTION_NAME = 'batalha';

/**
 * Executa os comandos de batalha no motor sincronizado com Supabase Realtime
 */
async function invocarEdgeFunctionBatalha(body) {
  const res = await resolverBatalhaLocal(body);
  return { ...res, data: res };
}

export const TERRENOS_BATALHA = [
  {
    id: 'floresta',
    nome: 'Floresta Sombria',
    desc: 'Bosque enevoado e árvores retorcidas',
    icon: '🌲',
    bg: 'radial-gradient(ellipse at top, #142115 0%, #0d120e 70%, #080a08 100%)',
  },
  {
    id: 'caverna',
    nome: 'Cavernas Profundas',
    desc: 'Estalactites de pedra e escuridão úmida',
    icon: '🪨',
    bg: 'radial-gradient(ellipse at top, #1c1a17 0%, #100e0c 70%, #080706 100%)',
  },
  {
    id: 'ruinas',
    nome: 'Ruínas Ancestrais',
    desc: 'Arcos góticos caídos e hera sagrada',
    icon: '🏛️',
    bg: 'radial-gradient(ellipse at top, #261f18 0%, #15110d 70%, #0b0907 100%)',
  },
  {
    id: 'pantano',
    nome: 'Charnecas & Pântano',
    desc: 'Lodo borbulhante e névoa da Peste',
    icon: '🌫️',
    bg: 'radial-gradient(ellipse at top, #1a241c 0%, #0e140f 70%, #070a07 100%)',
  },
  {
    id: 'montanha',
    nome: 'Montanhas Gélidas',
    desc: 'Picos escarpados e ventos congelantes',
    icon: '🏔️',
    bg: 'radial-gradient(ellipse at top, #18242c 0%, #0d1419 70%, #06090c 100%)',
  },
  {
    id: 'cripta',
    nome: 'Cripta Maculada',
    desc: 'Sepulcros de reis esquecidos e velas arroxeadas',
    icon: '🕯️',
    bg: 'radial-gradient(ellipse at top, #241421 0%, #140b12 70%, #090508 100%)',
  },
  {
    id: 'bosque_sagrado',
    nome: 'Bosque dos Juramentos',
    desc: 'Raízes ancestrais e brasas sagradas',
    icon: '✨',
    bg: 'radial-gradient(ellipse at top, #2c2415 0%, #17120a 70%, #0a0805 100%)',
  },
];

/**
 * 1. Criar uma nova batalha (Mestre)
 */
export async function criarBatalha({
  modoDados = 'app', // 'app' | 'fisico'
  criadoPorMestre = 'Mestre',
  terreno = 'floresta',
  participantes = [], // [{ tipo: 'heroi'|'fera', personagem_id?, bestiario_id?, vida_atual, vida_max, defesa }]
}) {
  try {
    // 1. Criar registro na tabela batalhas
    let batalha = null;
    try {
      const { data, error } = await supabase
        .from('batalhas')
        .insert({
          status: 'preparando',
          modo_dados: modoDados,
          terreno,
          rodada: 1,
          turno_index: 0,
          ordem_turnos: [],
          criado_por_mestre: criadoPorMestre,
        })
        .select()
        .single();
      if (!error && data) batalha = data;
    } catch (_) {}

    if (!batalha) {
      const { data, error: batErr } = await supabase
        .from('batalhas')
        .insert({
          status: 'preparando',
          modo_dados: modoDados,
          rodada: 1,
          turno_index: 0,
          ordem_turnos: [],
          criado_por_mestre: criadoPorMestre,
        })
        .select()
        .single();
      if (batErr || !data) throw batErr || new Error('Falha ao criar batalha');
      batalha = data;
    }

    // 2. Inserir participantes
    if (participantes.length > 0) {
      const registros = participantes.map((p) => ({
        batalha_id: batalha.id,
        tipo: p.tipo,
        personagem_id: p.personagem_id || null,
        bestiario_id: p.bestiario_id || null,
        vida_atual: p.vida_atual,
        vida_max: p.vida_max,
        defesa: p.defesa,
        iniciativa: 0,
        condicoes: p.condicoes || [],
        defendendo: false,
        vantagem_proxima: false,
        desvantagem_proxima: false,
        recargas: {},
        dano_recebido_de: {},
        a_beira: { sucessos: 0, falhas: 0 },
        fugiu: false,
      }));

      const { error: partErr } = await supabase.from('batalha_participantes').insert(registros);

      if (partErr) throw partErr;
    }

    // 3. Log inicial
    await supabase.from('batalha_log').insert({
      batalha_id: batalha.id,
      rodada: 1,
      texto: `⚔️ Arena de batalha preparada pelo ${criadoPorMestre}. Modo de dados: ${modoDados.toUpperCase()}.`,
      dados: { participantes_qtd: participantes.length },
    });

    return { success: true, batalha };
  } catch (err) {
    console.error('[BattleService] Erro ao criar batalha:', err);
    return { success: false, error: err.message || err };
  }
}

/**
 * 2. Iniciar a batalha (Rola iniciativa e define ordem de turnos no servidor)
 */
export async function iniciarBatalha(batalhaId) {
  return await invocarEdgeFunctionBatalha({
    acao: 'iniciar',
    batalha_id: batalhaId,
  });
}

/**
 * 3. Executar ação no turno (Autoridade total do servidor)
 * @param {Object} params
 * @param {string} params.batalhaId
 * @param {string} params.atorId - ID do participante em batalha_participantes
 * @param {string} params.tipo - 'ataque' | 'defender' | 'ajudar' | 'invocar_juramento' | 'fugir' | 'quebrar_juramento' | 'rolar_morte' | 'habilidade' | 'magia' | 'item'
 * @param {string} [params.alvoId]
 * @param {Object} [params.dadosExtras] - { tipo_ataque, arma_bonus, custo_foco, item_id, cura_vida, atletismo, nome }
 * @param {Object} [params.resultadoFisico] - { d1, d2, d3?, soma } (se modo_dados === 'fisico')
 */
export async function executarAcaoBatalha({
  batalhaId,
  atorId,
  tipo,
  alvoId = null,
  dadosExtras = {},
  resultadoFisico = null,
  naoAvancarTurno = false,
}) {
  return await invocarEdgeFunctionBatalha({
    acao: 'acao',
    batalha_id: batalhaId,
    ator_id: atorId,
    tipo,
    alvo_id: alvoId,
    dados_extras: dadosExtras,
    resultado_fisico: resultadoFisico,
    nao_avancar_turno: Boolean(naoAvancarTurno),
  });
}

/**
 * 4. Avançar para o próximo turno
 */
export async function avancarTurnoBatalha(batalhaId) {
  return await invocarEdgeFunctionBatalha({
    acao: 'proximo_turno',
    batalha_id: batalhaId,
  });
}

/**
 * 5. Executar turno específico de fera
 */
export async function executarTurnoFera(batalhaId, feraId, dadosExtras = {}) {
  return await invocarEdgeFunctionBatalha({
    acao: 'turno_fera',
    batalha_id: batalhaId,
    fera_id: feraId,
    participante_id: feraId,
    alvo_id: dadosExtras.alvoId || null,
    dados_extras: dadosExtras,
  });
}

// Cache em memória para fichas de criaturas (evita reconsultar bestiario/creature_catalog a cada turno)
const beastMetadataCache = new Map();

/**
 * 6. Buscar estado completo da batalha (Otimizado com consultas paralelas e cache de criaturas)
 */
export async function buscarEstadoBatalha(batalhaId) {
  try {
    DEFAULT_BESTIARIO.forEach((b) => {
      if (!beastMetadataCache.has(b.id)) beastMetadataCache.set(b.id, b);
    });

    const [batRes, partRes, logRes] = await Promise.all([
      supabase.from('batalhas').select(BATALHA_COLS).eq('id', batalhaId).single(),
      supabase.from('batalha_participantes').select(PARTICIPANTE_COLS).eq('batalha_id', batalhaId),
      supabase
        .from('batalha_log')
        .select(LOG_COLS)
        .eq('batalha_id', batalhaId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (batRes.error) throw batRes.error;

    const participantes = partRes.data || [];
    const heroIds = participantes
      .filter((p) => p.tipo === 'heroi')
      .map((p) => p.personagem_id)
      .filter(Boolean);
    const beastIds = participantes
      .filter((p) => p.tipo === 'fera')
      .map((p) => p.bestiario_id)
      .filter(Boolean);
    const uncachedBeastIds = beastIds.filter((id) => !beastMetadataCache.has(id));

    const charMap = {};
    const extraQueries = [];

    if (heroIds.length > 0) {
      extraQueries.push(
        supabase
          .from('characters')
          .select(CHAR_BATTLE_COLS)
          .in('id', heroIds)
          .then(({ data: chars }) => {
            const isImgUrl = (val) =>
              typeof val === 'string' &&
              (val.startsWith('http') ||
                val.startsWith('data:') ||
                val.startsWith('blob:') ||
                val.startsWith('/'));
            chars?.forEach((c) => {
              const resolvedImg =
                (isImgUrl(c.portrait_url) && c.portrait_url) ||
                (isImgUrl(c.portraitUrl) && c.portraitUrl) ||
                (isImgUrl(c.image_url) && c.image_url) ||
                (isImgUrl(c.imageUrl) && c.imageUrl) ||
                (isImgUrl(c.avatar_icon) && c.avatar_icon) ||
                (isImgUrl(c.avatarIcon) && c.avatarIcon) ||
                (isImgUrl(c.avatar) && c.avatar) ||
                null;
              charMap[c.id] = {
                ...c,
                avatar: resolvedImg,
                imagem: resolvedImg,
                portraitUrl: resolvedImg || c.portrait_url || c.portraitUrl,
                imageUrl: resolvedImg || c.image_url || c.imageUrl,
              };
            });
          })
          .catch(() => {}),
      );
    }

    if (uncachedBeastIds.length > 0) {
      extraQueries.push(
        (async () => {
          try {
            const { data: beasts } = await supabase
              .from('bestiario')
              .select(BESTIARIO_COLS)
              .in('id', uncachedBeastIds);
            beasts?.forEach((b) => {
              beastMetadataCache.set(b.id, b);
            });
          } catch (_) {}

          const stillMissing = uncachedBeastIds.filter((id) => !beastMetadataCache.has(id));
          if (stillMissing.length > 0) {
            try {
              const { data: catBeasts } = await supabase
                .from('creature_catalog')
                .select(CREATURE_CATALOG_COLS)
                .in('id', stillMissing);
              catBeasts?.forEach((cb) => {
                beastMetadataCache.set(cb.id, formatarCriaturaParaBatalha(cb));
              });
            } catch (_) {}
          }
        })(),
      );
    }

    if (extraQueries.length > 0) {
      await Promise.all(extraQueries);
    }

    const participantesEnriquecidos = participantes.map((p) => ({
      ...p,
      detalhes:
        p.tipo === 'heroi'
          ? charMap[p.personagem_id]
          : beastMetadataCache.get(p.bestiario_id) || {
              nome: 'Fera',
              vida: p.vida_max,
              defesa: p.defesa,
            },
    }));

    return {
      success: true,
      batalha: batRes.data,
      participantes: participantesEnriquecidos,
      logs: (logRes.data || []).reverse(),
    };
  } catch (err) {
    console.error('[BattleService] Erro ao buscar estado da batalha:', err);
    return { success: false, error: err.message || err };
  }
}

export function obterIconeCriatura(infoFera) {
  if (!infoFera) return '🐾';
  if (infoFera.icon && typeof infoFera.icon === 'string' && !infoFera.icon.startsWith('http')) {
    return infoFera.icon;
  }
  const cat = String(infoFera.category || infoFera.categoria || '').toLowerCase();
  const nome = String(infoFera.nome || infoFera.name || '').toLowerCase();

  if (nome.includes('lobo')) return '🐺';
  if (nome.includes('urso')) return '🐻';
  if (nome.includes('dragão') || nome.includes('dragao')) return '🐉';
  if (
    nome.includes('espectro') ||
    nome.includes('esqueleto') ||
    nome.includes('zumbi') ||
    cat.includes('morto-vivo')
  )
    return '💀';
  if (
    nome.includes('peste') ||
    cat.includes('peste') ||
    cat.includes('aberração') ||
    cat.includes('aberracao')
  )
    return '☣️';
  if (cat.includes('constructo') || nome.includes('golem')) return '⚙️';
  if (cat.includes('elemental')) return '🔥';
  if (cat.includes('inseto') || nome.includes('aranha') || nome.includes('escorpião')) return '🦂';
  if (nome.includes('serpente') || nome.includes('cobra') || cat.includes('réptil')) return '🐍';
  if (nome.includes('pássaro') || nome.includes('harpa') || nome.includes('grifo')) return '🦅';
  if (cat.includes('planta')) return '🌿';
  if (nome.includes('javali')) return '🐗';
  if (nome.includes('sapo') || cat.includes('gosma')) return '🟢';
  if (cat.includes('animal') || cat.includes('fera')) return '🐾';
  return '👹';
}

export const DEFAULT_BESTIARIO = [
  {
    id: 'lobo_sombrio',
    nome: 'Lobo Sombrio das Uzes',
    imagem:
      'https://images.unsplash.com/photo-1564865878688-9a244444042a?auto=format&fit=crop&w=600&q=80',
    vida: 18,
    defesa: 9,
    ataque_bonus: 2,
    comportamento: 'cacador',
    fuga_em_percent: null,
    peso_preparo: 8,
    tempo_circulo_ms: 900,
    num_cortes: 6,
    movimento: false,
    circulos_especiais: [
      { tipo: 'dourado', chance: 0.25, efeito: 'raro' },
      { tipo: 'vermelho', chance: 0.15, efeito: 'perde_item' },
    ],
    espolios: {
      faixa_0: [{ item_id: 'couro-de-lobo', qtd: 1, nome: 'Couro de Lobo Ressecado' }],
      faixa_40: [
        { item_id: 'couro-de-lobo', qtd: 2, nome: 'Pele de Lobo Sombrio' },
        { item_id: 'carne-cacador', qtd: 1, nome: 'Carne Magra de Caça' },
      ],
      faixa_70: [
        { item_id: 'couro-de-lobo', qtd: 2, nome: 'Pele de Lobo Sombrio Inteira' },
        { item_id: 'presa-afiada', qtd: 1, nome: 'Presa Afiada de Predador' },
        { item_id: 'carne-cacador', qtd: 2, nome: 'Carne de Caça Fresca' },
      ],
      faixa_90: [
        { item_id: 'couro-de-lobo', qtd: 3, nome: 'Pele Nobre de Lobo das Uzes' },
        { item_id: 'presa-afiada', qtd: 2, nome: 'Presas Perfeitas de Lobo' },
        { item_id: 'carne-cacador', qtd: 3, nome: 'Carne de Caça Suculenta' },
      ],
      raro: [{ item_id: 'olho-lobo-sombrio', qtd: 1, nome: 'Olho Noturno do Lobo Sombrio' }],
    },
    ataques: [
      {
        nome: 'Mordida Feroz',
        dano: '1d10',
        tipo: 'fisico',
        peso_chance: 60,
        recarga: null,
        efeito: { condicao: 'sangramento', peso_teste: 10 },
      },
      {
        nome: 'Investida Derrubadora',
        dano: '1d8',
        tipo: 'fisico',
        peso_chance: 40,
        recarga: null,
        efeito: { condicao: 'derrubado', peso_teste: 11 },
      },
    ],
    drops: [
      { item_id: 'pele_lobo', qtd: 1, nome: 'Pele de Lobo Sombrio' },
      { item_id: 'presa_afiada', qtd: 2, nome: 'Presas Afiadas' },
    ],
  },
  {
    id: 'urso_peste',
    nome: 'Urso Infectado da Peste',
    imagem:
      'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=600&q=80',
    vida: 32,
    defesa: 8,
    ataque_bonus: 3,
    comportamento: 'vingativo',
    fuga_em_percent: null,
    peso_preparo: 12,
    tempo_circulo_ms: 600,
    num_cortes: 8,
    movimento: true,
    circulos_especiais: [
      { tipo: 'dourado', chance: 0.2, efeito: 'raro' },
      { tipo: 'vermelho', chance: 0.3, efeito: 'envenenar' },
    ],
    espolios: {
      faixa_0: [{ item_id: 'osso-pesado', qtd: 1, nome: 'Osso Pútrido Lascado' }],
      faixa_40: [
        { item_id: 'gordura-urso', qtd: 2, nome: 'Gordura de Urso Pestilento' },
        { item_id: 'osso-pesado', qtd: 1, nome: 'Osso Maciço Contaminado' },
      ],
      faixa_70: [
        { item_id: 'gordura-urso', qtd: 3, nome: 'Gordura de Urso Pestilento' },
        { item_id: 'osso-pesado', qtd: 2, nome: 'Osso Pesado Maculado' },
        { item_id: 'couro-pesado', qtd: 1, nome: 'Couro Rústico Infecto' },
      ],
      faixa_90: [
        { item_id: 'gordura-urso', qtd: 4, nome: 'Pote Puro de Gordura de Urso' },
        { item_id: 'osso-pesado', qtd: 3, nome: 'Osso Pesado Maculado Superior' },
        { item_id: 'couro-pesado', qtd: 2, nome: 'Grande Couro de Urso da Peste' },
      ],
      raro: [{ item_id: 'vesicula-pestilenta', qtd: 1, nome: 'Vesícula Biliar da Peste Negra' }],
    },
    ataques: [
      {
        nome: 'Patada Esmagadora',
        dano: '2d6',
        tipo: 'fisico',
        peso_chance: 70,
        recarga: null,
        efeito: null,
      },
      {
        nome: 'Bafo Pútrido da Peste',
        dano: '1d12',
        tipo: 'magico',
        peso_chance: 30,
        recarga: '5-6',
        efeito: { condicao: 'envenenado', peso_teste: 12 },
      },
    ],
    drops: [
      { item_id: 'gordura_urso', qtd: 2, nome: 'Gordura de Urso Pútrida' },
      { item_id: 'osso_pesado', qtd: 1, nome: 'Osso Pesado Maculado' },
    ],
  },
  {
    id: 'salteador_ermos',
    nome: 'Salteador dos Ermos',
    imagem:
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
    vida: 14,
    defesa: 10,
    ataque_bonus: 1,
    comportamento: 'covarde',
    fuga_em_percent: 50,
    peso_preparo: 6,
    tempo_circulo_ms: 1200,
    num_cortes: 5,
    movimento: false,
    circulos_especiais: [
      { tipo: 'dourado', chance: 0.3, efeito: 'raro' },
      { tipo: 'vermelho', chance: 0.1, efeito: 'perde_item' },
    ],
    espolios: {
      faixa_0: [{ item_id: 'moedas-bronze', qtd: 5, nome: 'Moedas de Bronze Tropeçadas' }],
      faixa_40: [
        { item_id: 'moedas-bronze', qtd: 15, nome: 'Bolsa de Moedas de Bronze' },
        { item_id: 'retalhos-pano', qtd: 2, nome: 'Retalhos de Tecido' },
      ],
      faixa_70: [
        { item_id: 'moedas-bronze', qtd: 25, nome: 'Bolsa Cheia de Bronze' },
        { item_id: 'adaga-enferrujada', qtd: 1, nome: 'Adaga de Salteador' },
        { item_id: 'corda-canhamo', qtd: 1, nome: 'Corda Trançada' },
      ],
      faixa_90: [
        { item_id: 'moedas-prata', qtd: 3, nome: 'Moedas de Prata de Pilhagem' },
        { item_id: 'adaga-enferrujada', qtd: 1, nome: 'Adaga Afiada do Chefe' },
        { item_id: 'cantil-aguardente', qtd: 1, nome: 'Cantil de Aguardente Barata' },
      ],
      raro: [{ item_id: 'mapa-esconderijo', qtd: 1, nome: 'Rascunho de Mapa de Saque' }],
    },
    ataques: [
      {
        nome: 'Golpe Traiçoeiro',
        dano: '1d8',
        tipo: 'fisico',
        peso_chance: 70,
        recarga: null,
        efeito: null,
      },
      {
        nome: 'Disparo de Besta',
        dano: '1d10',
        tipo: 'distancia',
        peso_chance: 30,
        recarga: null,
        efeito: null,
      },
    ],
    drops: [
      { item_id: 'moedas_bronze', qtd: 15, nome: 'Bolsa de Moedas de Bronze' },
      { item_id: 'adaga_enferrujada', qtd: 1, nome: 'Adaga Enferrujada' },
    ],
  },
  {
    id: 'vibora_pantano',
    nome: 'Víbora Venenosa das Brumas',
    imagem:
      'https://images.unsplash.com/photo-1531386151447-fd7640330138?auto=format&fit=crop&w=600&q=80',
    vida: 10,
    defesa: 11,
    ataque_bonus: 2,
    comportamento: 'agressivo',
    fuga_em_percent: null,
    peso_preparo: 10,
    tempo_circulo_ms: 750,
    num_cortes: 6,
    movimento: true,
    circulos_especiais: [
      { tipo: 'dourado', chance: 0.2, efeito: 'raro' },
      { tipo: 'vermelho', chance: 0.35, efeito: 'envenenar' },
    ],
    espolios: {
      faixa_0: [{ item_id: 'escamas-vibora', qtd: 1, nome: 'Escamas Quebradiças de Víbora' }],
      faixa_40: [
        { item_id: 'escamas-vibora', qtd: 2, nome: 'Escamas Úmidas de Víbora' },
        { item_id: 'glandula-veneno', qtd: 1, nome: 'Glândula Tóxica Rasteira' },
      ],
      faixa_70: [
        { item_id: 'escamas-vibora', qtd: 3, nome: 'Escamas Irisadas de Pântano' },
        { item_id: 'glandula-veneno', qtd: 2, nome: 'Frasco de Veneno Puro' },
        { item_id: 'carne-cobra', qtd: 1, nome: 'Carne Fina de Serpente' },
      ],
      faixa_90: [
        { item_id: 'escamas-vibora', qtd: 4, nome: 'Escamas Perfeitas de Víbora' },
        { item_id: 'glandula-veneno', qtd: 3, nome: 'Veneno Concentrado das Brumas' },
        { item_id: 'carne-cobra', qtd: 2, nome: 'Carne Fina de Serpente' },
      ],
      raro: [{ item_id: 'olho-vibora-ancestral', qtd: 1, nome: 'Olho Ámbar da Víbora das Brumas' }],
    },
    ataques: [
      {
        nome: 'Bote Rápido',
        dano: '1d6',
        tipo: 'fisico',
        peso_chance: 80,
        recarga: null,
        efeito: { condicao: 'envenenado', peso_teste: 10 },
      },
      {
        nome: 'Cuspe Corrosivo',
        dano: '1d8',
        tipo: 'magico',
        peso_chance: 20,
        recarga: '5-6',
        efeito: null,
      },
    ],
    drops: [{ item_id: 'glandula_veneno', qtd: 1, nome: 'Glândula de Veneno Puro' }],
  },
  {
    id: 'quimera_brumas',
    nome: 'Horror Alado das Brumas',
    imagem:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    vida: 45,
    defesa: 12,
    ataque_bonus: 4,
    comportamento: 'esperto',
    fuga_em_percent: 20,
    peso_preparo: 14,
    tempo_circulo_ms: 450,
    num_cortes: 9,
    movimento: true,
    circulos_especiais: [
      { tipo: 'dourado', chance: 0.35, efeito: 'raro' },
      { tipo: 'vermelho', chance: 0.25, efeito: 'envenenar' },
    ],
    espolios: {
      faixa_0: [{ item_id: 'pena-quimera', qtd: 1, nome: 'Pena Danificada de Quimera' }],
      faixa_40: [
        { item_id: 'asa-quimera', qtd: 1, nome: 'Membrana de Asa Alada' },
        { item_id: 'garra-quimera', qtd: 2, nome: 'Garras Afiadas de Quimera' },
      ],
      faixa_70: [
        { item_id: 'asa-quimera', qtd: 2, nome: 'Grandes Asas Membranosas' },
        { item_id: 'garra-quimera', qtd: 3, nome: 'Garras Rasgantes de Fera' },
        { item_id: 'coracao-gelido', qtd: 1, nome: 'Coração Gélido Rúnico' },
      ],
      faixa_90: [
        { item_id: 'asa-quimera', qtd: 3, nome: 'Asas Imaculadas do Horror Alado' },
        { item_id: 'garra-quimera', qtd: 4, nome: 'Garras Primordiais' },
        { item_id: 'coracao-gelido', qtd: 2, nome: 'Coração Puro de Gelo Eterno' },
      ],
      raro: [{ item_id: 'cristal-das-brumas', qtd: 1, nome: 'Cristal Espectral das Alturas' }],
    },
    ataques: [
      {
        nome: 'Garras Rasgantes',
        dano: '1d12',
        tipo: 'fisico',
        peso_chance: 50,
        recarga: null,
        efeito: null,
      },
      {
        nome: 'Rajada de Vento Gélido',
        dano: '2d8',
        tipo: 'magico',
        peso_chance: 50,
        recarga: '5-6',
        efeito: { condicao: 'congelado', peso_teste: 13 },
      },
    ],
    drops: [
      { item_id: 'asa_quimera', qtd: 2, nome: 'Asa Membranosa de Quimera' },
      { item_id: 'coracao_gelido', qtd: 1, nome: 'Coração Gélido Antigo' },
    ],
  },
];

/**
 * 7. Buscar lista do Bestiário para o Mestre invocar (com fallback garantido)
 */
export async function buscarBestiario() {
  try {
    const { data, error } = await supabase
      .from('bestiario')
      .select(BESTIARIO_COLS)
      .order('nome', { ascending: true });

    if (!error && data && data.length > 0) {
      return { success: true, bestiario: data };
    }

    // Se o banco estiver vazio ou der erro, tenta semear os defaults em background
    try {
      await supabase.from('bestiario').upsert(DEFAULT_BESTIARIO);
    } catch (_) {}

    return { success: true, bestiario: DEFAULT_BESTIARIO };
  } catch (err) {
    console.warn('[BattleService] Fallback para Bestiário Padrão:', err.message);
    return { success: true, bestiario: DEFAULT_BESTIARIO };
  }
}

/**
 * 8. Inscrição em Tempo Real (Supabase Realtime)
 * Escuta mudanças em batalhas, batalha_participantes e novos registros em batalha_log
 */
export function assinarBatalhaRealtime(batalhaId, callbacks = {}) {
  const { onBatalhaUpdate, onParticipantesUpdate, onNovoLog, onSubscribed } = callbacks;

  const channel = supabase
    .channel(`batalha_realtime_${batalhaId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'batalhas',
        filter: `id=eq.${batalhaId}`,
      },
      (payload) => {
        if (onBatalhaUpdate && payload?.new) onBatalhaUpdate(payload.new);
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'batalha_participantes',
        filter: `batalha_id=eq.${batalhaId}`,
      },
      (payload) => {
        if (onParticipantesUpdate) onParticipantesUpdate(payload);
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'batalha_log',
        filter: `batalha_id=eq.${batalhaId}`,
      },
      (payload) => {
        if (onNovoLog) onNovoLog(payload.new);
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED' && onSubscribed) {
        onSubscribed();
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * 9. Buscar batalha ativa do personagem do jogador
 */
export async function buscarBatalhaAtivaDoPersonagem(personagemId) {
  try {
    if (!personagemId) return null;

    // Buscar participações do personagem em batalhas
    const { data: participacoes, error } = await supabase
      .from('batalha_participantes')
      .select('batalha_id, id, vida_atual, fugiu')
      .eq('personagem_id', personagemId);

    if (error || !participacoes || participacoes.length === 0) return null;

    const batalhaIds = participacoes.map((p) => p.batalha_id);

    // Buscar a batalha MAIS RECENTE do personagem
    const { data: batalhas, error: batErr } = await supabase
      .from('batalhas')
      .select(BATALHA_COLS)
      .in('id', batalhaIds)
      .order('created_at', { ascending: false })
      .limit(1);

    if (batErr || !batalhas || batalhas.length === 0) return null;

    const maisRecente = batalhas[0];

    // Retorna apenas se o combate estiver de fato ativo/em andamento
    if (['ativa', 'preparando', 'pausada'].includes(maisRecente.status)) {
      // Verificar se todos os inimigos já foram derrotados ou fugiram
      try {
        const { data: partesBat } = await supabase
          .from('batalha_participantes')
          .select('tipo, vida_atual, fugiu')
          .eq('batalha_id', maisRecente.id);

        if (partesBat && partesBat.length > 0) {
          const feras = partesBat.filter((p) => p.tipo === 'fera');
          const ferasVivas = feras.filter((f) => Number(f.vida_atual) > 0 && !f.fugiu);

          if (feras.length > 0 && ferasVivas.length === 0) {
            // Feras mortas/fugidas -> combate vencido! Atualiza status no banco e não reabre
            await supabase
              .from('batalhas')
              .update({ status: 'vitoria', updated_at: new Date().toISOString() })
              .eq('id', maisRecente.id);
            return null;
          }

          const herois = partesBat.filter((p) => p.tipo === 'heroi');
          const heroisVivos = herois.filter((h) => Number(h.vida_atual) > 0 && !h.fugiu);
          if (herois.length > 0 && heroisVivos.length === 0) {
            // Todos os heróis caíram -> combate com derrota
            await supabase
              .from('batalhas')
              .update({ status: 'derrota', updated_at: new Date().toISOString() })
              .eq('id', maisRecente.id);
            return null;
          }
        }
      } catch (errCheck) {
        console.warn(
          '[BattleService] Falha ao verificar participantes da batalha ativa:',
          errCheck,
        );
      }

      return maisRecente;
    }

    // Combates finalizados (vitória, fuga, derrota) não devem reabrir após atualização ou recarregamento
    return null;
  } catch (err) {
    console.error('[BattleService] Erro ao buscar batalha ativa do personagem:', err);
    return null;
  }
}

/**
 * 10. Buscar batalhas ativas para o Mestre
 */
export async function buscarBatalhasAtivasMestre() {
  try {
    const { data, error } = await supabase
      .from('batalhas')
      .select(BATALHA_COLS)
      .in('status', ['ativa', 'preparando', 'pausada'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[BattleService] Erro ao buscar batalhas do Mestre:', err);
    return [];
  }
}

/**
 * 11. Escutar batalhas gerais (para detectar quando uma nova batalha inicia)
 */
export function assinarBatalhasGerais(onNovaBatalha) {
  const channel = supabase
    .channel('batalhas_globais_realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'batalhas',
      },
      (payload) => {
        if (onNovaBatalha) onNovaBatalha(payload);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * 12. Atualizar participante (Mestre God-Mode)
 */
export async function dmAtualizarParticipante(participanteId, updates) {
  try {
    const { data, error } = await supabase
      .from('batalha_participantes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', participanteId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, participante: data };
  } catch (err) {
    console.error('[BattleService] Erro ao atualizar participante:', err);
    return { success: false, error: err.message || err };
  }
}

/**
 * 13. Adicionar Fera no meio do combate (Reforços)
 */
export async function dmAdicionarFera(batalhaId, feraBestiario) {
  try {
    const { data: part, error } = await supabase
      .from('batalha_participantes')
      .insert({
        batalha_id: batalhaId,
        tipo: 'fera',
        bestiario_id: feraBestiario.id,
        vida_atual: feraBestiario.vida,
        vida_max: feraBestiario.vida,
        defesa: feraBestiario.defesa,
        iniciativa: Math.floor(Math.random() * 6 + 1) + Math.floor(Math.random() * 6 + 1),
        condicoes: [],
        defendendo: false,
        vantagem_proxima: false,
        desvantagem_proxima: false,
        recargas: {},
        dano_recebido_de: {},
        a_beira: { sucessos: 0, falhas: 0 },
        fugiu: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Adicionar na ordem de turnos
    const { data: batalha } = await supabase
      .from('batalhas')
      .select('ordem_turnos, rodada')
      .eq('id', batalhaId)
      .single();
    if (batalha) {
      const novaOrdem = [...(batalha.ordem_turnos || []), part.id];
      await supabase.from('batalhas').update({ ordem_turnos: novaOrdem }).eq('id', batalhaId);

      await supabase.from('batalha_log').insert({
        batalha_id: batalhaId,
        rodada: batalha.rodada || 1,
        texto: `${obterIconeCriatura(feraBestiario)} REFORÇOS! ${feraBestiario.nome} entrou na batalha!`,
        dados: { reforco_id: part.id },
      });
    }

    return { success: true, participante: part };
  } catch (err) {
    console.error('[BattleService] Erro ao adicionar reforço:', err);
    return { success: false, error: err.message || err };
  }
}

/**
 * 14. Encerrar Batalha (Mestre)
 */
export async function dmEncerrarBatalha(batalhaId, novoStatus = 'vitoria') {
  try {
    const { data, error } = await supabase
      .from('batalhas')
      .update({ status: novoStatus, updated_at: new Date().toISOString() })
      .eq('id', batalhaId)
      .select()
      .single();

    if (error) throw error;

    const texto =
      novoStatus === 'vitoria'
        ? '🏆 O Mestre encerrou a batalha com Vitória dos Heróis!'
        : novoStatus === 'derrota'
          ? '💀 O Mestre encerrou a batalha com Derrota dos Heróis.'
          : '🏃 O Mestre declarou a Fuga dos Heróis.';

    await supabase.from('batalha_log').insert({
      batalha_id: batalhaId,
      rodada: data.rodada || 1,
      texto,
      dados: { status: novoStatus, encerrado_por_mestre: true },
    });

    if (novoStatus === 'vitoria') {
      try {
        await criarEspoliosPendentesParaBatalha(batalhaId);
      } catch (espErr) {
        console.warn('[BattleService] Falha ao criar espólios no encerramento:', espErr);
      }
    }

    // Persiste condições "até tratar" na ficha dos heróis e dissipa condições de cena
    try {
      const { data: partData } = await supabase
        .from('batalha_participantes')
        .select(PARTICIPANTE_COLS)
        .eq('batalha_id', batalhaId);
      if (partData && partData.length > 0) {
        await persistirCondicoesFimDeBatalha(partData);
      }
    } catch (condErr) {
      console.warn('[BattleService] Aviso ao persistir condições pós-batalha:', condErr);
    }

    return { success: true, batalha: data };
  } catch (err) {
    console.error('[BattleService] Erro ao encerrar batalha:', err);
    return { success: false, error: err.message || err };
  }
}

/**
 * 15. Conceder XP aos personagens participantes (Mestre)
 */
export async function dmConcederXP(personagemIds = [], qtdXP = 1) {
  try {
    if (!personagemIds || personagemIds.length === 0) return { success: true };

    for (const charId of personagemIds) {
      const { data: char } = await supabase
        .from('characters')
        .select('xp')
        .eq('id', charId)
        .single();
      const novoXp = (char?.xp || 0) + Number(qtdXP);
      await supabase.from('characters').update({ xp: novoXp }).eq('id', charId);
    }

    return { success: true, qtdXP };
  } catch (err) {
    console.error('[BattleService] Erro ao conceder XP:', err);
    return { success: false, error: err.message || err };
  }
}

/**
 * 16. Buscar criaturas do Catálogo Geral (~1500 feras cadastradas)
 */
export async function buscarCatalogoCriaturas({
  search = '',
  category = '',
  tier = '',
  threatMin = 1,
  threatMax = 10,
  page = 1,
  pageSize = 60,
} = {}) {
  try {
    let query = supabase.from('creature_catalog').select(CREATURE_CATALOG_COLS, { count: 'exact' });
    query = query.eq('archived', false);

    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      query = query.or(`name.ilike.${s},description.ilike.${s},species.ilike.${s}`);
    }
    if (category && category !== 'Todas') {
      query = query.eq('category', category);
    }
    if (tier) {
      query = query.eq('tier', tier);
    }
    if (threatMin > 1) {
      query = query.gte('threat', threatMin);
    }
    if (threatMax < 10) {
      query = query.lte('threat', threatMax);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('threat', { ascending: true })
      .order('name', { ascending: true })
      .range(from, to);

    if (error) throw error;

    let customBestiario = [];
    if (page === 1 && (!category || category === 'Todas' || category === 'Fera')) {
      try {
        let bQuery = supabase.from('bestiario').select(BESTIARIO_COLS);
        if (search && search.trim()) {
          bQuery = bQuery.ilike('nome', `%${search.trim()}%`);
        }
        const { data: bData } = await bQuery;
        if (bData && bData.length > 0) {
          customBestiario = bData.map((b) => ({
            id: b.id,
            nome: b.nome,
            imagem:
              b.imagem || 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=300&q=80',
            vida: Number(b.vida || 14),
            defesa: Number(b.defesa || 9),
            ataque_bonus: Number(b.ataque_bonus || 1),
            comportamento: b.comportamento || 'agressivo',
            fuga_em_percent: b.fuga_em_percent,
            ataques: b.ataques || [{ nome: 'Ataque Feroz', dano: '1d6+1' }],
            drops: b.drops || [],
            threat: 2,
            tier: 'Soldado',
            category: 'Fera',
          }));
        }
      } catch (_) {}
    }

    const catalogFormatted = (data || []).map(formatarCriaturaParaBatalha);
    // Unir criaturas do bestiário customizadas sem duplicar IDs
    const existingIds = new Set(catalogFormatted.map((c) => c.id));
    const uniqueCustom = customBestiario.filter((b) => !existingIds.has(b.id));

    return {
      data: [...uniqueCustom, ...catalogFormatted],
      count: (count || 0) + uniqueCustom.length,
    };
  } catch (err) {
    console.warn('[BattleService] Fallback para Bestiário Padrão:', err.message);
    const filtrados = DEFAULT_BESTIARIO.filter((b) => {
      if (search && !b.nome.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    return { data: filtrados, count: filtrados.length };
  }
}

/**
 * 17. Formata criatura do catálogo para o formato esperado pelo sistema de combate
 */
export function formatarCriaturaParaBatalha(creature) {
  if (!creature) return null;

  // Comportamento
  let comp = (creature.behavior || '').toLowerCase();
  if (!['agressivo', 'cacador', 'vingativo', 'covarde', 'esperto'].includes(comp)) {
    if (creature.threat >= 7 || creature.tier === 'Chefe' || creature.tier === 'Lendário') {
      comp = 'esperto';
    } else if (creature.category === 'Animal' || creature.category === 'Fera') {
      comp = 'cacador';
    } else if (creature.category === 'Criatura da Peste' || creature.category === 'Aberração') {
      comp = 'vingativo';
    } else if (creature.threat <= 2 || creature.tier === 'Lacaio') {
      comp = 'agressivo';
    } else {
      comp = 'agressivo';
    }
  }

  // Fuga: Feras lutam até a morte por padrão; só fogem se configurado explicitamente
  const fuga = typeof creature.fuga_em_percent === 'number' ? creature.fuga_em_percent : null;

  // Ataques
  let ataques = [];
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

  // Drops
  let drops = [];
  if (Array.isArray(creature.loot) && creature.loot.length > 0) {
    drops = creature.loot.map((l) => ({
      item_id: l.item_id || l.id,
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
    nome: creature.name,
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

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE RESOLUÇÃO LOCAL DE BATALHA (GARANTIA DE FUNCIONAMENTO SEMPRE)
// ─────────────────────────────────────────────────────────────────────────────

function rolarDadoLocal(faces = 6) {
  return Math.floor(Math.random() * faces) + 1;
}

function rolarDanoExpressao(expr = '1d8') {
  const match = (expr || '1d8').toLowerCase().match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
  if (!match) {
    const val = rolarDadoLocal(8);
    return { total: val, maximo: 8, detalhe: `${val}` };
  }
  const qtd = Number.parseInt(match[1], 10);
  const faces = Number.parseInt(match[2], 10);
  const bonus = match[3] ? Number.parseInt(match[3], 10) : 0;
  let soma = 0;
  const rolls = [];
  for (let i = 0; i < qtd; i++) {
    const r = rolarDadoLocal(faces);
    rolls.push(r);
    soma += r;
  }
  return {
    total: soma + bonus,
    maximo: qtd * faces + bonus,
    detalhe: `${qtd}d${faces}${bonus > 0 ? `+${bonus}` : ''} (${rolls.join('+')}${bonus > 0 ? `+${bonus}` : ''})`,
  };
}

function rolarTeste2d6Local(temVantagem, temDesvantagem, resultadoFisico) {
  if (
    resultadoFisico &&
    typeof resultadoFisico.d1 === 'number' &&
    typeof resultadoFisico.d2 === 'number'
  ) {
    const d1 = Number(resultadoFisico.d1);
    const d2 = Number(resultadoFisico.d2);
    return {
      d1,
      d2,
      soma: d1 + d2,
      isDuplo6: d1 === 6 && d2 === 6,
      isDuplo1: d1 === 1 && d2 === 1,
      dadosRolados: [d1, d2],
      tipo: 'normal',
    };
  }

  if (temVantagem && temDesvantagem) {
    temVantagem = false;
    temDesvantagem = false;
  }

  if (temVantagem) {
    const r1 = rolarDadoLocal(6);
    const r2 = rolarDadoLocal(6);
    const r3 = rolarDadoLocal(6);
    const ordenados = [r1, r2, r3].sort((a, b) => b - a);
    const d1 = ordenados[0];
    const d2 = ordenados[1];
    return {
      d1,
      d2,
      soma: d1 + d2,
      isDuplo6: d1 === 6 && d2 === 6,
      isDuplo1: d1 === 1 && d2 === 1,
      dadosRolados: [r1, r2, r3],
      descartado: ordenados[2],
      tipo: 'vantagem',
    };
  }

  if (temDesvantagem) {
    const r1 = rolarDadoLocal(6);
    const r2 = rolarDadoLocal(6);
    const r3 = rolarDadoLocal(6);
    const ordenados = [r1, r2, r3].sort((a, b) => a - b);
    const d1 = ordenados[0];
    const d2 = ordenados[1];
    return {
      d1,
      d2,
      soma: d1 + d2,
      isDuplo6: d1 === 6 && d2 === 6,
      isDuplo1: d1 === 1 && d2 === 1,
      dadosRolados: [r1, r2, r3],
      descartado: ordenados[2],
      tipo: 'desvantagem',
    };
  }

  const d1 = rolarDadoLocal(6);
  const d2 = rolarDadoLocal(6);
  return {
    d1,
    d2,
    soma: d1 + d2,
    isDuplo6: d1 === 6 && d2 === 6,
    isDuplo1: d1 === 1 && d2 === 1,
    dadosRolados: [d1, d2],
    tipo: 'normal',
  };
}

/**
 * Resolver de Batalha Local (Executa regras e sincroniza tabelas Supabase com Realtime)
 */
export async function resolverBatalhaLocal(payload) {
  const comando = payload.acao || payload.acao_tipo || payload.comando || 'acao';
  const batalhaId = payload.batalha_id || payload.batalhaId;

  if (!batalhaId) return { success: false, error: 'batalha_id é obrigatório' };

  try {
    // 1. INICIAR BATALHA
    if (comando === 'iniciar') {
      const [{ data: batalhaAtual }, { data: participantes }] = await Promise.all([
        supabase.from('batalhas').select('id, status, ordem_turnos').eq('id', batalhaId).single(),
        supabase
          .from('batalha_participantes')
          .select(PARTICIPANTE_COLS)
          .eq('batalha_id', batalhaId),
      ]);

      if (
        batalhaAtual &&
        batalhaAtual.status === 'ativa' &&
        Array.isArray(batalhaAtual.ordem_turnos) &&
        batalhaAtual.ordem_turnos.length > 0
      ) {
        return { success: true, batalha_id: batalhaId, ordem_turnos: batalhaAtual.ordem_turnos };
      }

      if (!participantes || participantes.length === 0) {
        return { success: false, error: 'Sem participantes' };
      }

      // Buscar fichas dos heróis
      const heroIds = participantes
        .filter((p) => p.tipo === 'heroi')
        .map((p) => p.personagem_id)
        .filter(Boolean);
      const charsMap = {};
      if (heroIds.length > 0) {
        const { data: chars } = await supabase
          .from('characters')
          .select('id, name, attributes, defense')
          .in('id', heroIds);
        chars?.forEach((c) => {
          charsMap[c.id] = c;
        });
      }

      const atualizados = [];
      const logIniciativa = [];
      const updatePromises = [];

      for (const p of participantes) {
        let inic = 0;
        let txt = '';
        if (p.tipo === 'heroi') {
          const char = charsMap[p.personagem_id];
          const astucia = Number(char?.attributes?.astucia || 0);
          const r1 = rolarDadoLocal(6);
          const r2 = rolarDadoLocal(6);
          inic = r1 + r2 + astucia;
          txt = `${char?.name || 'Herói'}: 2d6(${r1}+${r2}) + Astúcia(${astucia}) = ${inic}`;
        } else {
          const r1 = rolarDadoLocal(6);
          const r2 = rolarDadoLocal(6);
          inic = r1 + r2;
          txt = `Fera [${p.id.slice(0, 4)}]: 2d6(${r1}+${r2}) = ${inic}`;
        }

        p.iniciativa = inic;
        atualizados.push(p);

        updatePromises.push(
          supabase
            .from('batalha_participantes')
            .update({
              iniciativa: inic,
              defendendo: false,
              vantagem_proxima: false,
              desvantagem_proxima: false,
              fugiu: false,
              a_beira: { sucessos: 0, falhas: 0 },
            })
            .eq('id', p.id),
        );

        logIniciativa.push(txt);
      }

      // Ordenar iniciativa decrescente
      atualizados.sort((a, b) => {
        if (b.iniciativa !== a.iniciativa) return b.iniciativa - a.iniciativa;
        if (a.tipo === 'heroi' && b.tipo !== 'heroi') return -1;
        if (b.tipo === 'heroi' && a.tipo !== 'heroi') return 1;
        return 0;
      });

      const ordemTurnos = atualizados.map((p) => p.id);

      await Promise.all([
        ...updatePromises,
        supabase
          .from('batalhas')
          .update({
            status: 'ativa',
            rodada: 1,
            turno_index: 0,
            ordem_turnos: ordemTurnos,
            updated_at: new Date().toISOString(),
          })
          .eq('id', batalhaId),
        supabase.from('batalha_log').insert({
          batalha_id: batalhaId,
          rodada: 1,
          texto: `⚔️ O combate começou! Iniciativa rolada:\n${logIniciativa.join(' | ')}`,
          dados: { ordem_turnos: ordemTurnos },
        }),
      ]);

      return { success: true, batalha_id: batalhaId, ordem_turnos: ordemTurnos };
    }

    // 2. AÇÃO DE COMBATE (OTIMIZADA EM LOTE PARALELO)
    if (comando === 'acao') {
      const {
        ator_id,
        atorId,
        tipo,
        alvo_id,
        alvoId,
        dados_extras,
        dadosExtras,
        resultado_fisico,
        resultadoFisico,
      } = payload;
      const idAtor = ator_id || atorId;
      const idAlvo = alvo_id || alvoId;
      const extras = dados_extras || dadosExtras || {};
      const resFisico = resultado_fisico || resultadoFisico;

      // Busca todos os participantes e a batalha em paralelo (1 única viagem de rede)
      const [partRes, batRes] = await Promise.all([
        supabase
          .from('batalha_participantes')
          .select(PARTICIPANTE_COLS)
          .eq('batalha_id', batalhaId),
        supabase.from('batalhas').select(BATALHA_COLS).eq('id', batalhaId).single(),
      ]);

      const todos = partRes.data || [];
      const ator = todos.find((p) => p.id === idAtor);
      if (!ator) return { success: false, error: 'Ator não encontrado' };

      const nomeAtor =
        ator.detalhes?.name ||
        ator.detalhes?.nome ||
        ator.nome ||
        (ator.tipo === 'heroi' ? 'O Herói' : 'A Criatura');

      const batalha = batRes.data;
      const rodada = batalha?.rodada || 1;

      let logTexto = '';
      let sucessoAcao = true;
      const dbWrites = [];
      const atorUpdates = {
        vantagem_proxima: false,
        desvantagem_proxima: false,
      };

      // ── DEFENDER ──
      if (tipo === 'defender') {
        atorUpdates.defendendo = true;
        ator.defendendo = true;
        logTexto = `🛡️ ${ator.tipo === 'heroi' ? 'O herói' : 'A criatura'} assumiu postura defensiva (+2 de Defesa até o próximo turno).`;
        sucessoAcao = true;
      }

      // ── AJUDAR ──
      else if (tipo === 'ajudar') {
        if (idAlvo) {
          const alvoPart = todos.find((p) => p.id === idAlvo);
          if (alvoPart) alvoPart.vantagem_proxima = true;
          dbWrites.push(
            supabase
              .from('batalha_participantes')
              .update({ vantagem_proxima: true })
              .eq('id', idAlvo),
          );
        }
        logTexto = `🤝 Prestou auxílio tático ao aliado (concedeu Vantagem na próxima rolagem).`;
        sucessoAcao = true;
      }

      // ── INVOCAR JURAMENTO ──
      else if (tipo === 'invocar_juramento') {
        atorUpdates.vantagem_proxima = true;
        ator.vantagem_proxima = true;
        logTexto = `🔥 O Juramento ecoou no espírito! Ganhou Vantagem no próximo ataque.`;
        sucessoAcao = true;
      }

      // ── QUEBRAR JURAMENTO ──
      else if (tipo === 'quebrar_juramento') {
        if (ator.personagem_id) {
          const { data: char } = await supabase
            .from('characters')
            .select('plague')
            .eq('id', ator.personagem_id)
            .single();
          const novaPeste = (char?.plague || 0) + 1;
          dbWrites.push(
            supabase.from('characters').update({ plague: novaPeste }).eq('id', ator.personagem_id),
          );
        }
        logTexto = `⚡ QUEBROU O JURAMENTO! A falha foi transmutada em sucesso, mas a Peste cobrou seu preço (+1 Peste).`;
        sucessoAcao = true;
      }

      // ── FUGIR (2d6 + Corpo) ──
      else if (tipo === 'fugir') {
        const roll = rolarTeste2d6Local(ator.vantagem_proxima, ator.desvantagem_proxima, resFisico);
        const mod = Number(extras.atletismo ?? extras.corpo ?? 0);
        const total = roll.soma + mod;
        if (total >= 10) {
          atorUpdates.fugiu = true;
          ator.fugiu = true;
          logTexto = `🏃 Fuga bem-sucedida! Rolou 2d6(${roll.d1}+${roll.d2}) + Corpo(${mod >= 0 ? '+' : ''}${mod}) = ${total} vs Dif 10 e escapou!`;
          sucessoAcao = true;
        } else {
          logTexto = `❌ Falha ao tentar fugir: 2d6(${roll.d1}+${roll.d2}) + Corpo(${mod >= 0 ? '+' : ''}${mod}) = ${total} vs Dif 10! Ficou encurralado.`;
          sucessoAcao = false;
        }
      }

      // ── ROLAR MORTE (À BEIRA) ──
      else if (tipo === 'rolar_morte') {
        const roll = rolarTeste2d6Local(false, false, resFisico);
        const beira = { ...(ator.a_beira || { sucessos: 0, falhas: 0 }) };

        if (roll.isDuplo6) {
          atorUpdates.vida_atual = 1;
          atorUpdates.a_beira = { sucessos: 0, falhas: 0 };
          ator.vida_atual = 1;
          ator.a_beira = { sucessos: 0, falhas: 0 };
          if (ator.personagem_id) {
            dbWrites.push(
              supabase.from('characters').update({ health: 1 }).eq('id', ator.personagem_id),
            );
          }
          logTexto = `⚡ DUPLO 6! Pela força da alma, o herói ergue-se do chão com 1 PV!`;
          sucessoAcao = true;
        } else if (roll.isDuplo1) {
          beira.falhas += 2;
          if (beira.falhas >= 3) {
            logTexto = `💀 DUPLO 1! O corpo cedeu à morte definitiva.`;
          } else {
            logTexto = `⚠️ DUPLO 1! O herói sofreu 2 falhas contra a morte (${beira.falhas}/3).`;
          }
          atorUpdates.a_beira = beira;
          ator.a_beira = beira;
          sucessoAcao = false;
        } else if (roll.soma >= 8) {
          beira.sucessos += 1;
          if (beira.sucessos >= 3) {
            atorUpdates.vida_atual = 1;
            atorUpdates.a_beira = { sucessos: 0, falhas: 0 };
            ator.vida_atual = 1;
            ator.a_beira = { sucessos: 0, falhas: 0 };
            if (ator.personagem_id) {
              dbWrites.push(
                supabase.from('characters').update({ health: 1 }).eq('id', ator.personagem_id),
              );
            }
            logTexto = `✨ 3 SUCESSOS! O herói estabilizou e recuperou a consciência com 1 PV!`;
          } else {
            atorUpdates.a_beira = beira;
            ator.a_beira = beira;
            logTexto = `🛡️ Sucesso contra a morte (${roll.soma} >= 8). Sucessos: ${beira.sucessos}/3.`;
          }
          sucessoAcao = true;
        } else {
          beira.falhas += 1;
          if (beira.falhas >= 3) {
            logTexto = `💀 3 FALHAS! O herói pereceu nas garras de Aldrenor.`;
          } else {
            logTexto = `❌ Falha contra a morte (${roll.soma} < 8). Falhas: ${beira.falhas}/3.`;
          }
          atorUpdates.a_beira = beira;
          ator.a_beira = beira;
          sucessoAcao = false;
        }
      }

      // ── CONJURAÇÃO DE MAGIA (MOTOR COMPLETO DO GRIMÓRIO) ──
      else if (tipo === 'magia') {
        const atorCompleto = { ...ator };
        if (ator.personagem_id) {
          const { data: charData } = await supabase
            .from('characters')
            .select(CHAR_BATTLE_COLS)
            .eq('id', ator.personagem_id)
            .single();
          if (charData) atorCompleto.detalhes = charData;
        }

        const participantesEnriquecidos = todos.map((p) => (p.id === idAtor ? atorCompleto : p));

        let magiaPayload = extras.magia;
        if (!magiaPayload && extras.magia_id) {
          const { data: mDb } = await supabase
            .from('magias')
            .select('*')
            .eq('id', Number(extras.magia_id))
            .single();
          if (mDb) magiaPayload = mDb;
        }

        if (!magiaPayload) {
          magiaPayload = {
            id: extras.id || 1,
            nome: extras.nome || 'Magia Arcana',
            circulo: extras.circulo || 0,
            escola: extras.escola || 'Arcano',
            custo: { foco: Number(extras.custo_foco || 0) },
            resolucao: { tipo: 'ataque' },
            efeitos: [{ bloco: 'dano', valor: extras.dano || '1d8', tipo: 'arcano' }],
          };
        }

        const resMagia = await resolverMagiaMotor({
          batalhaId,
          ator: atorCompleto,
          alvoId: idAlvo,
          alvosIds: extras.alvosIds || (idAlvo ? [idAlvo] : []),
          magia: magiaPayload,
          ampliarEscolhidos: extras.ampliarEscolhidos || [],
          resultadoFisico: resFisico,
          participantes: participantesEnriquecidos,
        });

        if (!resMagia.success) {
          return resMagia;
        }

        if (ator.personagem_id && resMagia.gastoFocoTotal > 0) {
          const focoAtual = Number(atorCompleto.detalhes?.focus || 0);
          const novoFoco = Math.max(0, focoAtual - resMagia.gastoFocoTotal);
          dbWrites.push(
            supabase.from('characters').update({ focus: novoFoco }).eq('id', ator.personagem_id),
          );
        }

        for (const mud of resMagia.mudancasParticipantes || []) {
          if (mud.novaInvocacao) {
            dbWrites.push(supabase.from('batalha_participantes').insert(mud.novaInvocacao));
            continue;
          }
          if (!mud.id) continue;
          const partAlvo = todos.find((p) => p.id === mud.id);
          if (!partAlvo) continue;

          let novaVida = Number(partAlvo.vida_atual);
          const danoAplicado =
            typeof extras.danoCalculado === 'number' &&
            extras.danoCalculado > 0 &&
            mud.danoSofrido > 0
              ? extras.danoCalculado
              : mud.danoSofrido;

          if (danoAplicado > 0) {
            novaVida = Math.max(0, novaVida - danoAplicado);
          }
          if (mud.curaRecebida > 0) {
            novaVida = Math.min(Number(partAlvo.vida_max || 20), novaVida + mud.curaRecebida);
          }

          let novasCondicoes = Array.isArray(partAlvo.condicoes) ? [...partAlvo.condicoes] : [];
          if (mud.condicoesAdd && mud.condicoesAdd.length > 0) {
            for (const cAdd of mud.condicoesAdd) {
              novasCondicoes.push(cAdd);
            }
          }
          if (mud.condicoesRemove && mud.condicoesRemove.length > 0) {
            novasCondicoes = novasCondicoes.filter((c) => {
              const cId = typeof c === 'string' ? c : c.id;
              return !mud.condicoesRemove.includes(cId);
            });
          }

          partAlvo.vida_atual = novaVida;
          partAlvo.condicoes = novasCondicoes;

          dbWrites.push(
            supabase
              .from('batalha_participantes')
              .update({
                vida_atual: novaVida,
                condicoes: novasCondicoes,
              })
              .eq('id', mud.id),
          );

          if (partAlvo.personagem_id) {
            dbWrites.push(
              supabase
                .from('characters')
                .update({ health: novaVida })
                .eq('id', partAlvo.personagem_id),
            );
          }
        }

        for (const l of resMagia.logs) {
          dbWrites.push(
            supabase.from('batalha_log').insert({
              batalha_id: batalhaId,
              rodada,
              texto: l.texto,
              dados: { tipo: l.tipo, ator_id: idAtor, alertaMestre: l.alertaMestre },
            }),
          );
        }

        sucessoAcao = resMagia.acertou;
        logTexto = resMagia.logs[0]?.texto || 'Magia conjurada com sucesso.';
      }

      // ── ITEM DE INVENTÁRIO (BEBER / ARREMESSAR / APLICAR NA ARMA) ──
      else if (tipo === 'item') {
        const itemId = extras.item_id;
        const usoBatalha = extras.uso_batalha || 'beber';
        const nomeItem = extras.nome || 'Consumível';

        // Inferência inteligente: se não veio blocos estruturados, infere a partir do nome/descrição/subcat
        const blocosEfeitos =
          Array.isArray(extras.efeitos) && extras.efeitos.length > 0
            ? [...extras.efeitos]
            : inferirEfeitosPocao(extras);

        if (itemId && ator.personagem_id) {
          dbWrites.push(
            (async () => {
              try {
                const { data: invItem } = await supabase
                  .from('inventory_items')
                  .select('*')
                  .eq('id', itemId)
                  .single();
                if (invItem) {
                  if (invItem.quantity > 1) {
                    await supabase
                      .from('inventory_items')
                      .update({ quantity: invItem.quantity - 1 })
                      .eq('id', itemId);
                  } else {
                    await supabase.from('inventory_items').delete().eq('id', itemId);
                  }
                }
              } catch (_) {}
            })(),
          );
        }

        // 1. BEBER (Poção de Cura, Foco, Fôlego de Fogo, Bálsamo, Tônicos, etc.)
        if (usoBatalha === 'beber') {
          let curaTotal = 0;
          let focoRecuperado = 0;
          const condicoesRemovidas = [];
          const condicoesAplicadas = [];
          let danoOfensivoCausado = 0;
          let alvoOfensivoNome = '';

          for (const ef of blocosEfeitos) {
            // A) CURA DE VIDA
            if (ef.bloco === 'cura') {
              if (ef.valor === 'max') {
                const maxHp = Number(ator.vida_max || 20);
                curaTotal = Math.max(0, maxHp - Number(ator.vida_atual || 0));
              } else {
                const val = rolarFormulaTique(ef.valor || '2d4+2');
                curaTotal += val;
              }
            }
            // B) RECUPERAÇÃO DE FOCO
            else if (ef.bloco === 'cura_foco') {
              const maxFoc = Number(ator.detalhes?.maxFocus || 3);
              const atualFoc = Number(ator.detalhes?.focus || 0);
              const ganho =
                ef.valor === 'max' ? Math.max(0, maxFoc - atualFoc) : Number(ef.valor || 2);
              const novoFoco = Math.min(maxFoc, atualFoc + ganho);
              focoRecuperado += novoFoco - atualFoc;
              if (ator.personagem_id) {
                dbWrites.push(
                  supabase
                    .from('characters')
                    .update({ focus: novoFoco })
                    .eq('id', ator.personagem_id),
                );
              }
            }
            // C) REMOVER CONDIÇÃO
            else if (ef.bloco === 'remover_efeito') {
              const condRemover = ef.condicao;
              ator.condicoes = removerCondicao(ator.condicoes || [], condRemover);
              atorUpdates.condicoes = ator.condicoes;
              condicoesRemovidas.push(condRemover);
            }
            // D) CONDIÇÃO NO PRÓPRIO ATOR (BUFFS COMO INVISIBILIDADE)
            else if (ef.bloco === 'condicao') {
              const resApp = aplicarCondicao(
                ator.condicoes || [],
                ef.condicao,
                ef.pilhas || 1,
                ef.duracao,
                nomeAtor,
              );
              ator.condicoes = resApp.condicoes;
              atorUpdates.condicoes = ator.condicoes;
              condicoesAplicadas.push(ef.condicao);
            }
            // E) VANTAGEM / INSPIRAÇÃO (Tônico da Força, Sorte, etc.)
            else if (ef.bloco === 'vantagem') {
              atorUpdates.vantagem_proxima = true;
              ator.vantagem_proxima = true;
            }
            // F) DEFESA / PELE DE PEDRA
            else if (ef.bloco === 'bonus_defesa') {
              atorUpdates.defendendo = true;
              ator.defendendo = true;
            }
            // G) CARGAS NA ARMA / BÔNUS DE DANO
            else if (ef.bloco === 'cargas_arma') {
              const cargas = Number(ef.cargas || 3);
              ator.cargas_arma = cargas;
              ator.efeito_arma = [
                {
                  bloco: 'bonus',
                  tipo: 'dano',
                  valor: ef.bonusDano || '1d4',
                  elemento: ef.elemento || 'fogo',
                },
              ];
              atorUpdates.cargas_arma = cargas;
              atorUpdates.efeito_arma = ator.efeito_arma;
            }
            // H) DANO OFENSIVO DIRETO (FÔLEGO DE FOGO!)
            else if (ef.bloco === 'dano_ofensivo' || ef.bloco === 'dano') {
              const alvo =
                todos.find((p) => p.id === idAlvo && p.tipo === 'fera') ||
                todos.find((p) => p.tipo === 'fera' && p.vida_atual > 0);
              if (alvo) {
                alvoOfensivoNome =
                  alvo.detalhes?.nome || alvo.detalhes?.name || alvo.nome || 'a Fera';
                const danoBase = rolarFormulaTique(ef.valor || '2d6');
                const tipoElem = ef.tipo || 'fogo';
                const comboRes = avaliarCombosElementais(alvo.condicoes || [], tipoElem, danoBase);
                const danoFinal = comboRes.danoFinal;
                danoOfensivoCausado += danoFinal;

                const vidaAntigaAlvo = Number(alvo.vida_atual || 0);
                const novaVidaAlvo = Math.max(0, vidaAntigaAlvo - danoFinal);
                alvo.vida_atual = novaVidaAlvo;

                let condsAlvo = alvo.condicoes || [];
                for (const cAdd of comboRes.condicoesParaAdicionar) {
                  const resAdd = aplicarCondicao(
                    condsAlvo,
                    cAdd.condicao,
                    cAdd.pilhas || 1,
                    null,
                    nomeAtor,
                  );
                  condsAlvo = resAdd.condicoes;
                }
                alvo.condicoes = condsAlvo;

                dbWrites.push(
                  supabase
                    .from('batalha_participantes')
                    .update({
                      vida_atual: novaVidaAlvo,
                      condicoes: condsAlvo,
                    })
                    .eq('id', alvo.id),
                );

                if (alvo.personagem_id) {
                  dbWrites.push(
                    supabase
                      .from('characters')
                      .update({ health: novaVidaAlvo })
                      .eq('id', alvo.personagem_id),
                  );
                }
              }
            }
            // I) CONDIÇÃO NO ALVO (QUEIMANDO DO FÔLEGO, AMEDRONTADO DA VOZ DE DRAGÃO, ETC.)
            else if (ef.bloco === 'condicao_alvo') {
              const alvo =
                todos.find((p) => p.id === idAlvo && p.tipo === 'fera') ||
                todos.find((p) => p.tipo === 'fera' && p.vida_atual > 0);
              if (alvo) {
                const resApp = aplicarCondicao(
                  alvo.condicoes || [],
                  ef.condicao,
                  ef.pilhas || 1,
                  ef.duracao,
                  nomeAtor,
                );
                alvo.condicoes = resApp.condicoes;
                dbWrites.push(
                  supabase
                    .from('batalha_participantes')
                    .update({ condicoes: alvo.condicoes })
                    .eq('id', alvo.id),
                );
              }
            }
          }

          if (extras.cura_vida && curaTotal === 0) {
            curaTotal = Number(extras.cura_vida);
          }

          if (curaTotal > 0) {
            const vidaAntiga = Number(ator.vida_atual || 0);
            const novaVida = Math.min(Number(ator.vida_max || 20), vidaAntiga + curaTotal);
            atorUpdates.vida_atual = novaVida;
            ator.vida_atual = novaVida;
            if (ator.personagem_id) {
              dbWrites.push(
                supabase
                  .from('characters')
                  .update({ health: novaVida })
                  .eq('id', ator.personagem_id),
              );
            }
          }

          // Montagem da narração no log
          if (danoOfensivoCausado > 0) {
            logTexto = `🔥 [${nomeAtor}] bebeu [${nomeItem}] e EXALOU UM TORRENTE DE FOGO em [${alvoOfensivoNome}]! Causou ${danoOfensivoCausado} de dano flamejante e infligiu [QUEIMANDO]!`;
          } else if (curaTotal > 0) {
            logTexto = `🧪 [${nomeAtor}] bebeu [${nomeItem}] e recuperou +${curaTotal} de Vida (${ator.vida_atual} PV).`;
          } else if (condicoesRemovidas.length > 0) {
            logTexto = `🍶 [${nomeAtor}] tomou [${nomeItem}] e expurgou a condição [${condicoesRemovidas.join(', ').toUpperCase()}]!`;
          } else if (focoRecuperado > 0) {
            logTexto = `✨ [${nomeAtor}] bebeu [${nomeItem}] e recuperou +${focoRecuperado} de Foco mental.`;
          } else if (atorUpdates.vantagem_proxima) {
            logTexto = `💪 [${nomeAtor}] ingeriu [${nomeItem}] e sentiu uma onda de vigor absoluto! (Vantagem na próxima rolagem).`;
          } else if (atorUpdates.defendendo) {
            logTexto = `🛡️ [${nomeAtor}] consumiu [${nomeItem}] e sua pele endureceu como pedra (+Defesa).`;
          } else if (condicoesAplicadas.length > 0) {
            logTexto = `✨ [${nomeAtor}] consumiu [${nomeItem}] e ativou o efeito [${condicoesAplicadas.join(', ').toUpperCase()}]!`;
          } else {
            logTexto = `🧪 [${nomeAtor}] consumiu [${nomeItem}] e absorveu seus efeitos místicos.`;
          }
          sucessoAcao = true;
        }

        // 2. ARREMESSAR (Bombas, Fumaça, Óleo, Água)
        // Regra do motor: 2d6 + Astúcia vs Defesa; errou = metade do dano em área / só condição
        else if (usoBatalha === 'arremessar') {
          const alvo =
            todos.find((p) => p.id === idAlvo) ||
            todos.find((p) => p.tipo === 'fera' && p.vida_atual > 0);
          if (!alvo) return { success: false, error: 'Alvo não encontrado para o arremesso.' };

          let attrs = ator.detalhes?.attributes;
          if (!attrs && ator.personagem_id) {
            try {
              const { data: chAttr } = await supabase
                .from('characters')
                .select('attributes')
                .eq('id', ator.personagem_id)
                .single();
              attrs = chAttr?.attributes;
            } catch (_) {}
          }
          const modAstucia = Number(attrs?.astucia ?? 0);
          const roll = rolarTeste2d6Local(
            ator.vantagem_proxima,
            ator.desvantagem_proxima,
            resFisico,
          );
          const totalAtaque = roll.soma + modAstucia;
          const defesaAlvo = Number(alvo.defesa || 10) + (alvo.defendendo ? 2 : 0);
          const acertou = roll.isDuplo6 ? true : roll.isDuplo1 ? false : totalAtaque >= defesaAlvo;
          sucessoAcao = acertou;

          let danoBase = 0;
          let tipoElemento = 'fogo';
          const condicoesParaAplicar = [];
          const condicoesParaRemover = [];

          for (const ef of blocosEfeitos) {
            if (ef.bloco === 'dano') {
              const val = rolarFormulaTique(ef.valor || '2d6');
              danoBase += val;
              if (ef.tipo) tipoElemento = ef.tipo;
            } else if (ef.bloco === 'condicao') {
              condicoesParaAplicar.push(ef);
            } else if (ef.bloco === 'remover_efeito') {
              condicoesParaRemover.push(ef.condicao);
            }
          }

          let danoCausado = danoBase;
          if (!acertou && danoBase > 0) {
            danoCausado = Math.floor(danoBase / 2); // Metade do dano em área se errar o alvo direto
          }

          // Checagem de combos elementais (ex.: oleado + fogo)
          if (danoCausado > 0) {
            const comboRes = avaliarCombosElementais(
              alvo.condicoes || [],
              tipoElemento,
              danoCausado,
            );
            danoCausado = comboRes.danoFinal;
            for (const cAdd of comboRes.condicoesParaAdicionar) {
              condicoesParaAplicar.push({ condicao: cAdd.condicao, pilhas: cAdd.pilhas });
            }
          }

          const alvoUpdates = {};
          const vidaAntigaAlvo = Number(alvo.vida_atual || 0);
          const novaVidaAlvo = Math.max(0, vidaAntigaAlvo - danoCausado);
          alvoUpdates.vida_atual = novaVidaAlvo;
          alvo.vida_atual = novaVidaAlvo;

          // Aplicação de condições
          let condsAlvoAtual = alvo.condicoes || [];
          for (const cRem of condicoesParaRemover) {
            condsAlvoAtual = removerCondicao(condsAlvoAtual, cRem);
          }
          for (const cApp of condicoesParaAplicar) {
            const resApp = aplicarCondicao(
              condsAlvoAtual,
              cApp.condicao,
              cApp.pilhas || 1,
              cApp.duracao,
              nomeAtor,
            );
            condsAlvoAtual = resApp.condicoes;
          }
          alvoUpdates.condicoes = condsAlvoAtual;
          alvo.condicoes = condsAlvoAtual;

          dbWrites.push(
            supabase.from('batalha_participantes').update(alvoUpdates).eq('id', alvo.id),
          );
          if (alvo.personagem_id) {
            dbWrites.push(
              supabase
                .from('characters')
                .update({ health: novaVidaAlvo })
                .eq('id', alvo.personagem_id),
            );
          }

          const nomeAlvo = alvo.detalhes?.name || alvo.detalhes?.nome || alvo.nome || 'Inimigo';
          if (acertou) {
            logTexto = `💣 [${nomeAtor}] arremessou [${nomeItem}] com precisão em [${nomeAlvo}]! (2d6(${roll.d1}+${roll.d2})+Ast(${modAstucia}) = ${totalAtaque} vs Def ${defesaAlvo}) — Causou ${danoCausado} de dano! (${vidaAntigaAlvo} ➔ ${novaVidaAlvo} PV).`;
          } else {
            logTexto = `💥 [${nomeAtor}] arremessou [${nomeItem}] próximo a [${nomeAlvo}] (${totalAtaque} vs Def ${defesaAlvo})! Estilhaço em área causou ${danoCausado} de dano (${vidaAntigaAlvo} ➔ ${novaVidaAlvo} PV) e aplicou os efeitos!`;
          }
        }

        // 3. APLICAR NA ARMA (Óleo de lâmina corrosivo, etc.)
        else if (usoBatalha === 'aplicar_arma') {
          const cargas = Number(extras.cargas || extras.cargas_na_arma || 3);
          ator.cargas_arma = cargas;
          ator.efeito_arma = blocosEfeitos;
          atorUpdates.cargas_arma = cargas;
          atorUpdates.efeito_arma = blocosEfeitos;
          logTexto = `🗡️ [${nomeAtor}] untou sua lâmina com [${nomeItem}]! (+1d6 ácido e corroído pelos próximos ${cargas} ataques).`;
          sucessoAcao = true;
        }
      }

      // ── ATAQUE OU HABILIDADE MARCIAL (Arma de Mão: 2d6 + Corpo | Arma de Atirar: 2d6 + Astúcia) ──
      else if (tipo === 'ataque' || tipo === 'habilidade') {
        const alvo = todos.find((p) => p.id === idAlvo);
        if (!alvo) return { success: false, error: 'Alvo não encontrado' };

        const roll = rolarTeste2d6Local(ator.vantagem_proxima, ator.desvantagem_proxima, resFisico);
        const isDistancia = extras.tipo_ataque === 'distancia';
        const nomeAtributo = extras.atributo_nome || (isDistancia ? 'Astúcia' : 'Corpo');

        let bonusAtaque = Number(extras.bonus ?? extras.arma_bonus ?? Number.NaN);
        if (Number.isNaN(bonusAtaque)) {
          let attrs = ator.detalhes?.attributes;
          if (!attrs && ator.personagem_id) {
            try {
              const { data: chAttr } = await supabase
                .from('characters')
                .select('attributes')
                .eq('id', ator.personagem_id)
                .single();
              attrs = chAttr?.attributes;
            } catch (_) {}
          }
          bonusAtaque = isDistancia
            ? Number(attrs?.astucia ?? attrs?.destreza ?? 0)
            : Number(attrs?.corpo ?? 0);
        }

        const totalAtaque = roll.soma + bonusAtaque;
        const defesaAlvo = Number(alvo.defesa || 10) + (alvo.defendendo ? 2 : 0);
        const acertou = roll.isDuplo6 ? true : roll.isDuplo1 ? false : totalAtaque >= defesaAlvo;
        sucessoAcao = acertou;

        const formulaStr = `2d6(${roll.d1}+${roll.d2}) + ${nomeAtributo}(${bonusAtaque >= 0 ? '+' : ''}${bonusAtaque}) = ${totalAtaque} vs Bloqueio ${defesaAlvo}`;

        if (acertou) {
          const updatesAlvo = {};
          let danoCalc = 0;
          let detalheDano = '';

          if (typeof extras.danoCalculado === 'number' && extras.danoCalculado > 0) {
            danoCalc = extras.danoCalculado;
            detalheDano = roll.isDuplo6
              ? `CRÍTICO (${danoCalc})`
              : `${extras.dano || '1d8'} (${danoCalc})`;
          } else if (roll.isDuplo6) {
            const danoNormal = rolarDanoExpressao(extras.dano || '1d8');
            const extraRoll = rolarDanoExpressao(extras.dano || '1d8');
            danoCalc = danoNormal.maximo + extraRoll.total;
            detalheDano = `CRÍTICO MÁXIMO (${danoNormal.maximo}) + ROLAGEM EXTRA (${extraRoll.total}) = ${danoCalc}`;
          } else {
            const resDano = rolarDanoExpressao(extras.dano || '1d8');
            danoCalc = resDano.total;
            detalheDano = resDano.detalhe;
          }

          // Bônus de Lâmina Revestida com Óleo (se ativo)
          let bonusOleoTxt = '';
          if (ator.cargas_arma && ator.cargas_arma > 0) {
            const extraDanoOleo = rolarFormulaTique('1d6');
            danoCalc += extraDanoOleo;
            detalheDano += ` + Ácido (${extraDanoOleo})`;
            ator.cargas_arma -= 1;
            atorUpdates.cargas_arma = ator.cargas_arma;
            const resCorroido = aplicarCondicao(
              alvo.condicoes || [],
              'corroido',
              1,
              null,
              nomeAtor,
            );
            updatesAlvo.condicoes = resCorroido.condicoes;
            alvo.condicoes = resCorroido.condicoes;
            bonusOleoTxt = ` [🗡️ Óleo Corrosivo ativado (+${extraDanoOleo} ácido e Corroído no alvo! Cargas restantes: ${ator.cargas_arma})]`;
          }

          const novaVida = Math.max(0, Number(alvo.vida_atual) - danoCalc);
          updatesAlvo.vida_atual = novaVida;
          alvo.vida_atual = novaVida;

          const historicoDano = { ...(alvo.dano_recebido_de || {}) };
          historicoDano[idAtor] = (historicoDano[idAtor] || 0) + danoCalc;
          updatesAlvo.dano_recebido_de = historicoDano;
          alvo.dano_recebido_de = historicoDano;

          if (novaVida === 0 && alvo.tipo === 'heroi') {
            updatesAlvo.a_beira = { sucessos: 0, falhas: 0 };
            alvo.a_beira = { sucessos: 0, falhas: 0 };
          }

          dbWrites.push(
            supabase.from('batalha_participantes').update(updatesAlvo).eq('id', idAlvo),
          );

          if (alvo.personagem_id) {
            dbWrites.push(
              supabase.from('characters').update({ health: novaVida }).eq('id', alvo.personagem_id),
            );
          }

          logTexto = `⚔️ ${extras.nome || 'Ataque'} ACERTOU! [${formulaStr}] — Dano: ${danoCalc} [${detalheDano}]${bonusOleoTxt}.`;
        } else {
          if (roll.isDuplo1) {
            alvo.vantagem_proxima = true;
            dbWrites.push(
              supabase
                .from('batalha_participantes')
                .update({ vantagem_proxima: true })
                .eq('id', idAlvo),
            );
            logTexto = `⚠️ DUPLO 1! [${formulaStr}] — O golpe errou grotescamente e o inimigo ganhou Vantagem no próximo ataque!`;
          } else {
            logTexto = `🛡️ ${extras.nome || 'Ataque'} BLOQUEADO! [${formulaStr}].`;
          }
        }

        if (extras.custo_foco && ator.personagem_id) {
          dbWrites.push(
            (async () => {
              const { data: ch } = await supabase
                .from('characters')
                .select('focus')
                .eq('id', ator.personagem_id)
                .single();
              const novoFoco = Math.max(0, (ch?.focus || 0) - Number(extras.custo_foco));
              await supabase
                .from('characters')
                .update({ focus: novoFoco })
                .eq('id', ator.personagem_id);
            })(),
          );
        }
      }

      // Atualiza o ator e grava o log principal em paralelo
      ator.vantagem_proxima = Boolean(atorUpdates.vantagem_proxima);
      ator.desvantagem_proxima = Boolean(atorUpdates.desvantagem_proxima);
      dbWrites.push(supabase.from('batalha_participantes').update(atorUpdates).eq('id', idAtor));

      if (tipo !== 'magia' && logTexto) {
        dbWrites.push(
          supabase.from('batalha_log').insert({
            batalha_id: batalhaId,
            rodada,
            texto: logTexto,
            dados: { tipo, ator_id: idAtor, sucesso: sucessoAcao },
          }),
        );
      }

      // Verificar condições de Vitória / Derrota imediatamente em memória (0ms extra)
      const ferasVivas = todos.filter((p) => p.tipo === 'fera' && p.vida_atual > 0 && !p.fugiu);
      const ferasMortas = todos.filter((p) => p.tipo === 'fera' && Number(p.vida_atual) <= 0);
      const todasFeras = todos.filter((p) => p.tipo === 'fera');
      const heroisVivos = todos.filter((p) => p.tipo === 'heroi' && p.vida_atual > 0 && !p.fugiu);

      if (ferasVivas.length === 0) {
        const todasFugiram =
          todasFeras.length > 0 &&
          ferasMortas.length === 0 &&
          todasFeras.every((p) => p.fugiu && Number(p.vida_atual) > 0);
        const statusFinal = todasFugiram ? 'fuga' : 'vitoria';
        dbWrites.push(
          supabase
            .from('batalhas')
            .update({ status: statusFinal, updated_at: new Date().toISOString() })
            .eq('id', batalhaId),
          supabase.from('batalha_log').insert({
            batalha_id: batalhaId,
            rodada,
            texto: todasFugiram
              ? `🏃 As criaturas fugiram para a escuridão dos Ermos! O combate cessou sem despojos.`
              : `🏆 VITÓRIA! As feras foram derrotadas pelos Jurados!`,
            dados: { fim: statusFinal },
          }),
        );
        await Promise.all(dbWrites);
        // Persistir condições "até tratar" nos personagens e dissipar cena
        try {
          await persistirCondicoesFimDeBatalha(todos);
        } catch (_) {}

        if (ferasMortas.length > 0) {
          criarEspoliosPendentesParaBatalha(batalhaId).catch((espErr) => {
            console.warn('[BattleService] Falha ao criar espólios na vitória automática:', espErr);
          });
        }
        return { success: true, acertou: sucessoAcao, fim: statusFinal };
      }

      if (heroisVivos.length === 0) {
        dbWrites.push(
          supabase
            .from('batalhas')
            .update({ status: 'derrota', updated_at: new Date().toISOString() })
            .eq('id', batalhaId),
          supabase.from('batalha_log').insert({
            batalha_id: batalhaId,
            rodada,
            texto: `💀 DERROTA! O grupo de Jurados sucumbiu na escuridão.`,
            dados: { fim: 'derrota' },
          }),
        );
        await Promise.all(dbWrites);
        try {
          await persistirCondicoesFimDeBatalha(todos);
        } catch (_) {}
        return { success: true, acertou: sucessoAcao, fim: 'derrota' };
      }

      const naoAvancar = Boolean(
        payload.nao_avancar_turno || extras.nao_avancar_turno || tipo === 'quebrar_juramento',
      );
      let turnoInfo = null;
      if (!naoAvancar) {
        turnoInfo = prepararAvancoTurnoEmMemoria(batalhaId, batalha, todos, dbWrites);
      }

      await Promise.all(dbWrites);

      return {
        success: true,
        acertou: sucessoAcao,
        log: logTexto,
        aguardarTurno: naoAvancar,
        novoIndex: turnoInfo?.novoIndex,
        novaRodada: turnoInfo?.novaRodada,
      };
    }

    // 3. PRÓXIMO TURNO
    if (comando === 'proximo_turno') {
      return await avancarTurnoLocal(batalhaId);
    }

    // 4. TURNO DA FERA
    if (comando === 'turno_fera') {
      const feraId = payload.fera_id || payload.participante_id;
      const extrasFera = payload.dados_extras || {};
      const alvoIdOverride = payload.alvo_id || payload.alvoId || extrasFera.alvoId || null;
      return await resolverTurnoFeraLocal(
        batalhaId,
        feraId,
        alvoIdOverride,
        null,
        null,
        extrasFera,
      );
    }

    return { success: true };
  } catch (err) {
    console.error('[BattleService] Erro no motor local:', err);
    return { success: false, error: err.message || err };
  }
}

/**
 * Calcula o próximo turno em memória e anexa os updates no array dbWrites para execução em 1 único lote paralelo
 */
function prepararAvancoTurnoEmMemoria(batalhaId, batalha, participantes, dbWrites) {
  if (
    !batalha ||
    batalha.status !== 'ativa' ||
    !batalha.ordem_turnos ||
    batalha.ordem_turnos.length === 0
  ) {
    return null;
  }

  const partMap = {};
  participantes?.forEach((p) => {
    partMap[p.id] = p;
  });

  const ordem = batalha.ordem_turnos;
  let novoIndex = Number(batalha.turno_index || 0) + 1;
  let novaRodada = Number(batalha.rodada || 1);

  let tentativas = 0;
  while (tentativas < ordem.length * 2) {
    if (novoIndex >= ordem.length) {
      novoIndex = 0;
      novaRodada += 1;
    }

    const proxId = ordem[novoIndex];
    const proxPart = partMap[proxId];

    if (proxPart && !proxPart.fugiu) {
      if (proxPart.tipo === 'heroi') {
        break;
      } else if (proxPart.tipo === 'fera' && proxPart.vida_atual > 0) {
        break;
      }
    }

    novoIndex++;
    tentativas++;
  }

  batalha.turno_index = novoIndex;
  batalha.rodada = novaRodada;

  const combatenteVez = partMap[ordem[novoIndex]];
  const isFeraViva = Boolean(
    combatenteVez && combatenteVez.tipo === 'fera' && combatenteVez.vida_atual > 0,
  );

  dbWrites.push(
    supabase
      .from('batalhas')
      .update({
        turno_index: novoIndex,
        rodada: novaRodada,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batalhaId),
  );

  if (combatenteVez && combatenteVez.defendendo) {
    combatenteVez.defendendo = false;
    dbWrites.push(
      supabase
        .from('batalha_participantes')
        .update({ defendendo: false })
        .eq('id', combatenteVez.id),
    );
  }

  // ── MOTOR DE CONDIÇÕES: PROCESSAR TIQUE NO INÍCIO DO TURNO ──
  if (combatenteVez && !combatenteVez.fugiu && Number(combatenteVez.vida_atual) > 0) {
    const tiqueRes = processarTiqueInicioTurno(combatenteVez, combatenteVez.detalhes?.attributes);
    if (tiqueRes) {
      if (
        tiqueRes.danoTotalTique > 0 ||
        tiqueRes.curaTotalTique > 0 ||
        tiqueRes.logsTique.length > 0
      ) {
        combatenteVez.vida_atual = tiqueRes.novaVida;
        combatenteVez.condicoes = tiqueRes.novasCondicoes;
        dbWrites.push(
          supabase
            .from('batalha_participantes')
            .update({
              vida_atual: tiqueRes.novaVida,
              condicoes: tiqueRes.novasCondicoes,
            })
            .eq('id', combatenteVez.id),
        );
        if (combatenteVez.personagem_id) {
          dbWrites.push(
            supabase
              .from('characters')
              .update({ health: tiqueRes.novaVida })
              .eq('id', combatenteVez.personagem_id),
          );
        }
        for (const logTxt of tiqueRes.logsTique) {
          dbWrites.push(
            supabase.from('batalha_log').insert({
              batalha_id: batalhaId,
              rodada: novaRodada,
              texto: logTxt,
              dados: {
                tipo: 'tique_condicao',
                participante_id: combatenteVez.id,
                dano: tiqueRes.danoTotalTique,
                cura: tiqueRes.curaTotalTique,
              },
            }),
          );
        }
      }
    }
  }

  return { novoIndex, novaRodada, combatenteVez, isFeraViva };
}

/**
 * Avança o turno da batalha e pula mortos/fugidos (Otimizado com dados em memória e escritas paralelas)
 */
async function avancarTurnoLocal(batalhaId, cachedBatalha = null, cachedParticipantes = null) {
  let batalha = cachedBatalha;
  let participantes = cachedParticipantes;

  if (!batalha || !participantes) {
    const [batRes, partRes] = await Promise.all([
      batalha
        ? Promise.resolve({ data: batalha })
        : supabase.from('batalhas').select(BATALHA_COLS).eq('id', batalhaId).single(),
      participantes
        ? Promise.resolve({ data: participantes })
        : supabase
            .from('batalha_participantes')
            .select(PARTICIPANTE_COLS)
            .eq('batalha_id', batalhaId),
    ]);
    batalha = batRes.data;
    participantes = partRes.data;
  }

  const writes = [];
  const turnoInfo = prepararAvancoTurnoEmMemoria(batalhaId, batalha, participantes, writes);
  if (!turnoInfo) return { success: false };

  await Promise.all(writes);

  return { success: true, novoIndex: turnoInfo.novoIndex, novaRodada: turnoInfo.novaRodada };
}

const batalhasEmProcessamentoFera = new Set();
const heroNameCache = new Map();

/**
 * Executa o turno da Fera em duas fases opcionais:
 * - opcoes.apenasSimular === true: calcula o ataque da fera em memória sem gravar no banco, retornando os dados para a Narração Elden Ring (2s)
 * - opcoes.simulacao: aplica o dano pré-calculado no banco e avança o turno após o término da narração
 */
async function resolverTurnoFeraLocal(
  batalhaId,
  feraId,
  alvoIdOverride = null,
  cachedBatalha = null,
  cachedParticipantes = null,
  opcoes = {},
) {
  const apenasSimular = Boolean(opcoes?.apenasSimular);
  const simulacaoPrevia = opcoes?.simulacao || null;

  if (!apenasSimular && batalhasEmProcessamentoFera.has(batalhaId)) {
    return { success: false, motivo: 'ja_em_processamento' };
  }

  try {
    let batalha = cachedBatalha;
    let todosParticipantes = cachedParticipantes;

    if (!batalha || !todosParticipantes) {
      const [batRes, partRes] = await Promise.all([
        supabase.from('batalhas').select(BATALHA_COLS).eq('id', batalhaId).single(),
        supabase
          .from('batalha_participantes')
          .select(PARTICIPANTE_COLS)
          .eq('batalha_id', batalhaId),
      ]);
      batalha = batRes.data;
      todosParticipantes = partRes.data || [];
    }

    const fera = todosParticipantes.find((p) => p.id === feraId);

    if (!batalha || batalha.status !== 'ativa') return { success: false };

    const combatenteAtualId = (batalha.ordem_turnos || [])[batalha.turno_index || 0];
    if (combatenteAtualId !== feraId) {
      return { success: false, motivo: 'turno_incompativel' };
    }

    if (!fera || fera.vida_atual <= 0 || fera.fugiu) {
      if (apenasSimular) return { success: false, motivo: 'fera_inativa' };
      return await avancarTurnoLocal(batalhaId, batalha, todosParticipantes);
    }

    if (!apenasSimular) {
      batalhasEmProcessamentoFera.add(batalhaId);
    }

    // Buscar ficha detalhada da fera via cache em memória
    let infoFera =
      beastMetadataCache.get(fera.bestiario_id) ||
      DEFAULT_BESTIARIO.find((b) => b.id === fera.bestiario_id);
    if (!infoFera && fera.bestiario_id) {
      try {
        const { data: bDb } = await supabase
          .from('bestiario')
          .select(BESTIARIO_COLS)
          .eq('id', fera.bestiario_id)
          .single();
        if (bDb) {
          infoFera = bDb;
          beastMetadataCache.set(fera.bestiario_id, infoFera);
        }
      } catch (_) {}
    }
    if (!infoFera && fera.bestiario_id) {
      try {
        const { data: cDb } = await supabase
          .from('creature_catalog')
          .select(CREATURE_CATALOG_COLS)
          .eq('id', fera.bestiario_id)
          .single();
        if (cDb) {
          infoFera = formatarCriaturaParaBatalha(cDb);
          beastMetadataCache.set(fera.bestiario_id, infoFera);
        }
      } catch (_) {}
    }
    if (!infoFera) {
      infoFera = {
        nome: 'Fera Ancestral',
        comportamento: 'agressivo',
        ataques: [{ nome: 'Mordida Voraz', dano: '1d8', tipo: 'fisico', peso_chance: 100 }],
      };
    }

    const comportamento = (infoFera.comportamento || 'agressivo').toLowerCase();

    // 1. CHECAGEM DE FUGA
    const fugaPct =
      typeof infoFera.fuga_em_percent === 'number' && infoFera.fuga_em_percent > 0
        ? infoFera.fuga_em_percent
        : null;
    const vaiFugir = simulacaoPrevia
      ? Boolean(simulacaoPrevia.fugiu)
      : Boolean(
          fugaPct &&
            Number(fera.vida_atual) > 0 &&
            Number(fera.vida_atual) <= fera.vida_max * (fugaPct / 100),
        );

    if (vaiFugir) {
      if (apenasSimular) {
        return {
          success: true,
          simulado: true,
          narracaoTitulo: 'FUGA DA FERA',
          narracaoSubtitulo: `${infoFera.nome} sentiu a morte iminente e recuou para a escuridão dos Ermos!`,
          narracaoCor: '#f59e0b',
          simulacao: { fugiu: true },
        };
      }
      fera.fugiu = true;
      const iconeFera = obterIconeCriatura(infoFera);
      const fugaWrites = [
        supabase.from('batalha_participantes').update({ fugiu: true }).eq('id', feraId),
        supabase.from('batalha_log').insert({
          batalha_id: batalhaId,
          rodada: batalha.rodada || 1,
          texto: `${iconeFera} ${infoFera.nome} sentiu a morte iminente e fugiu para a escuridão dos Ermos!`,
          dados: { fugiu: true, tipo: 'fuga_fera', fera_id: feraId },
        }),
      ];
      const turnoInfo = prepararAvancoTurnoEmMemoria(
        batalhaId,
        batalha,
        todosParticipantes,
        fugaWrites,
      );
      await Promise.all(fugaWrites);
      return { success: true, novoIndex: turnoInfo?.novoIndex, novaRodada: turnoInfo?.novaRodada };
    }

    // 2. RECARGAS DE HABILIDADES NO INÍCIO DO TURNO
    const recargasAtuais = simulacaoPrevia?.recargasAtuais
      ? { ...simulacaoPrevia.recargasAtuais }
      : { ...(fera.recargas || {}) };
    const logsRecarga = simulacaoPrevia?.logsRecarga ? [...simulacaoPrevia.logsRecarga] : [];

    if (!simulacaoPrevia) {
      for (const atkNome of Object.keys(recargasAtuais)) {
        if (recargasAtuais[atkNome] === 'em_recarga') {
          const dadoRecarga = rolarDadoLocal(6);
          if (dadoRecarga >= 5) {
            delete recargasAtuais[atkNome];
            logsRecarga.push(`🔄 O ataque especial [${atkNome}] de ${infoFera.nome} recarregou!`);
          }
        }
      }
    }

    // 3. SELEÇÃO INTELIGENTE DE ALVO EM MEMÓRIA
    const todosHerois = todosParticipantes.filter((p) => p.tipo === 'heroi' && !p.fugiu);

    if (todosHerois.length === 0) {
      return await avancarTurnoLocal(batalhaId, batalha, todosParticipantes);
    }

    const heroisConscientes = todosHerois.filter((h) => h.vida_atual > 0);
    const candidatos = heroisConscientes.length > 0 ? heroisConscientes : todosHerois;

    let alvo = null;
    if (simulacaoPrevia?.alvoId) {
      alvo = todosHerois.find((h) => h.id === simulacaoPrevia.alvoId) || candidatos[0];
    } else if (alvoIdOverride) {
      alvo = candidatos.find((h) => h.id === alvoIdOverride) || candidatos[0];
    } else if (comportamento === 'agressivo') {
      alvo = [...candidatos].sort(
        (a, b) => a.defesa + (a.defendendo ? 2 : 0) - (b.defesa + (b.defendendo ? 2 : 0)),
      )[0];
    } else if (comportamento === 'cacador') {
      alvo = [...candidatos].sort(
        (a, b) => a.vida_atual / (a.vida_max || 1) - b.vida_atual / (b.vida_max || 1),
      )[0];
    } else if (comportamento === 'vingativo') {
      const historico = fera.dano_recebido_de || {};
      let maxDano = -1;
      let vilao = null;
      for (const h of candidatos) {
        const d = Number(historico[h.id] || 0);
        if (d > maxDano) {
          maxDano = d;
          vilao = h;
        }
      }
      alvo =
        vilao && maxDano > 0 ? vilao : candidatos[Math.floor(Math.random() * candidatos.length)];
    } else if (comportamento === 'esperto') {
      alvo = [...candidatos].sort((a, b) => b.vida_atual - a.vida_atual)[0];
    } else {
      alvo = candidatos[Math.floor(Math.random() * candidatos.length)];
    }

    if (!alvo) alvo = candidatos[0];

    // Buscar nome real do herói com cache em memória (evita consulta repetida ao banco)
    let nomeAlvo =
      simulacaoPrevia?.nomeAlvo ||
      alvo.detalhes?.name ||
      alvo.detalhes?.nome ||
      heroNameCache.get(alvo.personagem_id) ||
      'Jurado';
    if (nomeAlvo === 'Jurado' && alvo.personagem_id) {
      try {
        const { data: char } = await supabase
          .from('characters')
          .select('name')
          .eq('id', alvo.personagem_id)
          .single();
        if (char?.name) {
          nomeAlvo = char.name;
          heroNameCache.set(alvo.personagem_id, nomeAlvo);
        }
      } catch (_) {}
    }

    // 4. ESCOLHA DO ATAQUE SEGUNDO O ARQUÉTIPO
    let ataqueEscolhido = simulacaoPrevia?.ataqueEscolhido;
    if (!ataqueEscolhido) {
      const ataques = infoFera.ataques || [
        { nome: 'Golpe Voraz', dano: '1d8', tipo: 'fisico', peso_chance: 70 },
        { nome: 'Investida Feroz', dano: '1d10', tipo: 'fisico', peso_chance: 30, recarga: '5-6' },
      ];

      const ataquesDisponiveis = ataques.filter((atk) => {
        if (atk.recarga && recargasAtuais[atk.nome] === 'em_recarga') return false;
        return true;
      });

      const poolAtaques = ataquesDisponiveis.length > 0 ? ataquesDisponiveis : ataques;
      ataqueEscolhido = poolAtaques[0];

      if (comportamento === 'esperto') {
        const especial = poolAtaques.find((a) => a.recarga || a.efeito);
        ataqueEscolhido = especial || poolAtaques[0];
      } else if (comportamento === 'agressivo') {
        ataqueEscolhido =
          [...poolAtaques].sort((a, b) => (b.dano > a.dano ? 1 : -1))[0] || poolAtaques[0];
      } else {
        const totalPeso = poolAtaques.reduce((acc, a) => acc + (Number(a.peso_chance) || 10), 0);
        let r = Math.random() * totalPeso;
        for (const atk of poolAtaques) {
          const p = Number(atk.peso_chance) || 10;
          if (r < p) {
            ataqueEscolhido = atk;
            break;
          }
          r -= p;
        }
      }

      if (ataqueEscolhido.recarga) {
        recargasAtuais[ataqueEscolhido.nome] = 'em_recarga';
      }
    }

    // 5. ROLAGEM DE ATAQUE DA FERA PARA QUEBRAR O BLOQUEIO (2d6 + Ataque da Fera vs Bloqueio/Defesa)
    const roll =
      simulacaoPrevia?.roll ||
      rolarTeste2d6Local(Boolean(fera.vantagem_proxima), Boolean(fera.desvantagem_proxima), null);
    const bonusAtaque =
      simulacaoPrevia?.bonusAtaque !== undefined
        ? Number(simulacaoPrevia.bonusAtaque)
        : Number(
            ataqueEscolhido?.ataque_bonus ??
              ataqueEscolhido?.bonus ??
              infoFera?.ataque_bonus ??
              infoFera?.attack_bonus ??
              (fera.defesa > 10 ? 2 : 1),
          );
    const totalAtaque = roll.soma + bonusAtaque;
    const baseDefesaAlvo = Number(
      opcoes?.defesaHeroiMap?.[alvo.id] ?? alvo.defesa ?? alvo.detalhes?.defense ?? 10,
    );
    const defesaAlvo =
      simulacaoPrevia?.defesaAlvo !== undefined
        ? Number(simulacaoPrevia.defesaAlvo)
        : baseDefesaAlvo + (alvo.defendendo ? 2 : 0);

    const isCrit = roll.isDuplo6;
    const isFumble = roll.isDuplo1;
    const acertou = isCrit ? true : isFumble ? false : totalAtaque >= defesaAlvo;

    let danoTotal = 0;
    if (acertou) {
      if (simulacaoPrevia?.danoTotal !== undefined) {
        danoTotal = simulacaoPrevia.danoTotal;
      } else {
        const resDano = rolarDanoExpressao(ataqueEscolhido.dano || '1d8');
        danoTotal = resDano.total;
        if (isCrit) {
          danoTotal *= 2;
        }
      }
    }

    const formulaFera = `2d6(${roll.d1}+${roll.d2}) + Ataque(${bonusAtaque >= 0 ? '+' : ''}${bonusAtaque}) = ${totalAtaque} vs Bloqueio ${defesaAlvo}`;

    if (apenasSimular) {
      const narracaoTitulo = isCrit
        ? 'GOLPE DEVASTADOR'
        : acertou
          ? 'BLOQUEIO QUEBRADO'
          : isFumble
            ? 'FALHA DA FERA'
            : 'ATAQUE BLOQUEADO';
      const narracaoSubtitulo = acertou
        ? `${infoFera.nome} usou ${ataqueEscolhido.nome} [${formulaFera}] — Quebrou o bloqueio de ${nomeAlvo} e causou ${danoTotal} de dano!`
        : `${infoFera.nome} investiu com ${ataqueEscolhido.nome} [${formulaFera}], mas não quebrou o bloqueio de ${nomeAlvo}!`;
      const narracaoCor = isCrit ? '#ef4444' : acertou ? '#f87171' : '#94a3b8';

      return {
        success: true,
        simulado: true,
        narracaoTitulo,
        narracaoSubtitulo,
        narracaoCor,
        simulacao: {
          alvoId: alvo.id,
          nomeAlvo,
          nomeFera: infoFera.nome,
          ataqueEscolhido,
          roll,
          bonusAtaque,
          totalAtaque,
          defesaAlvo,
          acertou,
          isCrit,
          isFumble,
          danoTotal,
          fugiu: false,
          recargasAtuais,
          logsRecarga,
        },
      };
    }

    let logTexto = '';
    const dbWrites = [];

    if (acertou) {
      const vidaAntiga = Number(alvo.vida_atual);
      const novaVida = Math.max(0, vidaAntiga - danoTotal);

      const updatesAlvo = { vida_atual: novaVida };
      alvo.vida_atual = novaVida;

      let detalheMorte = '';
      if (vidaAntiga === 0) {
        const falhasAtuais = Number(alvo.a_beira?.falhas || 0);
        const novasFalhas = Math.min(3, falhasAtuais + (isCrit ? 2 : 1));
        updatesAlvo.a_beira = { ...(alvo.a_beira || { sucessos: 0 }), falhas: novasFalhas };
        alvo.a_beira = updatesAlvo.a_beira;
        detalheMorte = ` 💀 Golpe devastador em ${nomeAlvo} caído! Falhas na morte: ${novasFalhas}/3.`;

        if (novasFalhas >= 3 && alvo.personagem_id) {
          dbWrites.push(
            supabase
              .from('characters')
              .update({ alive: false, health: 0 })
              .eq('id', alvo.personagem_id),
          );
          detalheMorte += ` ⚰️ ${nomeAlvo} pereceu em combate!`;
        }
      } else if (novaVida === 0) {
        updatesAlvo.a_beira = { sucessos: 0, falhas: 0 };
        alvo.a_beira = updatesAlvo.a_beira;
        detalheMorte = ` 💀 ${nomeAlvo} sucumbiu aos ferimentos e entrou À BEIRA DA MORTE!`;
      }

      // ── MOTOR DE CONDIÇÕES: TESTAR EFEITOS DO ATAQUE DA FERA COM RESISTÊNCIA ──
      if (Array.isArray(ataqueEscolhido.efeitos) && ataqueEscolhido.efeitos.length > 0) {
        const resEfeitos = testarEfeitosAtaqueFera(ataqueEscolhido, alvo);
        if (resEfeitos.aplicados.length > 0) {
          let condicoesAtuais = alvo.condicoes || [];
          for (const ef of resEfeitos.aplicados) {
            const resApp = aplicarCondicao(
              condicoesAtuais,
              ef.condicao,
              ef.pilhas || 1,
              null,
              infoFera.nome,
            );
            condicoesAtuais = resApp.condicoes;
          }
          updatesAlvo.condicoes = condicoesAtuais;
          alvo.condicoes = condicoesAtuais;
        }
        if (resEfeitos.logs.length > 0) {
          detalheMorte += `\n${resEfeitos.logs.join('\n')}`;
        }
      } else if (ataqueEscolhido.efeito?.condicao) {
        const resApp = aplicarCondicao(
          alvo.condicoes || [],
          ataqueEscolhido.efeito.condicao,
          1,
          null,
          infoFera.nome,
        );
        updatesAlvo.condicoes = resApp.condicoes;
        alvo.condicoes = resApp.condicoes;
        detalheMorte += ` ⚠️ ${nomeAlvo} sofreu a condição [${ataqueEscolhido.efeito.condicao.toUpperCase()}]!`;
      }

      dbWrites.push(supabase.from('batalha_participantes').update(updatesAlvo).eq('id', alvo.id));

      if (alvo.personagem_id && novaVida > 0) {
        dbWrites.push(
          supabase.from('characters').update({ health: novaVida }).eq('id', alvo.personagem_id),
        );
      }

      const iconeFera = obterIconeCriatura(infoFera);
      logTexto =
        `${iconeFera} ${infoFera.nome} desferiu [${ataqueEscolhido.nome}] contra ${nomeAlvo}! ` +
        `${isCrit ? '💥 ACERTO CRÍTICO (Duplo 6)! ' : ''}` +
        `[${formulaFera}] — Quebrou o bloqueio e causou ${danoTotal} de dano! (${vidaAntiga} ➔ ${novaVida} PV)${detalheMorte}`;
    } else {
      let extraFumble = '';
      if (isFumble) {
        extraFumble = ` ⚠️ Falha Desastrosa (Duplo 1)! ${infoFera.nome} se desequilibrou e concedeu Vantagem ao próximo ataque de ${nomeAlvo}!`;
        alvo.vantagem_proxima = true;
        dbWrites.push(
          supabase
            .from('batalha_participantes')
            .update({ vantagem_proxima: true })
            .eq('id', alvo.id),
        );
      }

      logTexto =
        `🛡️ ${infoFera.nome} tentou usar [${ataqueEscolhido.nome}] contra ${nomeAlvo}, ` +
        `mas não quebrou o bloqueio [${formulaFera}]!${extraFumble}`;
    }

    // Consolida atualização da fera, inserção do log E avanço do turno em uma única operação paralela
    fera.recargas = recargasAtuais;
    fera.vantagem_proxima = false;
    fera.desvantagem_proxima = false;

    dbWrites.push(
      supabase
        .from('batalha_participantes')
        .update({
          recargas: recargasAtuais,
          vantagem_proxima: false,
          desvantagem_proxima: false,
        })
        .eq('id', fera.id),
      supabase.from('batalha_log').insert({
        batalha_id: batalhaId,
        rodada: batalha.rodada || 1,
        texto: [logsRecarga.join('\n'), logTexto].filter(Boolean).join('\n'),
        dados: {
          tipo: 'ataque_fera',
          fera_id: feraId,
          alvo_id: alvo.id,
          acertou,
          ataque: ataqueEscolhido.nome,
          dano: acertou ? danoTotal : 0,
        },
      }),
    );

    const turnoInfo = prepararAvancoTurnoEmMemoria(
      batalhaId,
      batalha,
      todosParticipantes,
      dbWrites,
    );
    await Promise.all(dbWrites);

    return {
      success: true,
      acertou,
      dano: acertou ? danoTotal : 0,
      alvoId: alvo.id,
      novoIndex: turnoInfo?.novoIndex,
      novaRodada: turnoInfo?.novaRodada,
    };
  } catch (err) {
    console.error('[BattleService] Erro ao resolver turno da fera:', err);
    return await avancarTurnoLocal(batalhaId);
  } finally {
    if (!apenasSimular) {
      batalhasEmProcessamentoFera.delete(batalhaId);
    }
  }
}
