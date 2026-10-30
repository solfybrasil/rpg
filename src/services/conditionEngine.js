/**
 * MOTOR UNIFICADO DE CONDIÇÕES & EFEITOS — ALDRENOR: PESTE DO JURAMENTO
 * Gerencia as 34 condições canônicas do grimório + oleado, tiques no início de turno,
 * combos elementais, migração de feras com resistência e persistência pós-batalha.
 */

import { supabase } from '../shared/supabase';

// ── DICIONÁRIO CANÔNICO DE CONDIÇÕES ──
export const CONDICOES_CATALOGO = {
  abencoado: {
    chave: 'abencoado',
    nome: 'Abençoado',
    icone: '✨',
    tipo: 'bom',
    tique: null,
    modificadores: { bonus_ataque: '1d4' },
    duracao_padrao: 'rodadas',
    turnos_padrao: 2,
    max_pilhas: 3,
    cura: null,
    combos: null,
    descricao: '+1d4 de bônus no próximo teste ou ataque.',
  },
  cancao: {
    chave: 'cancao',
    nome: 'Canção de Batalha',
    icone: '🎵',
    tipo: 'bom',
    tique: null,
    modificadores: { ataque: 1, todos_testes: 1 },
    duracao_padrao: 'cena',
    turnos_padrao: 99,
    max_pilhas: 1,
    cura: null,
    combos: null,
    descricao: '+1 em todos os testes e ataques até o fim da cena.',
  },
  protegido: {
    chave: 'protegido',
    nome: 'Protegido',
    icone: '🛡️',
    tipo: 'bom',
    tique: null,
    modificadores: { defesa: 2 },
    duracao_padrao: 'rodadas',
    turnos_padrao: 2,
    max_pilhas: 3,
    cura: null,
    combos: null,
    descricao: '+2 de Defesa por pilha.',
  },
  fortalecido: {
    chave: 'fortalecido',
    nome: 'Fortalecido',
    icone: '💪',
    tipo: 'bom',
    tique: null,
    modificadores: { dano_causado: '1d4' },
    duracao_padrao: 'rodadas',
    turnos_padrao: 2,
    max_pilhas: 3,
    cura: null,
    combos: null,
    descricao: '+1d4 de dano bônus em todos os ataques.',
  },
  apressado: {
    chave: 'apressado',
    nome: 'Apressado',
    icone: '⚡',
    tipo: 'bom',
    tique: null,
    modificadores: { movimento_extra: true },
    duracao_padrao: 'rodadas',
    turnos_padrao: 2,
    max_pilhas: 1,
    cura: null,
    combos: null,
    descricao: 'Ganha um movimento ou ação tática extra por rodada.',
  },
  regenerando: {
    chave: 'regenerando',
    nome: 'Regenerando',
    icone: '🌱',
    tipo: 'bom',
    tique: { cura: '1d4', por_pilha: true },
    modificadores: {},
    duracao_padrao: 'rodadas',
    turnos_padrao: 3,
    max_pilhas: 3,
    cura: null,
    combos: null,
    descricao: 'Regenera 1d4 de Vida no início de cada turno por pilha.',
  },
  escondido: {
    chave: 'escondido',
    nome: 'Escondido',
    icone: '👤',
    tipo: 'bom',
    tique: null,
    modificadores: { vantagem: 'tudo', invisivel: true },
    duracao_padrao: 'ate_teste',
    turnos_padrao: 2,
    max_pilhas: 1,
    cura: null,
    combos: null,
    descricao: 'Não pode ser mirado diretamente e ataca com Vantagem.',
  },
  resist_fogo: {
    chave: 'resist_fogo',
    nome: 'Resistente ao Fogo',
    icone: '🔥',
    tipo: 'bom',
    tique: null,
    modificadores: { resistencia: 'fogo' },
    duracao_padrao: 'cena',
    turnos_padrao: 99,
    max_pilhas: 1,
    cura: null,
    combos: null,
    descricao: 'Sofre apenas metade de qualquer dano de fogo.',
  },
  resist_frio: {
    chave: 'resist_frio',
    nome: 'Resistente ao Frio',
    icone: '❄️',
    tipo: 'bom',
    tique: null,
    modificadores: { resistencia: 'gelo' },
    duracao_padrao: 'cena',
    turnos_padrao: 99,
    max_pilhas: 1,
    cura: null,
    combos: null,
    descricao: 'Sofre apenas metade de qualquer dano de frio ou gelo.',
  },
  exposto: {
    chave: 'exposto',
    nome: 'Exposto',
    icone: '🎯',
    tipo: 'fraqueza',
    tique: null,
    modificadores: { defesa: -2 },
    duracao_padrao: 'rodadas',
    turnos_padrao: 2,
    max_pilhas: 3,
    cura: null,
    combos: null,
    descricao: '-2 de Defesa até o término ou próximo ataque.',
  },
  enfraquecido: {
    chave: 'enfraquecido',
    nome: 'Enfraquecido',
    icone: '🥀',
    tipo: 'fraqueza',
    tique: null,
    modificadores: { dano_causado: -2 },
    duracao_padrao: 'rodadas',
    turnos_padrao: 2,
    max_pilhas: 3,
    cura: null,
    combos: null,
    descricao: 'Causa 2 de dano a menos em todos os ataques por pilha.',
  },
  exausto: {
    chave: 'exausto',
    nome: 'Exausto',
    icone: '😮‍💨',
    tipo: 'fraqueza',
    tique: null,
    modificadores: { desvantagem: 'tudo' },
    duracao_padrao: 'ate_tratar',
    turnos_padrao: 99,
    max_pilhas: 3,
    cura: { itens: ['descanso_longo', 'racoes'], teste: { atributo: 'corpo', peso: 10 } },
    combos: null,
    descricao: 'Desvantagem em todas as rolagens até um descanso ou tratamento.',
  },
  doente: {
    chave: 'doente',
    nome: 'Doente',
    icone: '🤢',
    tipo: 'fraqueza',
    tique: null,
    modificadores: { ataque: -1, todos_testes: -1 },
    duracao_padrao: 'ate_tratar',
    turnos_padrao: 99,
    max_pilhas: 3,
    cura: {
      itens: ['antidoto', 'erva_medicinal', 'balsamo'],
      teste: { atributo: 'corpo', peso: 10 },
    },
    combos: null,
    descricao: '-1 em todas as rolagens e testes até ser curado.',
  },
  marca_peste: {
    chave: 'marca_peste',
    nome: 'Marca da Peste',
    icone: '☣️',
    tipo: 'fraqueza',
    tique: null,
    modificadores: { peste_fim_cena: 1 },
    duracao_padrao: 'cena',
    turnos_padrao: 99,
    max_pilhas: 3,
    cura: { itens: ['balsamo_purificador'], teste: { atributo: 'vontade', peso: 11 } },
    combos: null,
    descricao: 'Carrega o estigma da mácula; arrisca ganhar +1 de Peste ao fim do encontro.',
  },
  lento: {
    chave: 'lento',
    nome: 'Lento',
    icone: '🐌',
    tipo: 'controle',
    tique: null,
    modificadores: { movimento: 'metade' },
    duracao_padrao: 'rodadas',
    turnos_padrao: 2,
    max_pilhas: 1,
    cura: null,
    combos: null,
    descricao: 'Movimento reduzido pela metade. Só pode mover OU agir.',
  },
  confuso: {
    chave: 'confuso',
    nome: 'Confuso',
    icone: '💫',
    tipo: 'controle',
    tique: null,
    modificadores: { alvo_aleatorio: true },
    duracao_padrao: 'rodadas',
    turnos_padrao: 2,
    max_pilhas: 1,
    cura: { teste: { atributo: 'vontade', peso: 10 } },
    combos: null,
    descricao: 'Pode atacar aliados ou alvos aleatórios por alucinação (1d6: 1-2 alvo aleatório).',
  },
  silenciado: {
    chave: 'silenciado',
    nome: 'Silenciado',
    icone: '🤐',
    tipo: 'controle',
    tique: null,
    modificadores: { sem_conjuracao: true, sem_fala: true },
    duracao_padrao: 'rodadas',
    turnos_padrao: 2,
    max_pilhas: 1,
    cura: null,
    combos: null,
    descricao: 'Incapaz de conjurar magias com verbo ou entoar canções.',
  },
  preso: {
    chave: 'preso',
    nome: 'Preso',
    icone: '🕸️',
    tipo: 'controle',
    tique: null,
    modificadores: { sem_movimento: true, desvantagem: 'ataque' },
    duracao_padrao: 'ate_teste',
    turnos_padrao: 3,
    max_pilhas: 1,
    cura: { teste: { atributo: 'astucia', peso: 10 }, itens: ['lamina', 'fogo'] },
    combos: null,
    descricao: 'Enredado em teias, vinhas ou correntes. Não se move até escapar.',
  },
  agarrado: {
    chave: 'agarrado',
    nome: 'Agarrado',
    icone: '🤼',
    tipo: 'controle',
    tique: null,
    modificadores: { sem_movimento: true },
    duracao_padrao: 'ate_teste',
    turnos_padrao: 2,
    max_pilhas: 1,
    cura: { teste: { atributo: 'corpo', peso: 10 } },
    combos: null,
    descricao: 'Contido pelo adversário; velocidade zero até romper a presa.',
  },
  cego: {
    chave: 'cego',
    nome: 'Cego',
    icone: '👁️‍🗨️',
    tipo: 'controle',
    tique: null,
    modificadores: { desvantagem: 'tudo', percepcao_nula: true },
    duracao_padrao: 'rodadas',
    turnos_padrao: 2,
    max_pilhas: 1,
    cura: { teste: { atributo: 'astucia', peso: 10 } },
    combos: null,
    descricao: 'Desvantagem em todos os ataques e percepções visuais.',
  },
  ensurdecido: {
    chave: 'ensurdecido',
    nome: 'Ensurdecido',
    icone: '🔇',
    tipo: 'controle',
    tique: null,
    modificadores: { sem_audicao: true },
    duracao_padrao: 'rodadas',
    turnos_padrao: 2,
    max_pilhas: 1,
    cura: null,
    combos: null,
    descricao: 'Imune a canções e ordens sonoras, mas não ouve passos.',
  },
  caido: {
    chave: 'caido',
    nome: 'Caído',
    icone: '🧎',
    tipo: 'controle',
    tique: null,
    modificadores: { vantagem_inimigos_cac: true, movimento: 'metade' },
    duracao_padrao: 'ate_teste',
    turnos_padrao: 2,
    max_pilhas: 1,
    cura: { acao: 'levantar', teste: { atributo: 'corpo', peso: 9 } },
    combos: null,
    descricao: 'No chão! Inimigos corpo a corpo atacam com Vantagem até se levantar.',
  },
  atordoado: {
    chave: 'atordoado',
    nome: 'Atordoado',
    icone: '😵',
    tipo: 'controle',
    tique: null,
    modificadores: { perde_turno: true, sem_reacao: true },
    duracao_padrao: 'rodadas',
    turnos_padrao: 1,
    max_pilhas: 1,
    cura: null,
    combos: null,
    descricao: 'Perde o próximo turno e não pode usar reações defensivas.',
  },
  amedrontado: {
    chave: 'amedrontado',
    nome: 'Amedrontado',
    icone: '😨',
    tipo: 'controle',
    tique: null,
    modificadores: { desvantagem: 'ataque', sem_aproximacao: true },
    duracao_padrao: 'ate_teste',
    turnos_padrao: 3,
    max_pilhas: 1,
    cura: { teste: { atributo: 'vontade', peso: 10 } },
    combos: null,
    descricao: 'Paralisado de pavor; não pode avançar na direção da fonte do terror.',
  },
  encantado: {
    chave: 'encantado',
    nome: 'Encantado',
    icone: '💖',
    tipo: 'controle',
    tique: null,
    modificadores: { nao_ataca_conjurador: true },
    duracao_padrao: 'cena',
    turnos_padrao: 99,
    max_pilhas: 1,
    cura: { teste: { atributo: 'vontade', peso: 11 } },
    combos: null,
    descricao: 'Considera o conjurador um amigo jurado e recusa-se a atacá-lo.',
  },
  gelado: {
    chave: 'gelado',
    nome: 'Gelado',
    icone: '🥶',
    tipo: 'controle',
    tique: null,
    modificadores: { ataque: -1, movimento: 'metade' },
    duracao_padrao: 'rodadas',
    turnos_padrao: 2,
    max_pilhas: 3,
    cura: { itens: ['fogo', 'tocha'] },
    combos: null,
    descricao: '-1 nos ataques e deslocamento reduzido pela metade por pilha.',
  },
  congelado: {
    chave: 'congelado',
    nome: 'Congelado',
    icone: '🧊',
    tipo: 'controle',
    tique: null,
    modificadores: { perde_turno: true, sem_reacao: true, defesa: -2 },
    duracao_padrao: 'ate_teste',
    turnos_padrao: 2,
    max_pilhas: 1,
    cura: { teste: { atributo: 'corpo', peso: 11 }, itens: ['fogo', 'tocha'] },
    combos: null,
    descricao: 'Preso em bloco de gelo sólido. Não age até romper ou ser descongelado.',
  },
  queimando: {
    chave: 'queimando',
    nome: 'Queimando',
    icone: '🔥',
    tipo: 'dano',
    tique: { dano: '1d4', por_pilha: true, tipo: 'fogo' },
    modificadores: {},
    duracao_padrao: 'rodadas',
    turnos_padrao: 2,
    max_pilhas: 3,
    cura: { itens: ['agua', 'odre_agua'], acao: 'rolar_no_chao' },
    combos: null,
    descricao: 'Queima viva: perde 1d4 de Vida no início do turno por pilha.',
  },
  sangrando: {
    chave: 'sangrando',
    nome: 'Sangrando',
    icone: '🩸',
    tipo: 'dano',
    tique: { vida: -1, por_pilha: true, tipo: 'fisico' },
    modificadores: {},
    duracao_padrao: 'ate_tratar',
    turnos_padrao: 99,
    max_pilhas: 3,
    cura: {
      itens: ['ataduras', 'tintura_sangue', 'pocao_cura'],
      teste: { atributo: 'corpo', peso: 10 },
    },
    combos: null,
    descricao: 'Ferida aberta: perde 1 de Vida por pilha a cada rodada até estancar.',
  },
  envenenado: {
    chave: 'envenenado',
    nome: 'Envenenado',
    icone: '🐍',
    tipo: 'dano',
    tique: { vida: -1, por_pilha: true, tipo: 'veneno' },
    modificadores: { desvantagem: 'tudo' },
    duracao_padrao: 'rodadas',
    turnos_padrao: 3,
    max_pilhas: 3,
    cura: { itens: ['antidoto', 'antidoto_brejos'], teste: { atributo: 'corpo', peso: 10 } },
    combos: null,
    descricao: 'Toxina no sangue: desvantagem em todas as rolagens e -1 PV por pilha por turno.',
  },
  corroido: {
    chave: 'corroido',
    nome: 'Corroído',
    icone: '🧪',
    tipo: 'dano',
    tique: null,
    modificadores: { defesa: -1, por_pilha: true },
    duracao_padrao: 'ate_tratar',
    turnos_padrao: 99,
    max_pilhas: 3,
    cura: { itens: ['agua', 'solvente', 'oleo'] },
    combos: null,
    descricao: 'Armadura e pele corroídas por ácido: -1 de Defesa por pilha até ser lavado.',
  },
  eletrizado: {
    chave: 'eletrizado',
    nome: 'Eletrizado',
    icone: '⚡',
    tipo: 'dano',
    tique: { dano: '1d4', por_pilha: false, tipo: 'eletrico' },
    modificadores: { sem_reacao: true },
    duracao_padrao: 'rodadas',
    turnos_padrao: 2,
    max_pilhas: 1,
    cura: null,
    combos: null,
    descricao: 'Corrente estática: 1d4 de choque no início do turno e bloqueia reações.',
  },
  dormindo: {
    chave: 'dormindo',
    nome: 'Dormindo',
    icone: '💤',
    tipo: 'controle',
    tique: null,
    modificadores: { perde_turno: true, vantagem_inimigos_cac: true },
    duracao_padrao: 'ate_teste',
    turnos_padrao: 3,
    max_pilhas: 1,
    cura: { acao: 'sacudir', dano_desperta: true },
    combos: null,
    descricao: 'Adormecido. Perde o turno; acorda imediatamente se sofrer dano.',
  },
  molhado: {
    chave: 'molhado',
    nome: 'Molhado',
    icone: '🌊',
    tipo: 'fraqueza',
    tique: null,
    modificadores: { apaga_queimando: true },
    duracao_padrao: 'rodadas',
    turnos_padrao: 3,
    max_pilhas: 1,
    cura: { itens: ['fogo', 'tocha'] },
    combos: {
      fogo: { anula: true, log: 'A água extinguiu o calor!' },
      eletrico: { dano_mult: 2, aplica: 'atordoado', log: 'Choque devastador em alvo molhado!' },
      raio: {
        dano_mult: 2,
        aplica: 'atordoado',
        log: 'Raio em alvo molhado provoca atordoamento imediato!',
      },
      gelo: { dano_mult: 1.5, aplica: 'gelado', log: 'Gelo em alvo molhado congela a água!' },
    },
    descricao: 'Encharcado: apaga chamas instantaneamente, mas sofre dano duplo de raio e atordoa.',
  },
  oleado: {
    chave: 'oleado',
    nome: 'Oleado',
    icone: '🛢️',
    tipo: 'fraqueza',
    tique: null,
    modificadores: { inflamavel: true },
    duracao_padrao: 'rodadas',
    turnos_padrao: 3,
    max_pilhas: 1,
    cura: { itens: ['agua', 'areia'] },
    combos: {
      fogo: {
        dano_mult: 2,
        aplica: 'queimando',
        pilhas: 2,
        log: 'O óleo entrou em combustão explosiva!',
      },
    },
    descricao:
      'Coberto de óleo inflamável: próximo dano de fogo é dobrado e inflige Queimando (2 pilhas).',
  },
};

