/**
 * MOTOR DO GRIMÓRIO & SISTEMA DE RESOLUÇÃO DE MAGIAS DE ALDRENOR
 * Suporte completo aos 1000 feitiços em blocos + 34 condições canônicas.
 * Compatível tanto com a Edge Function quanto com o motor local integrado.
 */

import { getGrimorioMotor } from '../features/grimoire/api';
import { supabase } from '../shared/supabase';

// ── TABELA CANÔNICA DE SURTO MÁGICO (DUPLO 1 NO 2d6) ──
export const TABELA_SURTO_MAGICO = [
  {
    dado: 1,
    nome: 'Repercussão Arcana Violenta',
    descricao:
      'A trama mágica implode no corpo do conjurador; sofre dano mágico igual a 1d6 + círculo da magia.',
    efeito: 'dano_proprio',
  },
  {
    dado: 2,
    nome: 'Erupção Estática / Onda de Choque',
    descricao:
      'Uma onda de choque emana do conjurador; todos a até 3m (aliados e inimigos) são empurrados 2m.',
    efeito: 'onda_choque',
  },
  {
    dado: 3,
    nome: 'Dreno Severo de Foco',
    descricao:
      'O canal místico se rompe e drena a energia da alma; o conjurador perde +1 de Foco adicional.',
    efeito: 'perda_foco',
  },
  {
    dado: 4,
    nome: 'Cegueira Espectral',
    descricao:
      'Clarões de energia pura queimam os olhos do conjurador; fica com a condição Cego por 1 rodada.',
    efeito: 'condicao_cego',
  },
  {
    dado: 5,
    nome: 'Distorção Temporal / Lentidão',
    descricao:
      'O tempo vacila ao redor do conjurador; fica com a condição Lento (-2 na Defesa) até o fim da próxima rodada.',
    efeito: 'condicao_lento',
  },
  {
    dado: 6,
    nome: 'Vórtice Incontrolável',
    descricao:
      'A magia se desvia violentamente e seu impacto atinge um combatente aleatório no campo de batalha!',
    efeito: 'alvo_aleatorio',
  },
];

export function rolarSurtoMagico(circulo = 0) {
  const dado = Math.floor(Math.random() * 6) + 1;
  const surto = TABELA_SURTO_MAGICO.find((s) => s.dado === dado) || TABELA_SURTO_MAGICO[0];
  let danoExtra = 0;
  if (surto.efeito === 'dano_proprio') {
    danoExtra = Math.floor(Math.random() * 6) + 1 + Number(circulo || 0);
  }
  return {
    ...surto,
    danoExtra,
    textoLog: `💥 SURTO MÁGICO (Rolou ${dado} no d6): ${surto.nome}! ${surto.descricao}${danoExtra > 0 ? ` (Sofreu ${danoExtra} de dano direto!)` : ''}`,
  };
}

// ── RISCO DE MAGIAS DA FONTE PESTE ──
export function verificarRiscoPeste(risco) {
  if (!risco || !risco.peste) return { ganhaPeste: false, textoLog: null };
  const txt = (risco.texto || '').toLowerCase();

  if (txt.includes('sempre')) {
    return {
      ganhaPeste: true,
      textoLog: '☠️ Risco da Peste inevitável: A mácula consome o conjurador (+1 Peste)!',
    };
  }

  const dado = Math.floor(Math.random() * 6) + 1;
  if (txt.includes('1 a 3') && dado <= 3) {
    return {
      ganhaPeste: true,
      dado,
      textoLog: `☠️ Risco da Peste disparou! Rolou ${dado} no d6 (1 a 3) -> +1 Peste adquirida!`,
    };
  }
  if ((txt.includes('1 ou 2') || txt.includes('1 e 2')) && dado <= 2) {
    return {
      ganhaPeste: true,
      dado,
      textoLog: `☠️ Risco da Peste disparou! Rolou ${dado} no d6 (1 ou 2) -> +1 Peste adquirida!`,
    };
  }
  if (txt.includes('com 1') && dado === 1) {
    return {
      ganhaPeste: true,
      dado,
      textoLog: `☠️ Risco da Peste disparou! Rolou 1 no d6 -> +1 Peste adquirida!`,
    };
  }

  return {
    ganhaPeste: false,
    dado,
    textoLog: `🛡️ Conjurador resistiu ao contágio da Peste (rolou ${dado} no d6).`,
  };
}

