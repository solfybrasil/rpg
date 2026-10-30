import { supabase } from '../shared/supabase';

/**
 * Serviço de integração com a Árvore do Juramento e Supabase
 */

/**
 * Investe 1 Inspiração no nó especificado para um herói.
 * Validações e atualizações são executadas no servidor via RPC SECURITY DEFINER.
 */
export async function investInspiration(characterId, noId) {
  if (!characterId || !noId) {
    throw new Error('Herói ou nó inválido.');
  }

  const { data, error } = await supabase.rpc('arvore_investir', {
    p_character_id: characterId,
    p_no_id: noId,
  });

  if (error) {
    console.error('[OATH_TREE] Erro ao investir inspiração:', error);
    throw new Error(error.message || 'Falha ao investir inspiração.');
  }

  return data;
}

/**
 * Mestre: Libera um nó de graça (sem gastar Inspiração).
 */
export async function masterUnlockFree(characterId, noId) {
  if (!characterId || !noId) {
    throw new Error('Herói ou nó inválido.');
  }

  const { data, error } = await supabase.rpc('arvore_mestre_liberar', {
    p_character_id: characterId,
    p_no_id: noId,
  });

  if (error) {
    console.error('[OATH_TREE] Erro ao liberar nó:', error);
    throw new Error(error.message || 'Falha ao liberar nó.');
  }

  return data;
}

/**
 * Mestre: Desfaz 1 marca ou nó liberado de graça.
 */
export async function masterUndoMark(characterId, noId) {
  if (!characterId || !noId) {
    throw new Error('Herói ou nó inválido.');
  }

  const { data, error } = await supabase.rpc('arvore_mestre_desfazer', {
    p_character_id: characterId,
    p_no_id: noId,
  });

  if (error) {
    console.error('[OATH_TREE] Erro ao desfazer marca:', error);
    throw new Error(error.message || 'Falha ao desfazer marca.');
  }

  return data;
}

/**
 * Busca o estado atual dos nós liberados e marcas de um herói no Supabase.
 */