// ── AUXILIARES DE ROLAGEM DE DADOS DO MOTOR ──
function rolarDado(faces = 6) {
  return Math.floor(Math.random() * faces) + 1;
}

export function rolarFormulaTique(expr = '1d4') {
  if (typeof expr === 'number') return expr;
  const match = String(expr)
    .toLowerCase()
    .trim()
    .match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
  if (!match) {
    const n = Number.parseInt(expr, 10);
    return isNaN(n) ? 1 : n;
  }
  const qtd = Number.parseInt(match[1], 10);
  const faces = Number.parseInt(match[2], 10);
  const bonus = match[3] ? Number.parseInt(match[3], 10) : 0;
  let soma = 0;
  for (let i = 0; i < qtd; i++) {
    soma += rolarDado(faces);
  }
  return soma + bonus;
}

// ── NORMALIZADOR DE CONDIÇÃO ──
export function normalizarCondicao(item, origem = '') {
  if (!item) return null;
  const chave = (
    typeof item === 'string' ? item : item.chave || item.condicao || item.id || item.nome || ''
  )
    .toLowerCase()
    .trim();
  const def = CONDICOES_CATALOGO[chave];
  if (!def) return null;

  const pilhas = Math.max(1, Math.min(def.max_pilhas || 3, Number(item.pilhas || 1)));
  const duracao = item.duracao_padrao || def.duracao_padrao || 'rodadas';
  const turnos =
    typeof item.turnos_restantes === 'number' ? item.turnos_restantes : (def.turnos_padrao ?? 2);

  return {
    chave: def.chave,
    nome: def.nome,
    icone: def.icone,
    tipo: def.tipo,
    pilhas,
    turnos_restantes: turnos,
    duracao_padrao: duracao,
    origem: item.origem || origem || 'combate',
    modificadores: def.modificadores,
    tique: def.tique,
    cura: def.cura,
  };
}

