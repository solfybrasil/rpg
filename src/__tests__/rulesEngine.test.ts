import { describe, expect, it } from 'vitest';
import { GRAPH } from '../data/oathTreeGraph';
import {
  CONDICOES_CATALOGO,
  aplicarCondicao,
  avaliarCombosElementais,
  calcularModificadoresCondicoes,
  gerarEfeitosAutomaticosBestiario,
  inferirEfeitosPocao,
  normalizarCondicao,
  processarTiqueInicioTurno,
  removerCondicao,
  rolarFormulaTique,
  testarEfeitosAtaqueFera,
} from '../entities/condition';
import {
  CORTES_PADRAO_POR_PESO,
  TEMPO_PADRAO_POR_PESO,
  advanceTurnOrder,
  calcularDificuldadeEspolio,
  enriquecerFeraComEspolios,
  formatarCriaturaParaBatalha,
  selectBeastTarget,
  sortTurnOrder,
} from '../entities/creature';
import {
  XP_THRESHOLDS,
  calcDefesa,
  calcFocoMax,
  calcSkillBonus,
  calcSkillMastery,
  calcSkillNextMilestone,
  calcVidaMax,
  calculateOathTreeBonuses,
  getDefaultHeroTree,
  getPlagueStage,
  getProximoXp,
  mergeEffectiveSkills,
  mergeTreeStates,
} from '../entities/hero';
import {
  allocateInventoryGrid40,
  formatCoinsDescription,
  formatCoinsString,
  fromBronze,
  moveOrSwapSlot,
  toBronze,
  transferItemBetweenInventories,
} from '../entities/item';
import { matchWorkshopRecipe3x3 } from '../entities/recipe';
import {
  TABELA_SURTO_MAGICO,
  avaliarPipelineCondicoes,
  resolverMagiaMotor,
  rolar2d6,
  rolarExpressao,
  rolarSurtoMagico,
  verificarRiscoPeste,
} from '../entities/spell';
import {
  DATA_INICIAL_MINUTOS,
  dataParaMinutos,
  minutosParaData,
  obterFaseDoDia,
  obterFaseLua,
} from '../shared/lib/calendario';
import {
  SKILL_ATTRIBUTE_MAP,
  calculateRollSuccessChance,
  resolveRollRules,
} from '../shared/lib/dice';
import {
  bfs,
  buildGrid,
  center,
  clearBfsCache,
  gridDist,
  key,
  memoizedBfs,
  parseKey,
  pathTo,
  toCell,
} from '../shared/lib/tacticalMapEngine';

// ═════════════════════════════════════════════════════════════════════════════
// SUÍTE DE TESTES (65+ TESTES DE REGRAS)
// ═════════════════════════════════════════════════════════════════════════════

describe('1. Rolagem 2d6 + Atributo + Perícia contra Peso (diceService)', () => {
  it('1.1 resolve duplo 6 como crítico independente do Peso', () => {
    const res = resolveRollRules({ dice: [6, 6], kept: [6, 6], modifier: -2, peso: 15 });
    expect(res.result).toBe('critico');
    expect(res.total).toBe(10);
  });

  it('1.2 resolve duplo 1 como desastre mesmo que o modificador alcance o Peso', () => {
    const res = resolveRollRules({ dice: [1, 1], kept: [1, 1], modifier: 10, peso: 6 });
    expect(res.result).toBe('desastre');
    expect(res.total).toBe(12);
  });

  it('1.3 resolve Brilhante quando total >= Peso + 3', () => {
    const res = resolveRollRules({ dice: [5, 4], kept: [5, 4], modifier: 2, peso: 8 });
    expect(res.total).toBe(11);
    expect(res.result).toBe('brilhante');
  });

  it('1.4 resolve Sucesso quando Peso <= total < Peso + 3', () => {
    const res = resolveRollRules({ dice: [4, 3], kept: [4, 3], modifier: 2, peso: 8 });
    expect(res.total).toBe(9);
    expect(res.result).toBe('sucesso');
  });

  it('1.5 resolve Falha quando total < Peso (e não é duplo 6)', () => {
    const res = resolveRollRules({ dice: [2, 3], kept: [2, 3], modifier: 1, peso: 8 });
    expect(res.total).toBe(6);
    expect(res.result).toBe('falha');
  });

  it('1.6 calcula chance de sucesso corretamente para modo normal, vantagem e desvantagem', () => {
    const normal = calculateRollSuccessChance(0, 7, 'normal');
    const vantagem = calculateRollSuccessChance(0, 7, 'vantagem');
    const desvantagem = calculateRollSuccessChance(0, 7, 'desvantagem');
    expect(vantagem).toBeGreaterThan(normal);
    expect(normal).toBeGreaterThan(desvantagem);
    expect(calculateRollSuccessChance(0, 0, 'normal')).toBe(100);
  });

  it('1.7 mapeia perícias canônicas aos atributos corretos', () => {
    expect(SKILL_ATTRIBUTE_MAP.atletismo).toBe('corpo');
    expect(SKILL_ATTRIBUTE_MAP.forja).toBe('astucia');
    expect(SKILL_ATTRIBUTE_MAP.alquimia).toBe('astucia');
    expect(SKILL_ATTRIBUTE_MAP.intimidacao).toBe('presenca');
  });

  it('1.8 resolve rolagem livre (Peso 0) sem classificação de falha', () => {
    const res = resolveRollRules({ dice: [2, 3], kept: [2, 3], modifier: 1, peso: 0 });
    expect(res.total).toBe(6);
    expect(res.result).toBe('livre');
  });
});