// ── PIPELINE MECÂNICO DAS 34 CONDIÇÕES ──
export function avaliarPipelineCondicoes(ator, alvo = null, options = {}) {
  const getCondicoesIds = (entidade) => {
    if (!entidade || !entidade.condicoes) return [];
    if (Array.isArray(entidade.condicoes)) {
      return entidade.condicoes
        .map((c) => (typeof c === 'string' ? c : c.id || c.nome))
        .filter(Boolean);
    }
    return [];
  };

  const condsAtor = getCondicoesIds(ator);
  const condsAlvo = getCondicoesIds(alvo);

  let bonusAtaque = 0;
  let bonusDefesaAlvo = 0;
  let bonusDano = 0;
  let temVantagem = false;
  let temDesvantagem = false;
  let silenciado = false;
  let impedidoAgir = false;

  // Gatilhos do Ator
  if (condsAtor.includes('cancao')) bonusAtaque += 1;
  if (condsAtor.includes('doente')) bonusAtaque -= 1;
  if (condsAtor.includes('gelado')) bonusAtaque -= 1;
  if (condsAtor.includes('abencoado')) {
    bonusAtaque += Math.floor(Math.random() * 4) + 1; // +1d4
  }
  if (condsAtor.includes('fortalecido')) {
    bonusDano += Math.floor(Math.random() * 4) + 1; // +1d4
  }
  if (condsAtor.includes('enfraquecido')) bonusDano -= 2;

  if (condsAtor.includes('escondido')) temVantagem = true;
  if (
    condsAtor.includes('cego') ||
    condsAtor.includes('envenenado') ||
    condsAtor.includes('exausto')
  ) {
    temDesvantagem = true;
  }
  if (condsAtor.includes('silenciado')) silenciado = true;
  if (
    condsAtor.includes('atordoado') ||
    condsAtor.includes('congelado') ||
    condsAtor.includes('dormindo')
  ) {
    impedidoAgir = true;
  }

  // Gatilhos do Alvo
  if (alvo) {
    if (condsAlvo.includes('protegido')) bonusDefesaAlvo += 2;
    if (condsAlvo.includes('exposto')) bonusDefesaAlvo -= 2;

    const pilhasCorroido =
      (alvo.condicoes || []).filter((c) => (typeof c === 'string' ? c : c.id) === 'corroido')
        .length || (condsAlvo.includes('corroido') ? 1 : 0);
    if (pilhasCorroido > 0) bonusDefesaAlvo -= pilhasCorroido;

    if (condsAlvo.includes('caido') || condsAlvo.includes('dormindo')) {
      temVantagem = true;
    }
  }

  return {
    bonusAtaque,
    bonusDefesaAlvo,
    bonusDano,
    temVantagem,
    temDesvantagem,
    silenciado,
    impedidoAgir,
    condsAtor,
    condsAlvo,
  };
}

// ── AUXILIARES DE ROLAGEM ──
function rolarDado(faces = 6) {
  return Math.floor(Math.random() * faces) + 1;
}

export function rolarExpressao(expr = '1d6') {
  if (typeof expr === 'number') {
    return { total: expr, maximo: expr, desc: `${expr}` };
  }
  const clean = String(expr).toLowerCase().trim();
  const match = clean.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
  if (!match) {
    const val = Number.parseInt(clean, 10);
    if (!isNaN(val)) return { total: val, maximo: val, desc: `${val}` };
    const r = rolarDado(6);
    return { total: r, maximo: 6, desc: `1d6(${r})` };
  }
  const qtd = Number.parseInt(match[1], 10);
  const faces = Number.parseInt(match[2], 10);
  const bonus = match[3] ? Number.parseInt(match[3], 10) : 0;
  const rolls = [];
  let soma = 0;
  for (let i = 0; i < qtd; i++) {
    const r = rolarDado(faces);
    rolls.push(r);
    soma += r;
  }
  const total = soma + bonus;
  const maximo = qtd * faces + bonus;
  return {
    total,
    maximo,
    desc: `${qtd}d${faces}${bonus > 0 ? `+${bonus}` : ''} (${rolls.join('+')}${bonus > 0 ? `+${bonus}` : ''}) = ${total}`,
  };
}