// ── APLICAR OU SOMAR PILHAS DE UMA CONDIÇÃO ──
export function aplicarCondicao(
  listaAtual = [],
  condicaoChave,
  pilhasQtd = 1,
  duracao = null,
  origem = '',
) {
  const chave = String(condicaoChave || '')
    .toLowerCase()
    .trim();
  const def = CONDICOES_CATALOGO[chave];
  if (!def) return { condicoes: listaAtual, aplicada: false, comboLog: null };

  const normais = (listaAtual || []).map((c) => normalizarCondicao(c)).filter(Boolean);
  let comboLog = null;

  // Checagem de combos antes de aplicar
  // Exemplo: aplicar queimando em quem tem 'molhado' -> apaga molhado e queima menos
  const temMolhado = normais.find((c) => c.chave === 'molhado');
  if (chave === 'queimando' && temMolhado) {
    const filtrados = normais.filter((c) => c.chave !== 'molhado');
    return {
      condicoes: filtrados,
      aplicada: false,
      comboLog: '🌊 A água no corpo extinguiu as chamas antes de queimar!',
    };
  }

  // Se aplicar molhado em quem tem queimando -> apaga queimando
  if (chave === 'molhado') {
    const indexQueimando = normais.findIndex((c) => c.chave === 'queimando');
    if (indexQueimando >= 0) {
      normais.splice(indexQueimando, 1);
      comboLog = '🌊 A água extinguiu as chamas do alvo!';
    }
  }

  const index = normais.findIndex((c) => c.chave === chave);
  if (index >= 0) {
    // Já possui a condição: incrementa pilhas até max_pilhas e renova turnos
    const atual = normais[index];
    const novasPilhas = Math.min(def.max_pilhas, atual.pilhas + (Number(pilhasQtd) || 1));
    normais[index] = {
      ...atual,
      pilhas: novasPilhas,
      turnos_restantes: Math.max(atual.turnos_restantes, duracao ?? def.turnos_padrao ?? 2),
    };
  } else {
    // Nova condição
    normais.push({
      chave: def.chave,
      nome: def.nome,
      icone: def.icone,
      tipo: def.tipo,
      pilhas: Math.min(def.max_pilhas, Number(pilhasQtd) || 1),
      turnos_restantes: duracao ?? def.turnos_padrao ?? 2,
      duracao_padrao: def.duracao_padrao,
      origem: origem || 'batalha',
      modificadores: def.modificadores,
      tique: def.tique,
      cura: def.cura,
    });
  }

  return { condicoes: normais, aplicada: true, comboLog };
}