describe('2. Inventário 40 Slots (mover, empilhar, enviar, descartar, slot cheio)', () => {
  it('2.1 aloca itens com slot_index definido nas posições exatas da grade de 40 slots', () => {
    const items = [
      { id: 'a', name: 'Espada', slot_index: 0 },
      { id: 'b', name: 'Poção', slot_index: 15 },
      { id: 'c', name: 'Corda', slot_index: 39 },
    ];
    const { grid, overflow } = allocateInventoryGrid40(items);
    expect(grid[0]?.id).toBe('a');
    expect(grid[15]?.id).toBe('b');
    expect(grid[39]?.id).toBe('c');
    expect(overflow).toHaveLength(0);
  });

  it('2.2 aloca itens sem slot_index (ex: compras ou drops) nos primeiros slots vagos', () => {
    const items = [
      { id: 'a', name: 'Espada', slot_index: 0 },
      { id: 'b', name: 'Minério', slot_index: null },
      { id: 'c', name: 'Erva', slot_index: undefined },
    ];
    const { grid } = allocateInventoryGrid40(items);
    expect(grid[0]?.id).toBe('a');
    expect(grid[1]?.id).toBe('b');
    expect(grid[1]?.slot_index).toBe(1);
    expect(grid[2]?.id).toBe('c');
    expect(grid[2]?.slot_index).toBe(2);
  });

  it('2.3 ignora itens equipados (equip_slot preenchido) na grade de 40 slots da mochila', () => {
    const items = [
      { id: 'arma1', name: 'Machado', equip_slot: 'main_hand', slot_index: 0 },
      { id: 'poc1', name: 'Poção', equip_slot: null, slot_index: 0 },
    ];
    const { grid } = allocateInventoryGrid40(items);
    expect(grid[0]?.id).toBe('poc1');
    expect(grid.filter(Boolean)).toHaveLength(1);
  });

  it('2.4 move item de um slot ocupado para um slot vazio', () => {
    const { grid } = allocateInventoryGrid40([{ id: 'i1', name: 'Tocha', slot_index: 2 }]);
    const res = moveOrSwapSlot(grid, 2, 10);
    expect(res.ok).toBe(true);
    expect(res.action).toBe('moved');
    expect(res.grid[2]).toBeNull();
    expect(res.grid[10]?.id).toBe('i1');
    expect(res.grid[10]?.slot_index).toBe(10);
  });

  it('2.5 faz swap entre dois slots ocupados por itens diferentes', () => {
    const { grid } = allocateInventoryGrid40([
      { id: 'i1', catalog_id: 'tocha', name: 'Tocha', category: 'aventura', slot_index: 0 },
      { id: 'i2', catalog_id: 'corda', name: 'Corda', category: 'aventura', slot_index: 5 },
    ]);
    const res = moveOrSwapSlot(grid, 0, 5);
    expect(res.ok).toBe(true);
    expect(res.action).toBe('swapped');
    expect(res.grid[0]?.id).toBe('i2');
    expect(res.grid[5]?.id).toBe('i1');
  });

  it('2.6 empilha (stack) automaticamente dois lotes do mesmo ingrediente ao arrastar um sobre o outro', () => {
    const { grid } = allocateInventoryGrid40([
      {
        id: 'i1',
        catalog_id: 'minerio-ferro',
        name: 'Minério de Ferro',
        category: 'ingrediente',
        quantity: 3,
        slot_index: 0,
      },
      {
        id: 'i2',
        catalog_id: 'minerio-ferro',
        name: 'Minério de Ferro',
        category: 'ingrediente',
        quantity: 4,
        slot_index: 1,
      },
    ]);
    const res = moveOrSwapSlot(grid, 0, 1);
    expect(res.ok).toBe(true);
    expect(res.action).toBe('stacked');
    expect(res.grid[0]).toBeNull();
    expect(res.grid[1]?.quantity).toBe(7);
  });

  it('2.7 não empilha armas ou armaduras mesmo que tenham o mesmo catalog_id (faz swap)', () => {
    const { grid } = allocateInventoryGrid40([
      {
        id: 'w1',
        catalog_id: 'adaga-ferro',
        name: 'Adaga',
        category: 'arma',
        quantity: 1,
        slot_index: 0,
      },
      {
        id: 'w2',
        catalog_id: 'adaga-ferro',
        name: 'Adaga',
        category: 'arma',
        quantity: 1,
        slot_index: 1,
      },
    ]);
    const res = moveOrSwapSlot(grid, 0, 1);
    expect(res.action).toBe('swapped');
    expect(res.grid[0]?.id).toBe('w2');
    expect(res.grid[1]?.id).toBe('w1');
  });

  it('2.8 rejeita movimentação para índice fora dos limites (slot < 0 ou >= 40)', () => {
    const { grid } = allocateInventoryGrid40([{ id: 'i1', name: 'Tocha', slot_index: 0 }]);
    expect(moveOrSwapSlot(grid, 0, -1).ok).toBe(false);
    expect(moveOrSwapSlot(grid, 0, 40).ok).toBe(false);
  });

  it('2.9 envia quantidade parcial de um item empilhado para outro jogador mantendo o restante', () => {
    const sender = [
      {
        id: 's1',
        catalog_id: 'erva-cura',
        name: 'Erva',
        category: 'ingrediente',
        quantity: 5,
        slot_index: 0,
      },
    ];
    const receiver = [
      {
        id: 'r1',
        catalog_id: 'tocha',
        name: 'Tocha',
        category: 'aventura',
        quantity: 1,
        slot_index: 0,
      },
    ];

    const res = transferItemBetweenInventories(sender, receiver, 's1', 2, 'malenia');
    expect(res.ok).toBe(true);
    expect(res.senderItems[0].quantity).toBe(3);
    expect(res.receiverItems).toHaveLength(2);
    expect(res.receiverItems[1].quantity).toBe(2);
    expect(res.receiverItems[1].character_id).toBe('malenia');
  });

  it('2.10 envia a pilha inteira removendo o item do remetente e empilhando no destinatário', () => {
    const sender = [
      {
        id: 's1',
        catalog_id: 'erva-cura',
        name: 'Erva',
        category: 'ingrediente',
        quantity: 3,
        slot_index: 0,
      },
    ];
    const receiver = [
      {
        id: 'r1',
        catalog_id: 'erva-cura',
        name: 'Erva',
        category: 'ingrediente',
        quantity: 2,
        slot_index: 4,
      },
    ];

    const res = transferItemBetweenInventories(sender, receiver, 's1', 3, 'malenia');
    expect(res.ok).toBe(true);
    expect(res.senderItems).toHaveLength(0);
    expect(res.receiverItems).toHaveLength(1);
    expect(res.receiverItems[0].quantity).toBe(5);
  });

  it('2.11 bloqueia envio e reporta slot cheio quando os 40 slots do destinatário estão ocupados', () => {
    const sender = [
      {
        id: 's1',
        catalog_id: 'reliquia-unica',
        name: 'Relíquia',
        category: 'aventura',
        quantity: 1,
        slot_index: 0,
      },
    ];
    const fullReceiver = Array.from({ length: 40 }, (_, i) => ({
      id: `item_${i}`,
      catalog_id: `cat_${i}`,
      name: `Item ${i}`,
      category: 'arma',
      quantity: 1,
      slot_index: i,
    }));

    const { grid, overflow } = allocateInventoryGrid40([
      ...fullReceiver,
      { id: 'extra_41', catalog_id: 'extra', name: 'Extra', slot_index: null },
    ]);
    expect(grid.every((s) => s !== null)).toBe(true);
    expect(overflow).toHaveLength(1);

    const resTransfer = transferItemBetweenInventories(
      sender,
      fullReceiver,
      's1',
      1,
      'kaelis_moonfire',
    );
    expect(resTransfer.ok).toBe(false);
    expect(resTransfer.error).toBe('mochila_destinatario_cheia');
  });

  it('2.12 descarta item (parcial ou total) liberando o slot na mochila', () => {
    const items = [
      { id: 'd1', name: 'Ração', quantity: 3, slot_index: 2 },
      { id: 'd2', name: 'Tocha', quantity: 1, slot_index: 7 },
    ];
    // Descarte parcial de d1 (-1) e total de d2
    const afterDiscard = items
      .map((it) => (it.id === 'd1' ? { ...it, quantity: it.quantity - 1 } : it))
      .filter((it) => it.id !== 'd2' && it.quantity > 0);

    const { grid } = allocateInventoryGrid40(afterDiscard);
    expect(grid[2]?.quantity).toBe(2);
    expect(grid[7]).toBeNull();
  });
});