export async function fetchHeroTree(characterId) {
  if (!characterId) return { m: { hub: 0 }, g: { hub: true } };

  try {
    const { data, error } = await supabase
      .from('heroi_arvore')
      .select('no_id, marcas, gratis, liberado')
      .eq('character_id', characterId);

    if (error) {
      console.warn('[OATH_TREE] Erro ao buscar heroi_arvore:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const m = { hub: 0 };
    const g = { hub: true };

    data.forEach((row) => {
      m[row.no_id] = row.marcas;
      if (row.gratis) {
        g[row.no_id] = true;
      }
    });

    return { m, g };
  } catch (err) {
    console.warn('[OATH_TREE] Exceção ao buscar árvore:', err);
    return null;
  }
}

/**
 * Assina mudanças em tempo real na tabela heroi_arvore para um herói.
 */
export function subscribeHeroTree(characterId, onUpdate) {
  if (!characterId || typeof onUpdate !== 'function') return () => {};

  const channelName = `realtime:heroi_arvore:${characterId}_${Date.now()}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'heroi_arvore',
        filter: `character_id=eq.${characterId}`,
      },
      (payload) => {
        onUpdate(payload);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/* =====================================================================
 * PARTE 2: PERÍCIAS COM NÍVEL INFINITO
 * ===================================================================== */

export function calcSkillBonus(level) {
  if (level <= 0) return 0;
  return Math.floor((level + 1) / 2);
}

export function calcSkillMastery(level) {
  if (level <= 0) return 0;
  return Math.floor(level / 2);
}

export function calcSkillNextMilestone(level) {
  if (level <= 0) return 1;
  return level % 2 === 0 ? level + 1 : level + 2;
}

/**
 * Busca as perícias liberadas de um herói diretamente da view v_heroi_pericias
 */
export async function fetchHeroSkills(characterId) {
  if (!characterId) return [];

  try {
    const { data, error } = await supabase
      .from('v_heroi_pericias')
      .select('*')
      .eq('character_id', characterId);

    if (error) {
      console.warn('[OATH_TREE] Erro ao buscar v_heroi_pericias:', error.message);
      return null;
    }

    return data || [];
  } catch (err) {
    console.warn('[OATH_TREE] Exceção ao buscar v_heroi_pericias:', err);
    return null;
  }
}

/**
 * Investe 1 Inspiração em uma perícia liberada via RPC pericia_investir
 */
export async function investSkillInspiration(characterId, pericia) {
  if (!characterId || !pericia) {
    throw new Error('Herói ou perícia inválida.');
  }

  const { data, error } = await supabase.rpc('pericia_investir', {
    p_character_id: characterId,
    p_pericia: pericia,
  });

  if (error) {
    console.error('[OATH_TREE] Erro ao investir em perícia:', error);
    throw new Error(error.message || 'Falha ao investir em perícia.');
  }

  return data;
}

/**
 * Mestre: Desfaz 1 marca ou nível da perícia via RPC pericia_mestre_desfazer
 */
export async function masterUndoSkillMark(characterId, pericia) {
  if (!characterId || !pericia) {
    throw new Error('Herói ou perícia inválida.');
  }

  const { data, error } = await supabase.rpc('pericia_mestre_desfazer', {
    p_character_id: characterId,
    p_pericia: pericia,
  });

  if (error) {
    console.error('[OATH_TREE] Erro ao desfazer marca da perícia:', error);
    throw new Error(error.message || 'Falha ao desfazer marca da perícia.');
  }

  return data;
}

/**
 * Assina mudanças em tempo real na tabela heroi_pericias para um herói.
 */
export function subscribeHeroSkills(characterId, onUpdate) {
  if (!characterId || typeof onUpdate !== 'function') return () => {};

  const channelName = `realtime:heroi_pericias:${characterId}_${Date.now()}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'heroi_pericias',
        filter: `character_id=eq.${characterId}`,
      },
      (payload) => {
        onUpdate(payload);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Mescla dois estados de árvore preservando todas as marcas e nós desbloqueados.
 * Garante que dados locais mais recentes não sejam apagados por consultas do banco.
 */
export function mergeTreeStates(treeA, treeB) {
  if (!treeA && !treeB) return { m: { hub: 0 }, g: { hub: true } };
  if (!treeA) return treeB;
  if (!treeB) return treeA;

  const m = { ...(treeA.m || {}), ...(treeB.m || {}) };
  const allMKeys = new Set([...Object.keys(treeA.m || {}), ...Object.keys(treeB.m || {})]);
  allMKeys.forEach((k) => {
    m[k] = Math.max(Number(treeA.m?.[k] || 0), Number(treeB.m?.[k] || 0));
  });

  const g = { ...(treeA.g || {}), ...(treeB.g || {}) };

  return { m, g };
}

/**
 * Retorna uma árvore padrão com as 3 perícias iniciais desbloqueadas para o herói.
 */
export function getDefaultHeroTree(heroId, heroSkills = []) {
  const m = { hub: 0 };
  const g = { hub: true };

  const normId = String(heroId || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  let skillsToUse = [];
  if (Array.isArray(heroSkills) && heroSkills.length > 0) {
    skillsToUse = heroSkills.map((s) => (typeof s === 'string' ? s : s.name || s.pericia || ''));
  } else if (normId.includes('tor') || normId.includes('bjorn')) {
    skillsToUse = ['Forja', 'Percepção', 'Intimidação'];
  } else if (normId.includes('malenia')) {
    skillsToUse = ['Alquimia', 'Medicina', 'Intimidação'];
  } else if (normId.includes('kaelis')) {
    skillsToUse = ['Furtividade', 'Percepção', 'Música'];
  } else if (normId.includes('kaian')) {
    skillsToUse = ['Atletismo', 'Sobrevivência', 'Percepção'];
  }

  // Desbloqueia nós de entrada e perícias correspondentes
  skillsToUse.forEach((skillName) => {
    if (!skillName) return;
    const sNorm = String(skillName).toLowerCase().trim();
    // Mapeamento canônico das 13 perícias para nós
    const skillMap = {
      atletismo: { skillId: 'r0t0p0', entryId: 'r0e' },
      furtividade: { skillId: 'r2t0p0', entryId: 'r2e' },
      enganacao: { skillId: 'r2t1p0', entryId: 'r2e' },
      enganação: { skillId: 'r2t1p0', entryId: 'r2e' },
      sobrevivencia: { skillId: 'r3t0p0', entryId: 'r3e' },
      sobrevivência: { skillId: 'r3t0p0', entryId: 'r3e' },
      percepcao: { skillId: 'r3t1p0', entryId: 'r3e' },
      percepção: { skillId: 'r3t1p0', entryId: 'r3e' },
      forja: { skillId: 'r4t0p0', entryId: 'r4e' },
      alquimia: { skillId: 'r4t1p0', entryId: 'r4e' },
      medicina: { skillId: 'r4t2p0', entryId: 'r4e' },
      arcanismo: { skillId: 'r5t0p0', entryId: 'r5e' },
      historia: { skillId: 'r5t1p0', entryId: 'r5e' },
      história: { skillId: 'r5t1p0', entryId: 'r5e' },
      persuasao: { skillId: 'r7t0p0', entryId: 'r7e' },
      persuasão: { skillId: 'r7t0p0', entryId: 'r7e' },
      intimidacao: { skillId: 'r7t1p0', entryId: 'r7e' },
      intimidação: { skillId: 'r7t1p0', entryId: 'r7e' },
      musica: { skillId: 'r7t2p0', entryId: 'r7e' },
      música: { skillId: 'r7t2p0', entryId: 'r7e' },
    };

    const target = skillMap[sNorm];
    if (target) {
      m[target.entryId] = 1;
      g[target.entryId] = true;
      m[target.skillId] = 2;
      g[target.skillId] = true;
    }
  });

  return { m, g };
}

/**
 * Lê a árvore de juramento salva localmente em localStorage ('peste_oath_tree_state')
 * com correspondência flexível de IDs.
 */
export function getHeroTreeFromStorage(targetId, fallbackId = null) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('peste_oath_tree_state');
    if (!raw) return null;
    const all = JSON.parse(raw);
    if (!all || typeof all !== 'object') return null;

    const candidates = [targetId, fallbackId].filter(Boolean);
    for (const c of candidates) {
      if (all[c] && (all[c].m || all[c].g)) return all[c];
      const norm = String(c)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      for (const [k, v] of Object.entries(all)) {
        if (
          String(k)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '') === norm
        ) {
          if (v && (v.m || v.g)) return v;
        }
      }
    }
  } catch (_) {}
  return null;
}

/**
 * Salva o estado da árvore de um herói no localStorage e emite evento global de atualização imediata.
 */
export function saveHeroTreeToStorage(heroId, treeData, extraKeys = []) {
  if (typeof window === 'undefined' || !treeData) return;
  try {
    let all = {};
    const raw = localStorage.getItem('peste_oath_tree_state');
    if (raw) {
      all = JSON.parse(raw) || {};
    }

    const keys = [heroId, ...extraKeys].filter(Boolean);
    keys.forEach((k) => {
      all[k] = treeData;
    });

    localStorage.setItem('peste_oath_tree_state', JSON.stringify(all));

    // Notifica instantaneamente todos os componentes (PlayerSheet, useCombatStats, etc.)
    window.dispatchEvent(
      new CustomEvent('peste_oath_tree_updated', {
        detail: { heroId, tree: treeData, extraKeys },
      }),
    );
  } catch (_) {}
}

/**
 * Calcula todos os bônus acumulados de nós liberados na Árvore do Juramento.
 * @param {Object} treeData - Objeto { m: { [nodeId]: marcas }, g: { [nodeId]: boolean } }
 * @param {Object} [graphNodes] - Mapa de nós (default: GRAPH.N)
 * @param {Object} [options] - Opções { hasShield: boolean }
 */
export function calculateOathTreeBonuses(treeData, graphNodes, options = {}) {
  let hpBonus = 0;
  let focusBonus = 0;
  let defenseBonus = 0;
  let maxInspBonus = 0;
  const skillBonuses = {};
  const unlockedTalents = [];

  if (!treeData || (!treeData.m && !treeData.g) || !graphNodes) {
    return {
      hpBonus: 0,
      focusBonus: 0,
      defenseBonus: 0,
      maxInspBonus: 0,
      skillBonuses: {},
      unlockedTalents: [],
    };
  }

  const marks = (id) => Number(treeData.m?.[id] || 0);
  const isDone = (id) =>
    id === 'hub' || marks(id) >= (graphNodes[id]?.custo ?? 999) || Boolean(treeData.g?.[id]);

  const allNodeIds = new Set([...Object.keys(treeData.m || {}), ...Object.keys(treeData.g || {})]);

  allNodeIds.forEach((nodeId) => {
    if (nodeId === 'hub') return;
    const node = graphNodes[nodeId];
    if (!node) return;

    if (isDone(nodeId)) {
      unlockedTalents.push(node);

      const ds = node.ds || node.descricao || '';
      const nm = node.nm || node.nome || '';
      const fullText = `${nm} ${ds}`;

      // 1. Vida Máxima (+1 Vida máxima, +2 de Vida máxima, etc.)
      if (
        node.bonus_vida !== undefined &&
        node.bonus_vida !== null &&
        Number(node.bonus_vida) !== 0
      ) {
        hpBonus += Number(node.bonus_vida);
      } else {
        const hpMatch = fullText.match(/([+\-−])\s*(\d+)\s*(?:de\s+)?Vida\s+m[áa]xima/i);
        if (hpMatch) {
          const sign = hpMatch[1] === '−' || hpMatch[1] === '-' ? -1 : 1;
          hpBonus += sign * Number.parseInt(hpMatch[2], 10);
        }
      }

      // 2. Foco Máximo (+1 Foco máximo, +2 de Foco máximo, etc.)
      if (
        node.bonus_foco !== undefined &&
        node.bonus_foco !== null &&
        Number(node.bonus_foco) !== 0
      ) {
        focusBonus += Number(node.bonus_foco);
      } else {
        const focusMatch = fullText.match(/([+\-−])\s*(\d+)\s*(?:de\s+)?Foco\s+m[áa]ximo/i);
        if (focusMatch) {
          const sign = focusMatch[1] === '−' || focusMatch[1] === '-' ? -1 : 1;
          focusBonus += sign * Number.parseInt(focusMatch[2], 10);
        }
      }

      // 3. Defesa
      if (node.id === 'r1t0p0' || nm === 'Treino de Escudo') {
        if (options.hasShield !== false) {
          defenseBonus += 1;
        }
      }

      // 4. Terceira Chama (Capacidade de Inspiração)
      if (node.id === 'j6' || nm === 'Terceira Chama') {
        maxInspBonus += 1;
      }

      // 5. Perícias da Árvore
      if (node.pericia) {
        const sKey = node.pericia.toLowerCase().trim();
        const isSpec =
          node.isSpec ||
          node.pericia_bonus === 2 ||
          nodeId.endsWith('p4') ||
          nm.toLowerCase().includes('especialista');
        const bonusFromNode = isSpec ? 2 : 1;
        const current = skillBonuses[sKey] || { name: node.pericia, bonus: 0, nivel: 1 };
        if (bonusFromNode > current.bonus) {
          current.bonus = bonusFromNode;
          current.nivel = isSpec ? 3 : 1;
          current.maestria = calcSkillMastery(current.nivel);
        }
        skillBonuses[sKey] = current;
      }
    }
  });

  return {
    hpBonus,
    focusBonus,
    defenseBonus,
    maxInspBonus,
    skillBonuses,
    unlockedTalents,
  };
}

/**
 * Mescla as perícias base da ficha, as perícias liberadas da árvore e as perícias de nível infinito da view.
 */
export function mergeEffectiveSkills(baseSkills = [], treeSkillBonuses = {}, viewSkills = []) {
  const map = new Map();

  // 1. Perícias base da ficha do herói
  if (Array.isArray(baseSkills)) {
    baseSkills.forEach((s) => {
      if (!s) return;
      const name = typeof s === 'string' ? s : s.name || s.skill || s.pericia || '';
      if (!name) return;
      const b = typeof s === 'object' && s.bonus !== undefined ? Number(s.bonus) : 1;
      const nivel = b === 2 ? 3 : 1;
      map.set(name.toLowerCase().trim(), {
        name,
        pericia: name,
        bonus: b,
        nivel,
        maestria: calcSkillMastery(nivel),
        marcas: 0,
        custo_proximo: 2,
      });
    });
  }

  // 2. Perícias liberadas da Árvore do Juramento
  if (treeSkillBonuses && typeof treeSkillBonuses === 'object') {
    Object.values(treeSkillBonuses).forEach((ts) => {
      if (!ts || !ts.name) return;
      const key = ts.name.toLowerCase().trim();
      const prev = map.get(key) || {
        name: ts.name,
        pericia: ts.name,
        bonus: 0,
        nivel: 1,
        maestria: 0,
        marcas: 0,
        custo_proximo: 2,
      };

      if (ts.bonus > prev.bonus) {
        prev.bonus = ts.bonus;
        prev.nivel = ts.nivel || (ts.bonus === 2 ? 3 : 1);
        prev.maestria = calcSkillMastery(prev.nivel);
      }
      map.set(key, prev);
    });
  }

  // 3. Perícias com nível infinito (view v_heroi_pericias do Supabase)
  if (Array.isArray(viewSkills) && viewSkills.length > 0) {
    viewSkills.forEach((vs) => {
      const name = vs.pericia || vs.name;
      if (!name) return;
      const key = name.toLowerCase().trim();
      const nivel = Number(vs.nivel || 1);
      const bonus = Number(vs.bonus ?? calcSkillBonus(nivel));
      const maestria = Number(vs.maestria ?? calcSkillMastery(nivel));

      map.set(key, {
        name,
        pericia: name,
        nivel,
        bonus,
        maestria,
        marcas: Number(vs.marcas || 0),
        custo_proximo: Number(vs.custo_proximo || 2),
      });
    });
  }

  return Array.from(map.values());
}