// ── REMOVER CONDIÇÃO ──
export function removerCondicao(listaAtual = [], condicaoChave) {
  const chave = String(condicaoChave || '')
    .toLowerCase()
    .trim();
  const filtradas = (listaAtual || [])
    .map((c) => normalizarCondicao(c))
    .filter((c) => c && c.chave !== chave);
  return filtradas;
}

// ── AVALIAR COMBOS DE DANO COM CONDIÇÕES ATIVAS (ex.: Oleado + Fogo) ──
export function avaliarCombosElementais(
  condicoesAtivas = [],
  tipoDano = 'fisico',
  danoOriginal = 0,
) {
  const normais = (condicoesAtivas || []).map((c) => normalizarCondicao(c)).filter(Boolean);
  const tipo = String(tipoDano || '')
    .toLowerCase()
    .trim();
  let danoFinal = danoOriginal;
  let multiplicador = 1;
  const condicoesParaAdicionar = [];
  const condicoesParaRemover = [];
  const logsCombo = [];

  for (const cond of normais) {
    const def = CONDICOES_CATALOGO[cond.chave];
    if (def?.combos?.[tipo]) {
      const combo = def.combos[tipo];
      if (combo.dano_mult) {
        multiplicador *= combo.dano_mult;
      }
      if (combo.aplica) {
        condicoesParaAdicionar.push({
          condicao: combo.aplica,
          pilhas: combo.pilhas || 1,
        });
      }
      if (combo.anula) {
        condicoesParaRemover.push(cond.chave);
      }
      if (combo.log) {
        logsCombo.push(combo.log);
      }
    }
  }

  danoFinal = Math.round(danoFinal * multiplicador);

  return {
    danoFinal,
    multiplicador,
    condicoesParaAdicionar,
    condicoesParaRemover,
    logsCombo,
  };
}