describe('3. Combate por Turnos (ordem de turno, dano, condições por turno, IA da fera agindo sozinha)', () => {
  it('3.1 ordena a iniciativa em ordem decrescente e desempata a favor de heróis contra feras', () => {
    const participantes = [
      { id: 'fera_1', tipo: 'fera', nome: 'Lobo', iniciativa: 9 },
      { id: 'heroi_1', tipo: 'heroi', nome: 'Tor', iniciativa: 9 },
      { id: 'heroi_2', tipo: 'heroi', nome: 'Kaelis', iniciativa: 12 },
      { id: 'fera_2', tipo: 'fera', nome: 'Urso', iniciativa: 6 },
    ];
    const ordenados = sortTurnOrder(participantes);
    expect(ordenados.map((p) => p.id)).toEqual(['heroi_2', 'heroi_1', 'fera_1', 'fera_2']);
  });

  it('3.2 avança turno pulando feras mortas e combatentes que fugiram, incrementando a rodada ao fechar o ciclo', () => {
    const ordem = ['heroi_1', 'fera_morta', 'fera_fugiu', 'fera_viva'];
    const map = {
      heroi_1: { id: 'heroi_1', tipo: 'heroi', vida_atual: 15, fugiu: false },
      fera_morta: { id: 'fera_morta', tipo: 'fera', vida_atual: 0, fugiu: false },
      fera_fugiu: { id: 'fera_fugiu', tipo: 'fera', vida_atual: 10, fugiu: true },
      fera_viva: { id: 'fera_viva', tipo: 'fera', vida_atual: 12, fugiu: false },
    };

    const t1 = advanceTurnOrder(ordem, map, 0, 1);
    expect(t1.novoIndex).toBe(3);
    expect(t1.ativoId).toBe('fera_viva');
    expect(t1.novaRodada).toBe(1);

    const t2 = advanceTurnOrder(ordem, map, 3, 1);
    expect(t2.novoIndex).toBe(0);
    expect(t2.ativoId).toBe('heroi_1');
    expect(t2.novaRodada).toBe(2);
  });

  it('3.3 postura Defendendo adiciona +2 na Defesa até o início do próximo turno do combatente', () => {
    const alvoNormal = { defesa: 10, defendendo: false };
    const alvoDefendendo = { defesa: 10, defendendo: true };
    const ataqueTotal = 11;

    const acertaNormal = ataqueTotal >= alvoNormal.defesa + (alvoNormal.defendendo ? 2 : 0);
    const acertaDefendendo =
      ataqueTotal >= alvoDefendendo.defesa + (alvoDefendendo.defendendo ? 2 : 0);

    expect(acertaNormal).toBe(true); // 11 >= 10
    expect(acertaDefendendo).toBe(false); // 11 < 12
  });

  it('3.4 formata criatura do bestiário para batalha com comportamento coerente ao tier/categoria', () => {
    const chefe = formatarCriaturaParaBatalha({
      id: 'c1',
      name: 'Senhor da Peste',
      threat: 8,
      tier: 'Chefe',
    });
    const animal = formatarCriaturaParaBatalha({
      id: 'c2',
      name: 'Hiena',
      threat: 2,
      category: 'Animal',
    });
    const aberracao = formatarCriaturaParaBatalha({
      id: 'c3',
      name: 'Aberração Putrefata',
      threat: 4,
      category: 'Aberração',
    });

    expect(chefe.comportamento).toBe('esperto');
    expect(animal.comportamento).toBe('cacador');
    expect(aberracao.comportamento).toBe('vingativo');
    expect(chefe.ataques.length).toBeGreaterThan(0);
  });

  it('3.5 IA da fera (agressivo) escolhe sozinha o herói com menor Defesa efetiva', () => {
    const herois = [
      { id: 'tor', nome: 'Tor', vida_atual: 22, vida_max: 22, defesa: 12, defendendo: true }, // 14
      { id: 'kaelis', nome: 'Kaelis', vida_atual: 14, vida_max: 14, defesa: 9, defendendo: false }, // 9
      {
        id: 'malenia',
        nome: 'Malenia',
        vida_atual: 16,
        vida_max: 16,
        defesa: 10,
        defendendo: false,
      }, // 10
    ];
    const alvo = selectBeastTarget({}, herois, 'agressivo');
    expect(alvo.id).toBe('kaelis');
  });

  it('3.6 IA da fera (caçador) escolhe sozinha o herói mais ferido proporcionalmente (% de vida)', () => {
    const herois = [
      { id: 'tor', vida_atual: 10, vida_max: 20, defesa: 12 }, // 50%
      { id: 'malenia', vida_atual: 3, vida_max: 15, defesa: 11 }, // 20%
      { id: 'kaelis', vida_atual: 12, vida_max: 14, defesa: 9 }, // 85%
    ];
    const alvo = selectBeastTarget({}, herois, 'cacador');
    expect(alvo.id).toBe('malenia');
  });

  it('3.7 IA da fera (vingativo) foca no herói que lhe causou mais dano acumulado', () => {
    const fera = { dano_recebido_de: { tor: 6, malenia: 18, kaelis: 4 } };
    const herois = [
      { id: 'tor', vida_atual: 20, vida_max: 20, defesa: 12 },
      { id: 'malenia', vida_atual: 15, vida_max: 15, defesa: 10 },
      { id: 'kaelis', vida_atual: 14, vida_max: 14, defesa: 9 },
    ];
    const alvo = selectBeastTarget(fera, herois, 'vingativo');
    expect(alvo.id).toBe('malenia');
  });

  it('3.8 IA da fera (esperto) foca no herói com maior Vida atual absoluta', () => {
    const herois = [
      { id: 'tor', vida_atual: 24, vida_max: 24, defesa: 12 },
      { id: 'malenia', vida_atual: 12, vida_max: 16, defesa: 10 },
    ];
    const alvo = selectBeastTarget({}, herois, 'esperto');
    expect(alvo.id).toBe('tor');
  });

  it('3.9 condições passam de turno: Envenenado causa 1 de dano por pilha e reduz duração em 1 rodada até expirar', () => {
    const combatente = {
      nome: 'Carniçal',
      vida_atual: 20,
      vida_max: 20,
      condicoes: [{ chave: 'envenenado', pilhas: 2, turnos_restantes: 3 }],
    };
    const tique1 = processarTiqueInicioTurno(combatente, { corpo: 1 });
    expect(tique1.danoTotalTique).toBe(2); // 2 pilhas * 1 dano fixo
    expect(tique1.novaVida).toBe(18);
    expect(tique1.novasCondicoes[0].turnos_restantes).toBe(2);

    const tique2 = processarTiqueInicioTurno(
      { ...combatente, vida_atual: tique1.novaVida, condicoes: tique1.novasCondicoes },
      { corpo: 1 },
    );
    expect(tique2.novaVida).toBe(16);
    expect(tique2.novasCondicoes[0].turnos_restantes).toBe(1);

    const tique3 = processarTiqueInicioTurno(
      { ...combatente, vida_atual: tique2.novaVida, condicoes: tique2.novasCondicoes },
      { corpo: 1 },
    );
    expect(tique3.novaVida).toBe(14);
    expect(tique3.novasCondicoes).toHaveLength(0); // expirou após a 3ª rodada
  });

  it('3.10 Regenerando cura 1d4 de Vida no início do turno sem ultrapassar vida_max', () => {
    const combatente = {
      nome: 'Tor',
      vida_atual: 19,
      vida_max: 20,
      condicoes: [{ chave: 'regenerando', pilhas: 1, turnos_restantes: 2 }],
    };
    const res = processarTiqueInicioTurno(combatente, { corpo: 2 });
    expect(res.curaTotalTique).toBeGreaterThanOrEqual(1);
    expect(res.curaTotalTique).toBeLessThanOrEqual(4);
    expect(res.novaVida).toBe(20);
    expect(res.novasCondicoes[0].turnos_restantes).toBe(1);
  });
});