export function rolar2d6(vantagem = false, desvantagem = false, resultadoFisico = null) {
  if (
    resultadoFisico &&
    typeof resultadoFisico.d1 === 'number' &&
    typeof resultadoFisico.d2 === 'number'
  ) {
    const d1 = resultadoFisico.d1;
    const d2 = resultadoFisico.d2;
    return {
      d1,
      d2,
      soma: d1 + d2,
      isDuplo6: d1 === 6 && d2 === 6,
      isDuplo1: d1 === 1 && d2 === 1,
      dados: [d1, d2],
      tipo: 'fisico',
    };
  }

  if (vantagem && desvantagem) {
    vantagem = false;
    desvantagem = false;
  }

  if (vantagem) {
    const r = [rolarDado(6), rolarDado(6), rolarDado(6)].sort((a, b) => b - a);
    return {
      d1: r[0],
      d2: r[1],
      soma: r[0] + r[1],
      isDuplo6: r[0] === 6 && r[1] === 6,
      isDuplo1: r[0] === 1 && r[1] === 1,
      dados: r,
      tipo: 'vantagem',
    };
  }

  if (desvantagem) {
    const r = [rolarDado(6), rolarDado(6), rolarDado(6)].sort((a, b) => a - b);
    return {
      d1: r[0],
      d2: r[1],
      soma: r[0] + r[1],
      isDuplo6: r[0] === 6 && r[1] === 6,
      isDuplo1: r[0] === 1 && r[1] === 1,
      dados: r,
      tipo: 'desvantagem',
    };
  }

  const d1 = rolarDado(6);
  const d2 = rolarDado(6);
  return {
    d1,
    d2,
    soma: d1 + d2,
    isDuplo6: d1 === 6 && d2 === 6,
    isDuplo1: d1 === 1 && d2 === 1,
    dados: [d1, d2],
    tipo: 'normal',
  };
}