// ── PROCESSAR TIQUE NO INÍCIO DO TURNO DE UM PARTICIPANTE ──
export function processarTiqueInicioTurno(participante, atributosParticipante = {}) {
  if (!participante) return null;

  const nome =
    participante.detalhes?.name || participante.detalhes?.nome || participante.nome || 'Combatente';
  const condicoesAtuais = (participante.condicoes || [])
    .map((c) => normalizarCondicao(c))
    .filter(Boolean);

  let danoTotalTique = 0;
  let curaTotalTique = 0;
  const logsTique = [];
  const condicoesRestantes = [];
  let perdeTurno = false;

  for (const cond of condicoesAtuais) {
    const def = CONDICOES_CATALOGO[cond.chave];
    if (!def) continue;

    // 1. Checar se perde turno (atordoado, congelado, dormindo)
    if (def.modificadores?.perde_turno) {
      perdeTurno = true;
    }

    // 2. Aplicar Tique (Dano ou Cura)
    if (def.tique) {
      if (def.tique.dano) {
        let dano = 0;
        const vezes = def.tique.por_pilha ? cond.pilhas : 1;
        for (let i = 0; i < vezes; i++) {
          dano += rolarFormulaTique(def.tique.dano);
        }
        danoTotalTique += dano;
        logsTique.push(
          `🔥 [${def.nome}]: [${nome}] sofreu ${dano} de dano continuo de ${def.tique.tipo || 'fogo'} (${cond.pilhas}x pilhas).`,
        );
      } else if (def.tique.vida && def.tique.vida < 0) {
        const perda = Math.abs(def.tique.vida) * (def.tique.por_pilha ? cond.pilhas : 1);
        danoTotalTique += perda;
        logsTique.push(
          `🩸 [${def.nome}]: [${nome}] perdeu -${perda} de Vida pelo efeito contínuo (${cond.pilhas}x pilhas).`,
        );
      } else if (def.tique.cura) {
        let cura = 0;
        const vezes = def.tique.por_pilha ? cond.pilhas : 1;
        for (let i = 0; i < vezes; i++) {
          cura += rolarFormulaTique(def.tique.cura);
        }
        curaTotalTique += cura;
        logsTique.push(
          `🌱 [${def.nome}]: [${nome}] recuperou +${cura} de Vida (${cond.pilhas}x pilhas).`,
        );
      }
    }

    // 3. Teste para sair (se for por teste: duracao_padrao === 'ate_teste')
    let saiuPorTeste = false;
    if (def.duracao_padrao === 'ate_teste' && def.cura?.teste) {
      const { atributo, peso } = def.cura.teste;
      const modAttr = Number(atributosParticipante?.[atributo] || 0);
      const d1 = rolarDado(6);
      const d2 = rolarDado(6);
      const soma = d1 + d2 + modAttr;
      if (soma >= peso) {
        saiuPorTeste = true;
        logsTique.push(
          `✨ [${nome}] resistiu ao efeito [${def.nome}] com teste de ${atributo.toUpperCase()} (${d1}+${d2}+${modAttr} = ${soma} vs DC ${peso}) e se libertou!`,
        );
      } else {
        logsTique.push(
          `⛓️ [${nome}] tentou se libertar de [${def.nome}] (${soma} vs DC ${peso}), mas permaneceu contido.`,
        );
      }
    }

    if (saiuPorTeste) {
      continue; // Não mantém na lista
    }

    // 4. Decrementar rodadas (se duracao_padrao === 'rodadas')
    if (def.duracao_padrao === 'rodadas') {
      const novosTurnos = cond.turnos_restantes - 1;
      if (novosTurnos <= 0) {
        logsTique.push(`⌛ O efeito [${def.nome}] sobre [${nome}] expirou.`);
        continue; // Expirou, não inclui
      }
      condicoesRestantes.push({
        ...cond,
        turnos_restantes: novosTurnos,
      });
    } else {
      // Condição dura até tratar, cena ou ação
      condicoesRestantes.push(cond);
    }
  }

  // 5. Atualização de Vida
  const vidaAtual = Number(participante.vida_atual || 0);
  const vidaMax = Number(participante.vida_max || 20);
  const novaVida = Math.max(0, Math.min(vidaMax, vidaAtual - danoTotalTique + curaTotalTique));

  return {
    novasCondicoes: condicoesRestantes,
    danoTotalTique,
    curaTotalTique,
    novaVida,
    logsTique,
    perdeTurno,
  };
}

// ── CALCULAR MODIFICADORES DE ROLAGEM A PARTIR DE CONDIÇÕES ──
export function calcularModificadoresCondicoes(participante, alvo = null) {
  const getConds = (p) => (p?.condicoes || []).map((c) => normalizarCondicao(c)).filter(Boolean);
  const condsAtor = getConds(participante);
  const condsAlvo = getConds(alvo);

  let bonusAtaque = 0;
  let bonusDefesaAlvo = 0;
  let bonusDano = 0;
  let temVantagem = false;
  let temDesvantagem = false;
  let perdeTurno = false;
  let semReacao = false;

  for (const c of condsAtor) {
    const mod = c.modificadores || {};
    if (mod.ataque) bonusAtaque += Number(mod.ataque);
    if (mod.todos_testes) bonusAtaque += Number(mod.todos_testes);
    if (mod.dano_causado && typeof mod.dano_causado === 'number')
      bonusDano += Number(mod.dano_causado);
    if (mod.desvantagem === 'tudo' || mod.desvantagem === 'ataque') temDesvantagem = true;
    if (mod.vantagem === 'tudo' || mod.vantagem === 'ataque') temVantagem = true;
    if (mod.perde_turno) perdeTurno = true;
    if (mod.sem_reacao) semReacao = true;
  }

  for (const c of condsAlvo) {
    const mod = c.modificadores || {};
    if (mod.defesa) {
      const defMod = Number(mod.defesa);
      bonusDefesaAlvo += mod.por_pilha ? defMod * c.pilhas : defMod;
    }
    if (mod.vantagem_inimigos_cac) temVantagem = true;
    if (mod.perde_turno) {
      // Inimigo atordoado/adormecido facilita acertos
      temVantagem = true;
    }
  }

  return {
    bonusAtaque,
    bonusDefesaAlvo,
    bonusDano,
    temVantagem,
    temDesvantagem,
    perdeTurno,
    semReacao,
  };
}