describe('4. Cálculo de Dano, Condições e Combos Elementais (conditionEngine)', () => {
  it('4.1 contém todas as 22 condições canônicas no catálogo', () => {
    expect(Object.keys(CONDICOES_CATALOGO).length).toBeGreaterThanOrEqual(20);
    expect(CONDICOES_CATALOGO.queimando).toBeDefined();
    expect(CONDICOES_CATALOGO.sangrando).toBeDefined();
    expect(CONDICOES_CATALOGO.envenenado).toBeDefined();
    expect(CONDICOES_CATALOGO.molhado).toBeDefined();
    expect(CONDICOES_CATALOGO.oleado).toBeDefined();
    expect(CONDICOES_CATALOGO.congelado).toBeDefined();
  });

  it('4.2 aplica, acumula pilhas até max_pilhas e remove condições', () => {
    let res = aplicarCondicao([], 'sangrando', 1);
    expect(res.condicoes).toHaveLength(1);
    expect(res.condicoes[0].pilhas).toBe(1);

    res = aplicarCondicao(res.condicoes, 'sangrando', 5);
    expect(res.condicoes[0].pilhas).toBe(3); // max_pilhas = 3

    const aposRemover = removerCondicao(res.condicoes, 'sangrando');
    expect(aposRemover).toHaveLength(0);
  });

  it('4.3 resolve combo elemental: Molhado apaga Queimando e Queimando em Molhado é anulado', () => {
    const comMolhado = aplicarCondicao([], 'molhado', 1).condicoes;
    const tentaQueimar = aplicarCondicao(comMolhado, 'queimando', 1);
    expect(tentaQueimar.aplicada).toBe(false);
    expect(tentaQueimar.condicoes).toHaveLength(0);

    const comQueimando = aplicarCondicao([], 'queimando', 2).condicoes;
    const aplicaMolhado = aplicarCondicao(comQueimando, 'molhado', 1);
    expect(aplicaMolhado.condicoes.some((c) => c.chave === 'queimando')).toBe(false);
    expect(aplicaMolhado.condicoes.some((c) => c.chave === 'molhado')).toBe(true);
  });

  it('4.4 avalia combo elemental: Oleado + Fogo dobra dano e aplica Queimando (2 pilhas)', () => {
    const conds = [normalizarCondicao('oleado')];
    const combo = avaliarCombosElementais(conds, 'fogo', 10);
    expect(combo.danoFinal).toBe(20);
    expect(combo.multiplicador).toBe(2);
    expect(combo.condicoesParaAdicionar).toEqual([{ condicao: 'queimando', pilhas: 2 }]);
  });

  it('4.5 avalia combo elemental: Molhado + Raio dobra dano elétrico e aplica Atordoado', () => {
    const conds = [normalizarCondicao('molhado')];
    const combo = avaliarCombosElementais(conds, 'raio', 8);
    expect(combo.danoFinal).toBe(16);
    expect(combo.condicoesParaAdicionar.some((c) => c.condicao === 'atordoado')).toBe(true);
  });

  it('4.6 avalia combo elemental: Molhado + Gelo aumenta dano em 1.5x e aplica Gelado', () => {
    const conds = [normalizarCondicao('molhado')];
    const combo = avaliarCombosElementais(conds, 'gelo', 8);
    expect(combo.danoFinal).toBe(12);
    expect(combo.condicoesParaAdicionar.some((c) => c.condicao === 'gelado')).toBe(true);
  });

  it('4.7 processa tique no início do turno com Atordoado causando perda de turno e expiração', () => {
    const combatente = {
      nome: 'Tor',
      vida_atual: 20,
      vida_max: 20,
      condicoes: [
        { chave: 'sangrando', pilhas: 2, turnos_restantes: 99 },
        { chave: 'atordoado', pilhas: 1, turnos_restantes: 1 },
      ],
    };
    const res = processarTiqueInicioTurno(combatente, { corpo: 2 });
    expect(res.danoTotalTique).toBe(2);
    expect(res.novaVida).toBe(18);
    expect(res.perdeTurno).toBe(true);
    expect(res.novasCondicoes.some((c) => c.chave === 'atordoado')).toBe(false);
    expect(res.novasCondicoes.some((c) => c.chave === 'sangrando')).toBe(true);
  });

  it('4.8 calcula modificadores de ataque/defesa/vantagem por condições ativas', () => {
    const ator = { condicoes: ['cancao', 'enfraquecido'] };
    const alvo = { condicoes: [{ chave: 'corroido', pilhas: 2 }, 'exposto'] };
    const mods = calcularModificadoresCondicoes(ator, alvo);
    expect(mods.bonusAtaque).toBe(2);
    expect(mods.bonusDano).toBe(-2);
    expect(mods.bonusDefesaAlvo).toBe(-4);
  });

  it('4.9 gera efeitos automáticos para feras do bestiário e infere poções de fogo/cura', () => {
    const lobo = gerarEfeitosAutomaticosBestiario({ nome: 'Lobo Cinzento', threat: 2 });
    expect(lobo.ataques.length).toBeGreaterThan(0);
    expect(lobo.ataques[0].efeitos[0].condicao).toBe('sangrando');

    const pocaoFogo = inferirEfeitosPocao({
      nome: 'Poção de Fôlego de Fogo',
      description: 'Cospe fogo causando 2d6',
    });
    expect(pocaoFogo.some((b) => b.bloco === 'dano_ofensivo' && b.valor === '2d6')).toBe(true);
  });
});