// ── MOTOR CENTRAL: RESOLVER MAGIA ──
export async function resolverMagiaMotor({
  batalhaId,
  ator,
  alvoId,
  alvosIds = [],
  magia,
  ampliarEscolhidos = [], // [{ efeito, foco, valor }]
  resultadoFisico = null,
  participantes = [],
}) {
  const logs = [];
  const mudancasParticipantes = []; // [{ id, vida_atual, foco, condicoes, ... }]
  let gastoFocoTotal = Number(magia?.custo?.foco || magia?.circulo || 0);

  // 1. Somar ampliações de Foco
  let maisDanoValor = 0;
  let maisAlvosQtd = 0;
  let maisPilhasQtd = 0;
  let pesoMaisValor = 0;
  let duraMaisValor = 0;

  (ampliarEscolhidos || []).forEach((amp) => {
    gastoFocoTotal += Number(amp.foco || 1);
    if (amp.efeito === 'mais_dano') maisDanoValor += Number(amp.valor || 2);
    if (amp.efeito === 'mais_alvos') maisAlvosQtd += Number(amp.valor || 1);
    if (amp.efeito === 'mais_pilhas') maisPilhasQtd += Number(amp.valor || 1);
    if (amp.efeito === 'peso_mais') pesoMaisValor += Number(amp.valor || 2);
    if (amp.efeito === 'dura_mais') duraMaisValor += Number(amp.valor || 1);
  });

  // 2. Avaliar condições do Conjurador
  const pipelineAtor = avaliarPipelineCondicoes(ator);
  if (pipelineAtor.silenciado) {
    return {
      success: false,
      error: 'Você está Silenciado e não pode articular palavras de poder ou conjurar magias!',
    };
  }
  if (pipelineAtor.impedidoAgir) {
    return {
      success: false,
      error: 'Você está incapacitado de agir neste turno!',
    };
  }

  // 3. Montar lista de alvos de acordo com alvo.tipo
  const alvoTipo = magia?.alvo?.tipo || 'inimigo';
  let alvosEfetivos = [];

  if (alvosIds && alvosIds.length > 0) {
    alvosEfetivos = participantes.filter((p) => alvosIds.includes(p.id));
  } else if (alvoId) {
    const alvoUnico = participantes.find((p) => p.id === alvoId);
    if (alvoUnico) alvosEfetivos.push(alvoUnico);
  }

  if (alvosEfetivos.length === 0) {
    if (alvoTipo === 'eu') {
      alvosEfetivos = [ator];
    } else if (alvoTipo === 'eu_ou_aliado' || alvoTipo === 'todos_aliados') {
      alvosEfetivos = participantes.filter((p) => p.tipo === ator.tipo);
    } else {
      // Pega o primeiro inimigo vivo
      const inimigo = participantes.find(
        (p) => p.tipo !== ator.tipo && Number(p.vida_atual) > 0 && !p.fugiu,
      );
      if (inimigo) alvosEfetivos.push(inimigo);
    }
  }

  const nomeConjurador = ator?.detalhes?.name || ator?.nome || 'Conjurador';
  const nomeMagia = magia.nome || 'Magia';
  logs.push({
    texto: `✨ [${nomeConjurador}] conjura [${nomeMagia}] (${magia.escola} · Círculo ${magia.circulo})!`,
    tipo: 'conjura_magia',
    cor: magia.cor || '#93c5fd',
  });

  // 4. Avaliar Risco da Peste se a fonte for Peste
  if (magia.fonte === 'Peste' && magia.risco) {
    const resPeste = verificarRiscoPeste(magia.risco);
    if (resPeste.textoLog) {
      logs.push({ texto: resPeste.textoLog, tipo: 'risco_peste', alerta: resPeste.ganhaPeste });
    }
    if (resPeste.ganhaPeste && ator.personagem_id) {
      try {
        await supabase.rpc('adicionar_peste', { p_character_id: ator.personagem_id, p_qtd: 1 });
      } catch (_) {
        // Fallback direto
        try {
          const { data: charData } = await supabase
            .from('characters')
            .select('plague')
            .eq('id', ator.personagem_id)
            .single();
          if (charData) {
            await supabase
              .from('characters')
              .update({ plague: (Number(charData.plague) || 0) + 1 })
              .eq('id', ator.personagem_id);
          }
        } catch (_) {}
      }
    }
  }

  // 5. Avaliar Tipo de Resolução (automatica, ataque, ataque_area, resistencia, teste_conjurador)
  const resolucaoTipo = magia?.resolucao?.tipo || 'automatica';
  let surtoDisparado = false;
  let acertouGeral = true;

  // Processar cada alvo
  for (const alvo of alvosEfetivos) {
    const nomeAlvo = alvo?.detalhes?.nome || alvo?.detalhes?.name || alvo?.nome || 'Alvo';
    const pipelineCombate = avaliarPipelineCondicoes(ator, alvo);

    let acertou = true;
    let criticoDuplo6 = false;
    let falhaCriticaDuplo1 = false;
    let danoReduzidoMetade = false;

    // Resolução: ATAQUE ou ATAQUE_AREA
    if (resolucaoTipo === 'ataque' || resolucaoTipo === 'ataque_area') {
      const rolagem = rolar2d6(
        pipelineCombate.temVantagem,
        pipelineCombate.temDesvantagem,
        resultadoFisico,
      );
      const modVontade = Number(ator?.detalhes?.attributes?.vontade || 0);
      const totalAtaque = rolagem.soma + modVontade + pipelineCombate.bonusAtaque;
      const defesaEfetiva = Math.max(
        1,
        Number(alvo.defesa || 10) + pipelineCombate.bonusDefesaAlvo,
      );

      criticoDuplo6 = rolagem.isDuplo6;
      falhaCriticaDuplo1 = rolagem.isDuplo1;

      if (falhaCriticaDuplo1 && !surtoDisparado) {
        surtoDisparado = true;
        const surto = rolarSurtoMagico(magia.circulo);
        logs.push({ texto: surto.textoLog, tipo: 'surto_magico', alerta: true });
        if (surto.danoExtra > 0) {
          mudancasParticipantes.push({
            id: ator.id,
            danoSofrido: surto.danoExtra,
            motivo: 'Surto Mágico',
          });
        }
      }

      if (criticoDuplo6) {
        acertou = true;
        logs.push({
          texto: `🌟 DUPLO 6 CRÍTICO! [${nomeConjurador}] desfere um impacto mágico supremo! (+1 Inspiração concedida)`,
          tipo: 'critico',
        });
      } else if (totalAtaque >= defesaEfetiva) {
        acertou = true;
        logs.push({
          texto: `🎯 Ataque Mágico: [${nomeConjurador}] rolou 2d6(${rolagem.d1}+${rolagem.d2})+${modVontade} = ${totalAtaque} vs Defesa ${defesaEfetiva} de [${nomeAlvo}] -> ACERTOU!`,
          tipo: 'ataque_acerto',
        });
      } else {
        acertou = false;
        acertouGeral = false;
        if (resolucaoTipo === 'ataque_area') {
          danoReduzidoMetade = true;
          logs.push({
            texto: `🛡️ Área salvaguardada: [${nomeAlvo}] esquivou-se parcialmente (${totalAtaque} vs ${defesaEfetiva}), sofrendo apenas METADE do dano!`,
            tipo: 'resistencia_metade',
          });
        } else {
          logs.push({
            texto: `❌ O ataque mágico errou [${nomeAlvo}] (${totalAtaque} vs Defesa ${defesaEfetiva}).`,
            tipo: 'ataque_erro',
          });
          continue; // Não aplica efeitos diretos no alvo que errou
        }
      }
    }

    // Resolução: RESISTÊNCIA DO ALVO
    else if (resolucaoTipo === 'resistencia') {
      const attrRes = magia.resolucao.atributo || 'corpo';
      const modAttrAlvo = Number(alvo?.detalhes?.attributes?.[attrRes] || 0);
      const rolagemRes = rolar2d6(false, false);
      const totalRes = rolagemRes.soma + modAttrAlvo;
      const pesoDC = Number(magia.resolucao.peso || 10) + pesoMaisValor;

      if (totalRes >= pesoDC) {
        logs.push({
          texto: `🛡️ Resistência: [${nomeAlvo}] rolou 2d6(${rolagemRes.d1}+${rolagemRes.d2})+${modAttrAlvo} = ${totalRes} vs DC ${pesoDC} de ${attrRes.toUpperCase()} e RESISTIU!`,
          tipo: 'resistencia_sucesso',
        });
        danoReduzidoMetade = true;
      } else {
        logs.push({
          texto: `💥 Falha na Resistência: [${nomeAlvo}] rolou ${totalRes} vs DC ${pesoDC} e SUCUMBIU ao efeito!`,
          tipo: 'resistencia_falha',
        });
      }
    }

    // Resolução: TESTE DO CONJURADOR
    else if (resolucaoTipo === 'teste_conjurador') {
      const attr = magia.resolucao.atributo || 'vontade';
      const modAttr = Number(ator?.detalhes?.attributes?.[attr] || 0);
      const rolagemCaster = rolar2d6(
        pipelineCombate.temVantagem,
        pipelineCombate.temDesvantagem,
        resultadoFisico,
      );
      const totalCaster = rolagemCaster.soma + modAttr;
      const pesoDC = Number(magia.resolucao.peso || 10);

      if (totalCaster >= pesoDC) {
        logs.push({
          texto: `🔮 Teste de Conjurador: [${nomeConjurador}] superou a trama mística (${totalCaster} vs DC ${pesoDC})!`,
          tipo: 'teste_sucesso',
        });
      } else {
        logs.push({
          texto: `⚠️ Teste de Conjurador: [${nomeConjurador}] vacilou na canalização (${totalCaster} vs DC ${pesoDC}). O efeito se dispersou.`,
          tipo: 'teste_falha',
        });
        continue;
      }
    }

    // ── PROCESSAR BLOCOS DE EFEITOS NO ALVO ──
    const blocosEfeitos = Array.isArray(magia.efeitos) ? magia.efeitos : [];
    let danoCalculado = 0;
    let curaCalculada = 0;
    const condicoesParaAdicionar = [];
    const condicoesParaRemover = [];

    for (const ef of blocosEfeitos) {
      // BLOCO: DANO
      if (ef.bloco === 'dano') {
        const baseDano = rolarExpressao(ef.valor || '1d8');
        let danoFinal = criticoDuplo6 ? baseDano.maximo : baseDano.total;
        danoFinal += maisDanoValor + pipelineCombate.bonusDano;

        // Resistências a fogo e gelo
        const tipoElem = (ef.tipo || '').toLowerCase();
        if (tipoElem.includes('fogo') && pipelineCombate.condsAlvo.includes('resist_fogo')) {
          danoFinal = Math.floor(danoFinal / 2);
        }
        if (
          (tipoElem.includes('gelo') || tipoElem.includes('frio')) &&
          pipelineCombate.condsAlvo.includes('resist_frio')
        ) {
          danoFinal = Math.floor(danoFinal / 2);
        }

        if (danoReduzidoMetade) {
          danoFinal = Math.floor(danoFinal / 2);
        }

        danoCalculado += Math.max(1, danoFinal);
        logs.push({
          texto: `🩸 Dano Mágico [${ef.tipo || 'Arcano'}]: [${nomeAlvo}] sofreu ${danoCalculado} de dano! (${baseDano.desc})`,
          tipo: 'dano_magico',
        });
      }

      // BLOCO: CURA
      else if (ef.bloco === 'cura') {
        const heal = rolarExpressao(ef.valor || '1d8');
        curaCalculada += heal.total;
        logs.push({
          texto: `💚 Luz Curativa: [${nomeAlvo}] recuperou ${heal.total} pontos de Vida! (${heal.desc})`,
          tipo: 'cura_magica',
        });
      }

      // BLOCO: CURA TOTAL
      else if (ef.bloco === 'cura_total') {
        curaCalculada = 9999;
        logs.push({
          texto: `✨ Cura Total: Todas as feridas de [${nomeAlvo}] foram instantaneamente cicatrizadas!`,
          tipo: 'cura_total',
        });
      }

      // BLOCO: CONDICAO
      else if (ef.bloco === 'condicao') {
        if (danoReduzidoMetade && ef.se === 'falhou') {
          // Passou na resistência, evita condição
          continue;
        }
        const condId = ef.condicao;
        const pilhas = (Number(ef.pilhas) || 1) + maisPilhasQtd + (criticoDuplo6 ? 1 : 0);
        const duracao = (Number(ef.duracao) || 2) + duraMaisValor;

        condicoesParaAdicionar.push({
          id: condId,
          nome: condId,
          pilhas,
          duracao,
        });

        logs.push({
          texto: `⚡ Condição Aplicada: [${nomeAlvo}] agora está [${condId.toUpperCase()}] (${pilhas} pilha(s), ${duracao} rodadas)!`,
          tipo: 'condicao_aplicada',
        });
      }

      // BLOCO: REMOVER EFEITO
      else if (ef.bloco === 'remover_efeito' || ef.bloco === 'dissipar') {
        const condARemover = ef.condicao || ef.efeito;
        condicoesParaRemover.push(condARemover);
        logs.push({
          texto: `✨ Dissipação: Efeito [${condARemover || 'mágico'}] removido de [${nomeAlvo}].`,
          tipo: 'efeito_removido',
        });
      }

      // BLOCO: INVOCACAO (Cria participante aliado na arena)
      else if (ef.bloco === 'invocacao') {
        const invVida = Number(ef.vida || 15);
        const invDefesa = Number(ef.defesa || 10);
        const invNome = ef.nome || `${magia.nome} Invocado`;
        logs.push({
          texto: `🦅 Invocação Primordial: [${invNome}] (PV ${invVida} · Def ${invDefesa}) surge na arena para lutar ao lado dos heróis!`,
          tipo: 'invocacao_criada',
        });
        mudancasParticipantes.push({
          novaInvocacao: {
            batalha_id: batalhaId,
            tipo: 'aliado',
            nome: invNome,
            vida_atual: invVida,
            vida_max: invVida,
            defesa: invDefesa,
            iniciativa: (ator.iniciativa || 10) - 1,
            condicoes: [],
          },
        });
      }

      // BLOCO: NARRATIVO OU REVISAR MESTRE
      else if (ef.bloco === 'narrativo' || magia.revisar_mestre) {
        logs.push({
          texto: `📜 [AVISO AO MESTRE]: A magia [${magia.nome}] possui efeito narrativo complexo: "${ef.texto || magia.resumo}"`,
          tipo: 'aviso_narrativo_mestre',
          alertaMestre: true,
        });
      }
    }

    // Registrar alterações deste alvo
    mudancasParticipantes.push({
      id: alvo.id,
      danoSofrido: danoCalculado,
      curaRecebida: curaCalculada,
      condicoesAdd: condicoesParaAdicionar,
      condicoesRemove: condicoesParaRemover,
    });
  }

  return {
    success: true,
    acertou: acertouGeral,
    gastoFocoTotal,
    logs,
    mudancasParticipantes,
    magia,
    revisarMestre: Boolean(
      magia.revisar_mestre || magia.efeitos?.some((e) => e.bloco === 'narrativo'),
    ),
  };
}