// ── GERADOR & MIGRACÃO AUTOMÁTICA DE EFEITOS NO BESTIÁRIO ──
/**
 * Adiciona efeitos jsonb [{ condicao, chance, pilhas, resistencia: { atributo, peso } }]
 * sem apagar nenhuma fera existente, preenchendo apenas ataques sem efeito.
 */
export function gerarEfeitosAutomaticosBestiario(criatura) {
  if (!criatura) return criatura;

  const nome = (criatura.nome || criatura.name || '').toLowerCase();
  const desc = (criatura.descricao || criatura.description || '').toLowerCase();
  const tipo = (criatura.category || criatura.categoria || criatura.species || '').toLowerCase();
  const patamarStr = String(criatura.tier || criatura.patamar || '').toLowerCase();
  const threatNum = Number(criatura.threat || criatura.ameaca || 1);
  const atkBonus = Number(criatura.ataque_bonus || criatura.attack_bonus || 1);

  // Cálculo de DC canônico:
  // 8 + patamar da fera (se patamar numérico 1..10) ou 8 + floor(ataque_bonus / 1.5)
  const patamarVal = threatNum > 0 ? threatNum : Math.max(1, Math.floor(atkBonus / 1.5));
  const pesoResistencia = 8 + patamarVal;

  // Regras de detecção por palavras-chave
  const regras = [
    {
      regex: /aranha|escorpi[aã]o|serpente|cobra|sapo|ferr[aã]o|veneno|pe[cç]onha|peste/i,
      condicao: 'envenenado',
      chance: 50,
      atributo: 'corpo',
    },
    {
      regex: /lobo|garra|presa|l[aâ]mina|tubar[aã]o|rasgar|morder|dilacerar/i,
      condicao: 'sangrando',
      chance: 40,
      atributo: 'corpo',
    },
    {
      regex: /fogo|salamandra|lava|brasa|f[eê]nix|chama|inc[eê]ndio|calor/i,
      condicao: 'queimando',
      chance: 40,
      atributo: 'corpo',
    },
    {
      regex: /gelo|neve|wyrm|branco|congelar|geada|frio/i,
      condicao: 'gelado',
      chance: 40,
      atributo: 'astucia',
    },
    {
      regex: /[aá]cido|lodo|gosma|verme|corros|podrid[aã]o/i,
      condicao: 'corroido',
      chance: 35,
      atributo: 'corpo',
    },
    {
      regex: /raio|enguia|trov[aã]o|rel[aâ]mpago|est[aá]tico|choque/i,
      condicao: 'eletrizado',
      chance: 30,
      atributo: 'astucia',
    },
    {
      regex: /troll|urso|gigante|javali|investida|rabada|esmaga|derrubar/i,
      condicao: 'caido',
      chance: 30,
      atributo: 'corpo',
    },
    {
      regex: /harpia|sombra|rachado|rugido|uivo|pavor|terror|medo/i,
      condicao: 'amedrontado',
      chance: 35,
      atributo: 'vontade',
    },
    {
      regex: /teia|tent[aá]culo|abra[cç]o|constritor|enredar/i,
      condicao: 'preso',
      chance: 40,
      atributo: 'astucia',
    },
    {
      regex: /basilisco|olhar|luz|tinta|cegueira/i,
      condicao: 'cego',
      chance: 30,
      atributo: 'astucia',
    },
    {
      regex: /peste|cad[aá]ver|podre|maculado|m[aá]cula/i,
      condicao: 'marca_peste',
      chance: 25,
      atributo: 'vontade',
    },
  ];

  let ataquesOriginais =
    Array.isArray(criatura.ataques) && criatura.ataques.length > 0
      ? criatura.ataques
      : Array.isArray(criatura.abilities) && criatura.abilities.length > 0
        ? criatura.abilities
        : [];

  // Se a criatura não possui ataques cadastrados, gera os dois ataques canônicos do sistema
  if (ataquesOriginais.length === 0) {
    const nomeAtk1 = /lobo|c[aã]o|fera|urso/i.test(nome)
      ? 'Mordida Selvagem'
      : /aranha|escorpi[aã]o|serpente/i.test(nome)
        ? 'Picada Venenosa'
        : /p[aá]ssaro|harpia|grifo/i.test(nome)
          ? 'Garras Dilacerantes'
          : 'Golpe Selvagem';
    const nomeAtk2 = /lobo|c[aã]o|fera|urso/i.test(nome)
      ? 'Bote Feroz'
      : /troll|gigante|javali/i.test(nome)
        ? 'Investida Brutal'
        : 'Investida Feroz';

    ataquesOriginais = [
      {
        nome: nomeAtk1,
        name: nomeAtk1,
        dano: criatura.damage_dice || '1d8',
        tipo: 'fisico',
        desc: 'Ataque frontal rápido e feroz.',
      },
      {
        nome: nomeAtk2,
        name: nomeAtk2,
        dano: '1d10',
        tipo: 'fisico',
        desc: 'Manobra pesada que tenta desequilibrar o alvo.',
      },
    ];
  }

  let algumEfeitoAtribuido = false;

  const novosAtaques = ataquesOriginais.map((atk, idx) => {
    // Se o ataque já possui efeitos definidos explicitamente pelo mestre, NÃO sobrescreve!
    if (atk && typeof atk === 'object' && Array.isArray(atk.efeitos) && atk.efeitos.length > 0) {
      return atk;
    }

    let atkObj = {};
    if (typeof atk === 'string') {
      const parts = atk.split(':');
      const atkNome = parts[0]?.trim() || `Ataque ${idx + 1}`;
      const atkDesc = parts.slice(1).join(':').trim() || atk;
      const danoMatch = atkDesc.match(/(\d+d\d+(?:\s*\+\s*\d+)?)/i);
      atkObj = {
        nome: atkNome,
        name: atkNome,
        dano: danoMatch ? danoMatch[1] : criatura.damage_dice || '1d8',
        tipo: 'fisico',
        desc: atkDesc,
      };
    } else {
      atkObj = {
        ...atk,
        nome: atk.nome || atk.name || `Ataque ${idx + 1}`,
        name: atk.name || atk.nome || `Ataque ${idx + 1}`,
        dano: atk.dano || atk.damage || criatura.damage_dice || '1d8',
        tipo: atk.tipo || atk.type || 'fisico',
        desc: atk.desc || atk.description || '',
      };
    }

    const textoAnalise = `${nome} ${desc} ${tipo} ${atkObj.nome} ${atkObj.desc}`;
    const efeitosDetectados = [];

    for (const reg of regras) {
      if (reg.regex.test(textoAnalise)) {
        efeitosDetectados.push({
          condicao: reg.condicao,
          chance: reg.chance,
          pilhas: 1,
          resistencia: {
            atributo: reg.atributo,
            peso: pesoResistencia,
          },
        });
        algumEfeitoAtribuido = true;
        break; // Aplica o primeiro efeito temático mais característico por ataque
      }
    }

    // Se não detectou nada específico mas é o segundo ataque de fera perigosa
    if (efeitosDetectados.length === 0 && idx > 0 && threatNum >= 3) {
      efeitosDetectados.push({
        condicao: 'caido',
        chance: 25,
        pilhas: 1,
        resistencia: {
          atributo: 'corpo',
          peso: pesoResistencia,
        },
      });
      algumEfeitoAtribuido = true;
    }

    return {
      ...atkObj,
      efeitos: efeitosDetectados,
    };
  });

  return {
    ...criatura,
    ataques: novosAtaques,
    efeitos_auto: criatura.efeitos_auto ?? algumEfeitoAtribuido,
  };
}