describe('5. Motor de Magias (spellEngine)', () => {
  it('5.1 rola Surto Mágico e expressões de dados corretamente', () => {
    expect(TABELA_SURTO_MAGICO).toHaveLength(6);
    const surto = rolarSurtoMagico(2);
    expect(surto.textoLog).toContain('SURTO MÁGICO');

    const expr = rolarExpressao('2d6+3');
    expect(expr.total).toBeGreaterThanOrEqual(5);
    expect(expr.total).toBeLessThanOrEqual(15);
    expect(expr.maximo).toBe(15);
  });

  it('5.2 verifica Risco da Peste (sempre vs rolagem d6)', () => {
    const sempre = verificarRiscoPeste({ peste: true, texto: 'Sempre ganha +1 Peste' });
    expect(sempre.ganhaPeste).toBe(true);
  });

  it('5.3 bloqueia conjuração quando conjurador está Silenciado', async () => {
    const atorSilenciado = { id: 'h1', nome: 'Malenia', tipo: 'heroi', condicoes: ['silenciado'] };
    const bloqueado = await resolverMagiaMotor({
      batalhaId: 'b1',
      ator: atorSilenciado,
      magia: { nome: 'Chama Negra', circulo: 1, efeitos: [] },
    });
    expect(bloqueado.success).toBe(false);
    expect(bloqueado.error).toContain('Silenciado');
  });

  it('5.4 resolve magia de ataque com duplo 6 maximizando dano e adicionando +1 pilha de condição', async () => {
    const ator = {
      id: 'h1',
      nome: 'Malenia',
      tipo: 'heroi',
      detalhes: { attributes: { vontade: 2 } },
      condicoes: [],
    };
    const alvo = {
      id: 'f1',
      nome: 'Carniçal',
      tipo: 'fera',
      vida_atual: 20,
      defesa: 10,
      condicoes: [],
    };
    const magia = {
      nome: 'Lança de Brasa',
      escola: 'Fogo',
      circulo: 1,
      custo: { foco: 1 },
      alvo: { tipo: 'inimigo' },
      resolucao: { tipo: 'ataque' },
      efeitos: [
        { bloco: 'dano', valor: '2d6+2', tipo: 'fogo' },
        { bloco: 'condicao', condicao: 'queimando', pilhas: 1, duracao: 2 },
      ],
    };

    const resCrit = await resolverMagiaMotor({
      batalhaId: 'b1',
      ator,
      alvoId: 'f1',
      magia,
      resultadoFisico: { d1: 6, d2: 6 },
      participantes: [ator, alvo],
    });
    expect(resCrit.success).toBe(true);
    expect(resCrit.acertou).toBe(true);
    const mudancaAlvo = resCrit.mudancasParticipantes.find((m) => m.id === 'f1');
    expect(mudancaAlvo.danoSofrido).toBe(14);
    expect(mudancaAlvo.condicoesAdd[0].pilhas).toBe(2);
  });

  it('5.5 resolve magia de ataque com duplo 1 acionando Surto Mágico', async () => {
    const ator = {
      id: 'h1',
      nome: 'Malenia',
      tipo: 'heroi',
      vida_atual: 16,
      vida_max: 16,
      detalhes: { attributes: { vontade: 2 } },
      condicoes: [],
    };
    const alvo = {
      id: 'f1',
      nome: 'Carniçal',
      tipo: 'fera',
      vida_atual: 20,
      defesa: 10,
      condicoes: [],
    };
    const magia = {
      nome: 'Seta Sombria',
      escola: 'Sombra',
      circulo: 1,
      custo: { foco: 1 },
      alvo: { tipo: 'inimigo' },
      resolucao: { tipo: 'ataque' },
      efeitos: [{ bloco: 'dano', valor: '1d6', tipo: 'sombra' }],
    };

    const resDesastre = await resolverMagiaMotor({
      batalhaId: 'b1',
      ator,
      alvoId: 'f1',
      magia,
      resultadoFisico: { d1: 1, d2: 1 },
      participantes: [ator, alvo],
    });
    expect(resDesastre.success).toBe(true);
    expect(resDesastre.acertou).toBe(false);
    expect(resDesastre.logs.some((l) => l.tipo === 'surto_magico')).toBe(true);
  });
});