// ── CONSULTAS CANÔNICAS (COM FALLBACK EM MEMÓRIA PARA 1000 MAGIAS E CONDIÇÕES) ──
export async function buscarCatalogoMagias({
  search = '',
  escola = '',
  circulo = null,
  categoria = '',
} = {}) {
  try {
    let query = supabase
      .from('magias')
      .select(
        'id, nome, escola, circulo, tipo_acao, alcance, area, duracao, custo_foco, peso, atributo_chave, pericia, descricao, efeito_sucesso, efeito_brilhante, efeito_falha, blocos, tags, em_combate, icone, categoria_ui, resumo',
      )
      .order('circulo', { ascending: true })
      .order('nome', { ascending: true });
    if (search) query = query.ilike('nome', `%${search.trim()}%`);
    if (escola) query = query.eq('escola', escola);
    if (circulo !== null && circulo !== undefined && circulo !== '')
      query = query.eq('circulo', Number(circulo));
    if (categoria) query = query.eq('categoria_ui', categoria);

    const { data, error } = await query;
    if (!error && data && data.length > 0) return data;
  } catch (_) {}

  // Fallback transparente usando o JSON canônico completo de 1000 magias
  const localGrimorio = await getGrimorioMotor();
  let list = localGrimorio.magias || [];
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(
      (m) => m.nome.toLowerCase().includes(s) || (m.resumo && m.resumo.toLowerCase().includes(s)),
    );
  }
  if (escola) list = list.filter((m) => m.escola === escola);
  if (circulo !== null && circulo !== undefined && circulo !== '')
    list = list.filter((m) => m.circulo === Number(circulo));
  if (categoria) list = list.filter((m) => m.categoria_ui === categoria);
  return list;
}