// ── RESOLUÇÃO DE RESISTÊNCIA DE HERÓI AO SOFRER ATAQUE COM EFEITO ──
export function testarEfeitosAtaqueFera(ataque, heroiAlvo, rolarDadoLocal = rolarDado) {
  if (!ataque || !Array.isArray(ataque.efeitos) || ataque.efeitos.length === 0) {
    return { aplicados: [], logs: [] };
  }

  const aplicados = [];
  const logs = [];
  const nomeHeroi =
    heroiAlvo?.detalhes?.name || heroiAlvo?.detalhes?.nome || heroiAlvo?.nome || 'Herói';
  const attrs = heroiAlvo?.detalhes?.attributes || heroiAlvo?.attributes || {};

  for (const ef of ataque.efeitos) {
    const chance = Number(ef.chance ?? 100);
    const sorteio = Math.floor(Math.random() * 100) + 1;

    if (sorteio <= chance) {
      // O efeito disparou! Herói rola resistência
      const attrRes = ef.resistencia?.atributo || 'corpo';
      const pesoDC = Number(ef.resistencia?.peso || 10);
      const modHeroi = Number(attrs[attrRes] || 0);

      const d1 = rolarDadoLocal(6);
      const d2 = rolarDadoLocal(6);
      const totalRes = d1 + d2 + modHeroi;

      if (totalRes >= pesoDC) {
        logs.push(
          `🛡️ [${nomeHeroi}] resistiu à condição [${ef.condicao.toUpperCase()}]! (Rolou 2d6(${d1}+${d2})+${modHeroi} = ${totalRes} vs DC ${pesoDC})`,
        );
      } else {
        aplicados.push(ef);
        logs.push(
          `⚠️ [${nomeHeroi}] falhou no teste de ${attrRes.toUpperCase()} (${totalRes} vs DC ${pesoDC}) e sofreu [${ef.condicao.toUpperCase()}]!`,
        );
      }
    }
  }

  return { aplicados, logs };
}

// ── FINALIZAR CONDIÇÕES AO TÉRMINO DA BATALHA ──
/**
 * Condições de 'cena' e 'rodadas' expiram ao término do combate.
 * Condições de 'ate_tratar' (sangrando, doente, corroido, exausto) continuam salvas
 * na ficha do herói fora da arena.
 */
export async function persistirCondicoesFimDeBatalha(participantes = []) {
  const updates = [];

  for (const p of participantes) {
    if (p.tipo === 'heroi' && p.personagem_id) {
      const conds = (p.condicoes || []).map((c) => normalizarCondicao(c)).filter(Boolean);
      // Filtra apenas as que persistem até tratar
      const persistentes = conds
        .filter((c) => c.duracao_padrao === 'ate_tratar')
        .map((c) => ({
          chave: c.chave,
          nome: c.nome,
          pilhas: c.pilhas,
          duracao_padrao: 'ate_tratar',
        }));

      updates.push(
        supabase.from('characters').update({ conditions: persistentes }).eq('id', p.personagem_id),
      );
    }
  }

  try {
    if (updates.length > 0) {
      await Promise.all(updates);
    }
  } catch (err) {
    console.warn('[ConditionEngine] Aviso ao persistir condições na ficha:', err);
  }
}

// ── INFERÊNCIA INTELIGENTE DE EFEITOS PARA TODAS AS POÇÕES DO UNIVERSO ──
/**
 * Analisa qualquer poção ou consumível (do catálogo de 130 poções de Aldrenor, do banco ou inventário)
 * e infere os blocos de efeitos estruturados para que funcione no motor de combate.
 */