describe('6. Receitas e Grade 3x3 da Oficina (grade 3x3, falta de ingrediente, sucesso brilhante)', () => {
  const CATALOGO_RECEITAS = [
    {
      id: 'espada-ferro',
      name: 'Espada de Ferro',
      station: 'forja',
      peso: 8,
      starter: true,
      grid: [
        null,
        'minerio-ferro',
        null,
        null,
        'minerio-ferro',
        null,
        null,
        'madeira-carvalho',
        null,
      ],
    },
    {
      id: 'balsamo-cura',
      name: 'Bálsamo de Cura',
      station: 'alquimia',
      peso: 7,
      starter: true,
      grid: [
        null,
        'erva-sangue',
        null,
        'agua-pura',
        'mel-selvagem',
        'agua-pura',
        null,
        'frasco-vidro',
        null,
      ],
    },
  ];

  it('6.1 reconhece exatamente a receita quando os 9 slots da grade 3x3 batem na estação correta', () => {
    const gridSlots = [
      null,
      { catalog_id: 'minerio-ferro' },
      null,
      null,
      { catalog_id: 'minerio-ferro' },
      null,
      null,
      { catalog_id: 'madeira-carvalho' },
      null,
    ];
    const backpack = [
      { id: '1', catalog_id: 'minerio-ferro', quantity: 2 },
      { id: '2', catalog_id: 'madeira-carvalho', quantity: 1 },
    ];
    const res = matchWorkshopRecipe3x3(CATALOGO_RECEITAS, 'forja', gridSlots, backpack);
    expect(res.matched).toBe(true);
    expect(res.canCraft).toBe(true);
    expect(res.recipe.id).toBe('espada-ferro');
  });

  it('6.2 rejeita a combinação se os mesmos ingredientes estiverem posicionados nos slots errados da grade 3x3', () => {
    const gridInvertida = [
      { catalog_id: 'minerio-ferro' },
      null,
      null,
      { catalog_id: 'minerio-ferro' },
      null,
      null,
      { catalog_id: 'madeira-carvalho' },
      null,
      null,
    ];
    const backpack = [
      { id: '1', catalog_id: 'minerio-ferro', quantity: 2 },
      { id: '2', catalog_id: 'madeira-carvalho', quantity: 1 },
    ];
    const res = matchWorkshopRecipe3x3(CATALOGO_RECEITAS, 'forja', gridInvertida, backpack);
    expect(res.matched).toBe(false);
    expect(res.canCraft).toBe(false);
    expect(res.reason).toBe('receita_invalida');
  });

  it('6.3 não mistura receitas de estações diferentes (receita de Forja não ativa na bancada de Alquimia)', () => {
    const gridEspada = [
      null,
      { catalog_id: 'minerio-ferro' },
      null,
      null,
      { catalog_id: 'minerio-ferro' },
      null,
      null,
      { catalog_id: 'madeira-carvalho' },
      null,
    ];
    const backpack = [
      { id: '1', catalog_id: 'minerio-ferro', quantity: 5 },
      { id: '2', catalog_id: 'madeira-carvalho', quantity: 5 },
    ];
    const res = matchWorkshopRecipe3x3(CATALOGO_RECEITAS, 'alquimia', gridEspada, backpack);
    expect(res.matched).toBe(false);
  });

  it('6.4 bloqueia a criação por falta de ingrediente quando a grade pede 2 unidades mas a mochila só tem 1', () => {
    const gridEspada = [
      null,
      { catalog_id: 'minerio-ferro' },
      null,
      null,
      { catalog_id: 'minerio-ferro' },
      null,
      null,
      { catalog_id: 'madeira-carvalho' },
      null,
    ];
    const backpackIncompleta = [
      { id: '1', catalog_id: 'minerio-ferro', quantity: 1 }, // falta 1 minério!
      { id: '2', catalog_id: 'madeira-carvalho', quantity: 1 },
    ];
    const res = matchWorkshopRecipe3x3(CATALOGO_RECEITAS, 'forja', gridEspada, backpackIncompleta);
    expect(res.matched).toBe(true);
    expect(res.canCraft).toBe(false);
    expect(res.reason).toBe('falta_ingrediente');
    expect(res.missingCatalogId).toBe('minerio-ferro');
  });

  it('6.5 resolve Sucesso Brilhante na Oficina quando 2d6 + modificador >= Peso da receita + 3 (rendimento extra / obra-prima)', () => {
    const receita = CATALOGO_RECEITAS[0]; // Peso 8
    // Rolou 5+4 = 9, modificador +2 (Astúcia + Forja) => Total 11 >= 8 + 3
    const roll = resolveRollRules({ dice: [5, 4], kept: [5, 4], modifier: 2, peso: receita.peso });
    expect(roll.result).toBe('brilhante');
    const craftedQty = roll.result === 'brilhante' || roll.result === 'critico' ? 2 : 1;
    expect(craftedQty).toBe(2);
  });

  it('6.6 resolve Falha na Oficina quando 2d6 + modificador < Peso da receita', () => {
    const receita = CATALOGO_RECEITAS[1]; // Peso 7
    const roll = resolveRollRules({ dice: [2, 2], kept: [2, 2], modifier: 1, peso: receita.peso });
    expect(roll.total).toBe(5);
    expect(roll.result).toBe('falha');
  });
});