export async function buscarCondicoesCatalogo() {
  try {
    const { data, error } = await supabase
      .from('condicoes')
      .select(
        'id, nome, tipo, categoria, duracao_padrao, tique_dano, tique_formula, efeito_mecanico, empilhavel, cura_por, combo_elemental, icone, cor, descricao',
      )
      .order('nome');
    if (!error && data && data.length > 0) return data;
  } catch (_) {}

  // Fallback JSON canônico
  const localGrimorio = await getGrimorioMotor();
  return Object.entries(localGrimorio.condicoes || {}).map(([id, c]) => ({
    id,
    nome: c.nome,
    efeito: c.efeito,
    tipo: c.tipo,
    dados: c,
  }));
}

export async function buscarMagiasAprendidasHeroi(characterId) {
  if (!characterId) return [];
  try {
    // 1. Tenta tabela personagem_magias
    const { data, error } = await supabase
      .from('personagem_magias')
      .select('*, magias(*)')
      .eq('character_id', characterId)
      .eq('aprendida', true);

    if (!error && data && data.length > 0) {
      return data.map((d) => d.magias || d).filter(Boolean);
    }

    // 2. Tenta view heroi_magias
    const { data: hmData, error: hmErr } = await supabase
      .from('heroi_magias')
      .select('*, magias(*)')
      .eq('character_id', characterId)
      .eq('aprendida', true);

    if (!hmErr && hmData && hmData.length > 0) {
      return hmData.map((d) => d.magias || d).filter(Boolean);
    }
  } catch (_) {}

  // Fallback: se nenhuma foi registrada no banco ainda, oferece truques e magias iniciais de combate do grimório
  const localGrimorio = await getGrimorioMotor();
  return (localGrimorio.magias || []).filter((m) => m.circulo <= 1 && m.em_combate).slice(0, 8);
}