export function inferirEfeitosPocao(itemOuExtras = {}) {
  if (Array.isArray(itemOuExtras.efeitos) && itemOuExtras.efeitos.length > 0) {
    return itemOuExtras.efeitos;
  }

  const nome = (itemOuExtras.name || itemOuExtras.nome || '').trim();
  const subcat = (itemOuExtras.subcategory || itemOuExtras.subcategoria || '').trim();
  const special = (itemOuExtras.special || itemOuExtras.especial || '').trim();
  const desc = (itemOuExtras.description || itemOuExtras.descricao || '').trim();
  const fullText = `${nome} ${subcat} ${special} ${desc}`.toLowerCase();

  const blocos = [];

  // 1. FÔLEGO DE FOGO / BAFO DE FOGO / COSPE FOGO
  if (/f[oô]lego\s+de\s+fogo|bafo\s+de\s+fogo|cospe\s+fogo|sopro\s+de\s+fogo/i.test(fullText)) {
    const matchDado = fullText.match(/(\d+d\d+)/);
    const formulaDano = matchDado ? matchDado[1] : '2d6';

    blocos.push({
      bloco: 'dano_ofensivo',
      valor: formulaDano,
      tipo: 'fogo',
      descricao: 'Exala turbilhão flamejante',
    });
    blocos.push({
      bloco: 'condicao_alvo',
      condicao: 'queimando',
      pilhas: 1,
      duracao: 2,
    });
    blocos.push({
      bloco: 'cargas_arma',
      cargas: 2,
      bonusDano: '1d4',
      elemento: 'fogo',
    });
    return blocos;
  }

  // 2. CURA DE VIDA
  if (/cura\s+toda\s+a\s+vida|restaura\s+toda\s+a\s+vida/i.test(fullText)) {
    blocos.push({ bloco: 'cura', valor: 'max' });
  } else {
    const matchCura =
      fullText.match(/(?:cura|recupera)\s+(\d+d\d+(?:\s*\+\s*\d+)?)/i) ||
      fullText.match(/(?:cura|recupera)\s+(\d+)\s*(?:pv|pontos|vida)/i) ||
      fullText.match(/(\d+d\d+(?:\s*\+\s*\d+)?)\s*(?:de\s+cura|pv|vida)/i);
    if (matchCura) {
      blocos.push({ bloco: 'cura', valor: matchCura[1] });
    }
  }

  // 3. RECUPERAÇÃO DE FOCO
  if (/recupera\s+todo\s+o\s+foco|restaura\s+todo\s+o\s+foco/i.test(fullText)) {
    blocos.push({ bloco: 'cura_foco', valor: 'max' });
  } else {
    const matchFoco =
      fullText.match(/(?:recupera|restaura)\s+(\d+)\s+de\s+foco/i) ||
      fullText.match(/foco\s*\+?\s*(\d+)/i) ||
      fullText.match(/(\d+)\s*(?:ponto|pontos)?\s*de\s+foco/i);
    if (matchFoco) {
      blocos.push({ bloco: 'cura_foco', valor: Number(matchFoco[1]) });
    }
  }

  // 4. REMOÇÃO DE CONDIÇÕES NEGATIVAS
  if (/remove\s+sangrando|estancar|estanca/i.test(fullText)) {
    blocos.push({ bloco: 'remover_efeito', condicao: 'sangrando' });
  }
  if (/remove\s+envenenado|ant[ií]doto|veneno/i.test(fullText)) {
    blocos.push({ bloco: 'remover_efeito', condicao: 'envenenado' });
  }
  if (/doen[çc]a|febre|purifica[çc][aã]o/i.test(fullText)) {
    blocos.push({ bloco: 'remover_efeito', condicao: 'doente' });
  }
  if (/amedrontad[oa]|coragem|pavor/i.test(fullText)) {
    blocos.push({ bloco: 'remover_efeito', condicao: 'amedrontado' });
  }
  if (/vis[aã]o\s+da\s+coruja|cegueira|cego/i.test(fullText)) {
    blocos.push({ bloco: 'remover_efeito', condicao: 'cego' });
  }
  if (/pele\s+de\s+salamandra|apaga|queimand[oa]/i.test(fullText)) {
    blocos.push({ bloco: 'remover_efeito', condicao: 'queimando' });
  }
  if (/sangue\s+do\s+norte|gelad[oa]/i.test(fullText)) {
    blocos.push({ bloco: 'remover_efeito', condicao: 'gelado' });
  }
  if (/purifica[çc][aã]o\s+suprema|cura\s+suprema/i.test(fullText)) {
    blocos.push({ bloco: 'remover_efeito', condicao: 'corroido' });
    blocos.push({ bloco: 'remover_efeito', condicao: 'marca_peste' });
  }

  // 5. BUFFS DE COMBATE (Força do Touro, Fúria, Precisão)
  if (/for[çc]a\s+do\s+touro|t[oô]nico\s+da\s+f[uú]ria|f[uú]ria/i.test(fullText)) {
    blocos.push({ bloco: 'vantagem' });
    const matchDanoExtra = fullText.match(/\+(\d+d\d+)\s+de\s+dano/i);
    blocos.push({
      bloco: 'cargas_arma',
      cargas: 3,
      bonusDano: matchDanoExtra ? matchDanoExtra[1] : '1d6',
      elemento: 'fisico',
    });
  }

  // 6. DEFESA E PROTEÇÃO (Pele de Pedra)
  if (/pele\s+de\s+pedra|defesa\s*\+\s*(\d+)/i.test(fullText)) {
    const matchDef = fullText.match(/defesa\s*\+\s*(\d+)/i);
    blocos.push({ bloco: 'bonus_defesa', valor: matchDef ? Number(matchDef[1]) : 2 });
  }

  // 7. AGILIDADE, VELOCIDADE E SORTE
  if (/agilidade\s+do\s+gato|velocidade|sorte/i.test(fullText)) {
    blocos.push({ bloco: 'vantagem' });
  }

  // 8. INVISIBILIDADE
  if (/invisib/i.test(fullText)) {
    blocos.push({ bloco: 'condicao', condicao: 'invisivel', duracao: 2 });
  }

  // 9. SANGUE DE TROLL / REGENERAÇÃO
  if (/sangue\s+de\s+troll|regenera/i.test(fullText)) {
    blocos.push({ bloco: 'cura', valor: '1d6' });
    blocos.push({ bloco: 'remover_efeito', condicao: 'sangrando' });
  }

  // 10. VOZ DE DRAGÃO / INTIMIDAÇÃO
  if (/voz\s+de\s+drag[aã]o|rugido/i.test(fullText)) {
    blocos.push({ bloco: 'condicao_alvo', condicao: 'amedrontado', duracao: 2 });
  }

  // 11. POÇÃO DO SONO
  if (/po[çc][aã]o\s+do\s+sono|dorme/i.test(fullText)) {
    blocos.push({ bloco: 'condicao_alvo', condicao: 'atordoado', duracao: 1 });
  }

  return blocos;
}