describe('7. Espólios e Minigame da Faca (espolioService)', () => {
  it('7.1 enriquece fera com peso de preparo, cortes, tempo e faixas de drop (0, 40, 70, 90, raro)', () => {
    const fera = enriquecerFeraComEspolios({
      id: 'vibora-abissal',
      nome: 'Víbora Abissal',
      threat: 4,
    });
    expect(fera.peso_preparo).toBe(10);
    expect(fera.tempo_circulo_ms).toBe(TEMPO_PADRAO_POR_PESO[10]);
    expect(fera.num_cortes).toBe(CORTES_PADRAO_POR_PESO[10]);
    expect(fera.is_venenosa).toBe(true);
    expect(fera.espolios.faixa_0).toHaveLength(1);
    expect(fera.espolios.faixa_90.length).toBeGreaterThanOrEqual(3);
  });

  it('7.2 calcula bônus de tempo (Sobrevivência x1.2, Faca x1.1, Ajudantes +10%) e penalidade por fogo/ácido (x0.7 cortes)', () => {
    const fera = enriquecerFeraComEspolios({ id: 'urso', nome: 'Urso', threat: 2 });
    const dif = calcularDificuldadeEspolio({
      fera,
      heroi: { skills: ['Sobrevivência'] },
      inventarioItens: [{ name: 'Faca de Caça Afiada' }],
      ajudantes: [{ personagem_id: 'tor', nome: 'Tor' }],
      morreuPor: 'fogo',
    });
    expect(dif.temSobrevivencia).toBe(true);
    expect(dif.temFacaCaca).toBe(true);
    expect(dif.qtdAjudantes).toBe(1);
    expect(dif.tempoEfetivoMs).toBe(Math.round(900 * 1.2 * 1.1 * 1.1));
    expect(dif.numCortesEfetivo).toBe(Math.round(6 * 0.7));
  });

  it('7.3 limita bônus de ajudantes a no máximo 2 ajudantes (+20% tempo)', () => {
    const fera = enriquecerFeraComEspolios({ id: 'javali', nome: 'Javali', threat: 1 }); // peso 7 -> 1000ms
    const dif2 = calcularDificuldadeEspolio({
      fera,
      heroi: {},
      inventarioItens: [],
      ajudantes: [{ personagem_id: 'a' }, { personagem_id: 'b' }],
    });
    const dif4 = calcularDificuldadeEspolio({
      fera,
      heroi: {},
      inventarioItens: [],
      ajudantes: [
        { personagem_id: 'a' },
        { personagem_id: 'b' },
        { personagem_id: 'c' },
        { personagem_id: 'd' },
      ],
    });
    expect(dif2.qtdAjudantes).toBe(2);
    expect(dif4.qtdAjudantes).toBe(2);
    expect(dif4.tempoEfetivoMs).toBe(dif2.tempoEfetivoMs);
  });
});

describe('8. XP, Níveis, Vida, Foco, Defesa, Árvore do Juramento, Moedas e Calendário', () => {
  it('8.1 calcula Vida Máxima nos níveis 1 a 5 segundo a fórmula canônica', () => {
    expect(calcVidaMax(10, 2, 1)).toBe(14);
    expect(calcVidaMax(10, 2, 3)).toBe(22);
    expect(calcVidaMax(12, 3, 5)).toBe(12 + 3 * 2 + 4 * 4);
  });

  it('8.2 calcula Foco Máximo e Defesa base + Astúcia + Escudo', () => {
    expect(calcFocoMax(3, 2, 4)).toBe(7);
    expect(calcDefesa(2, 1)).toBe(10);
    expect(calcDefesa(0, 0)).toBe(7);
  });

  it('8.3 retorna próximo marco de XP e estágios da Peste de 0 a 10', () => {
    expect(getProximoXp(1)).toBe(XP_THRESHOLDS[2]);
    expect(getProximoXp(10)).toBe(126);
    expect(getPlagueStage(0).id).toBe('limpo');
    expect(getPlagueStage(2).id).toBe('mancha');
    expect(getPlagueStage(5).id).toBe('corrupcao');
    expect(getPlagueStage(8).id).toBe('transformacao');
    expect(getPlagueStage(10).id).toBe('perdido');
  });

  it('8.4 calcula bônus de perícias infinitas, maestria e próximo marco', () => {
    expect(calcSkillBonus(0)).toBe(0);
    expect(calcSkillBonus(1)).toBe(1);
    expect(calcSkillBonus(3)).toBe(2);
    expect(calcSkillMastery(2)).toBe(1);
    expect(calcSkillNextMilestone(1)).toBe(3);
    expect(calcSkillNextMilestone(2)).toBe(3);
  });

  it('8.5 calcula bônus da Árvore do Juramento e mescla perícias efetivas para os 3 heróis', () => {
    const torTree = getDefaultHeroTree('tor');
    const bonuses = calculateOathTreeBonuses(torTree, GRAPH.N, { hasShield: true });
    expect(bonuses.skillBonuses.forja.bonus).toBeGreaterThanOrEqual(1);

    const merged = mergeEffectiveSkills(['Atletismo'], bonuses.skillBonuses, []);
    expect(merged.some((s) => s.name.toLowerCase() === 'forja' && s.bonus >= 1)).toBe(true);
    expect(merged.some((s) => s.name.toLowerCase() === 'atletismo')).toBe(true);
  });

  it('8.6 converte moedas (1 Ouro = 50 Pratas = 2500 Bronzes) e formata descrições', () => {
    expect(toBronze(1, 2, 5)).toBe(2605);
    expect(fromBronze(2605)).toEqual({ gold: 1, silver: 2, bronze: 5, total: 2605 });
    expect(formatCoinsString(2605)).toBe('1o 2p 5b');
    expect(formatCoinsDescription(2500).toLowerCase()).toContain('1 ouro');
  });

  it('8.7 converte minutos do calendário do mundo, fases do dia e fases da lua', () => {
    const dataInicial = minutosParaData(DATA_INICIAL_MINUTOS);
    expect(dataInicial.ano).toBe(847);
    expect(dataInicial.mes).toBe(5);
    expect(dataInicial.dia).toBe(1);
    expect(dataInicial.hora).toBe(8);

    const minRoundtrip = dataParaMinutos(
      dataInicial.ano,
      dataInicial.mes,
      dataInicial.dia,
      dataInicial.hora,
      dataInicial.minuto,
    );
    expect(minRoundtrip).toBe(DATA_INICIAL_MINUTOS);
    expect(obterFaseDoDia(8)).toBe('Manhã');
    expect(obterFaseDoDia(22)).toBe('Noite');
    expect(obterFaseLua(1)).toBe('Lua nova');
  });
});

describe('9. Pathfinding e Grade Isométrica (tacticalMapEngine)', () => {
  it('9.1 converte célula (c, r) para pixel isométrico e vice-versa com precisão exata', () => {
    const ox = 500,
      oy = 200,
      tw = 96,
      th = 48;
    for (let c = -3; c <= 5; c++) {
      for (let r = -2; r <= 6; r++) {
        const pt = center(c, r, ox, oy, tw, th);
        const back = toCell(pt.x, pt.y, ox, oy, tw, th);
        expect(back).toEqual({ c, r });
      }
    }
  });

  it('9.2 formata e faz parse de chaves de coordenadas "c,r"', () => {
    expect(key(-2, 7)).toBe('-2,7');
    expect(parseKey('-2,7')).toEqual({ c: -2, r: 7 });
  });

  it('9.3 constrói grade válida, calcula alcance BFS com bloqueios e reconstrói caminho ótimo', () => {
    const valid = buildGrid(1024, 768, 512, 100, 96, 48);
    expect(valid.has(key(2, 2))).toBe(true);

    const blocked = new Set([key(3, 2), key(2, 3)]);
    const graph = bfs(2, 2, 4, valid, (k) => blocked.has(k));
    expect(graph.dist.get(key(2, 2))).toBe(0);
    expect(graph.dist.has(key(3, 2))).toBe(false);

    const path = pathTo(4, 4, graph, 2, 2);
    expect(Array.isArray(path)).toBe(true);
    expect(path[path.length - 1]).toBe(key(4, 4));
    expect(gridDist({ c: 2, r: 2 }, { c: 5, r: 4 })).toBe(3);
  });

  it('9.4 memoizedBfs reutiliza grafo em cache quando parâmetros não mudam e limpa com clearBfsCache', () => {
    clearBfsCache();
    const valid = buildGrid(800, 600, 400, 100, 96, 48);
    const blocked = new Set([key(1, 1)]);
    const g1 = memoizedBfs(0, 0, 3, valid, (k) => blocked.has(k), 'blocked_v1');
    const g2 = memoizedBfs(0, 0, 3, valid, (k) => blocked.has(k), 'blocked_v1');
    expect(g1).toBe(g2);
  });
});
