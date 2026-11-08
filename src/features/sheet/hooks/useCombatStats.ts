import { useMemo } from 'react';
import { characters as officialCharacters } from '../data/characters';
import { getCaminho } from '../data/caminhos';
import { GRAPH } from '../data/oathTreeGraph';
import { calculateOathTreeBonuses, getHeroTreeFromStorage, getDefaultHeroTree } from '../services/oathTreeService';

// Helper de normalização de IDs (remove hífens, underlines, espaços e maiúsculas)
const normalizeId = (id) => {
  if (!id) return '';
  return String(id).toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * useCombatStats(player, inventoryItems, activeEffects, treeData)
 * Calcula estatísticas derivadas de combate (Regras 2.0):
 * - Defesa = Base do Herói + bônus de armadura + bônus de talentos + soma(defesa_mod * pilhas)
 * - Vida Máxima e Foco Máximo com talentos da Árvore do Juramento
 * - Lista de ataques disponíveis (armas equipadas em main_hand, off_hand, two_handed ou equipadas como arma)
 * - Mapeamento de munições disponíveis na mochila para armas de ataque à distância
 */
export function useCombatStats(player, inventoryItems = [], activeEffects = [], treeData = null) {
  const c = player?.character || (player?.attributes ? player : null);
  const attrs = c?.attributes || { corpo: 0, vontade: 0, astucia: 0, presenca: 0 };
  const skills = Array.isArray(c?.skills) ? c.skills : [];

  const charId = c?.id || player?.character_id;
  const userId = player?.id;

  const targetCharId = normalizeId(charId);
  const targetUserId = normalizeId(userId);

  // Itens do jogador (correspondência perfeita por ID normalizado)
  const playerItems = useMemo(() => {
    if (!targetCharId && !targetUserId) return [];

    return (inventoryItems || []).filter(it => {
      const itemCharId = normalizeId(it.character_id);
      const itemPlayerId = normalizeId(it.player_id);
      const metaCharId = normalizeId(it.metadata?.characterId);

      if (targetCharId && (itemCharId === targetCharId || itemPlayerId === targetCharId || metaCharId === targetCharId)) return true;
      if (targetUserId && (itemPlayerId === targetUserId || itemCharId === targetUserId || metaCharId === targetUserId)) return true;
      return false;
    });
  }, [inventoryItems, targetCharId, targetUserId]);

  // Itens equipados (verifica equip_slot, equipped ou is_equipped)
  const equippedItems = useMemo(() => {
    return playerItems.filter(it => !!(it.equip_slot || it.equipped || it.is_equipped));
  }, [playerItems]);

  const equippedMap = useMemo(() => {
    const map = {};
    equippedItems.forEach(it => {
      if (it.equip_slot) map[it.equip_slot] = it;
    });
    return map;
  }, [equippedItems]);

  // Contagem de munições na mochila (itens desequipados com ammo_type ou nome compatível)
  const ammoCounts = useMemo(() => {
    const counts = {
      flecha: 0,
      virote: 0,
      pedra: 0,
      bala: 0,
    };
    playerItems.forEach(it => {
      if (it.equip_slot || it.equipped || it.is_equipped) return; // Munição guardada na mochila
      const name = (it.name || '').toLowerCase();
      const type = (it.ammo_type || '').toLowerCase();
      const qty = it.quantity || 1;

      if (type.includes('flecha') || name.includes('flecha')) counts.flecha += qty;
      else if (type.includes('virote') || name.includes('virote')) counts.virote += qty;
      else if (type.includes('pedra') || name.includes('pedra')) counts.pedra += qty;
      else if (type.includes('bala') || name.includes('bala')) counts.bala += qty;
    });
    return counts;
  }, [playerItems]);

  // Cálculo de bônus acumulados de todos os itens equipados (suporta todas as variações de propriedades)
  const equipmentBonuses = useMemo(() => {
    let armorBonus = 0;
    let focusBonus = 0;
    let healthBonus = 0;
    const skillBonusMap = {};

    equippedItems.forEach(it => {
      const aBonus = Number(it.armor_bonus ?? it.armorBonus ?? it.defense ?? it.defense_bonus ?? it.defenseBonus ?? 0);
      const fBonus = Number(it.focus_bonus ?? it.focusBonus ?? 0);
      const hBonus = Number(it.health_bonus ?? it.healthBonus ?? 0);

      armorBonus += aBonus;
      focusBonus += fBonus;
      healthBonus += hBonus;

      let sBonus = it.skill_bonus || it.skillBonus;
      if (typeof sBonus === 'string') {
        try { sBonus = JSON.parse(sBonus); } catch (_) { sBonus = []; }
      }
      if (Array.isArray(sBonus)) {
        sBonus.forEach(sb => {
          if (!sb) return;
          const sName = (typeof sb === 'string' ? sb : sb.skill || sb.name || '').toLowerCase().trim();
          const sVal = typeof sb === 'object' && sb.bonus !== undefined ? Number(sb.bonus) : 1;
          if (sName) {
            skillBonusMap[sName] = (skillBonusMap[sName] || 0) + sVal;
          }
        });
      }
    });

    return {
      armorBonus,
      focusBonus,
      healthBonus,
      skillBonusMap,
    };
  }, [equippedItems]);

  // Determina a Defesa Base do personagem (sem armaduras equipadas nem efeitos temporários)
  const baseDefense = useMemo(() => {
    // 1. Se houver base_defense ou baseDefense explicitamente definido
    if (c?.base_defense !== undefined && c?.base_defense !== null) {
      return Number(c.base_defense);
    }
    if (c?.baseDefense !== undefined && c?.baseDefense !== null) {
      return Number(c.baseDefense);
    }
    if (player?.base_defense !== undefined && player?.base_defense !== null) {
      return Number(player.base_defense);
    }
    if (player?.baseDefense !== undefined && player?.baseDefense !== null) {
      return Number(player.baseDefense);
    }

    // 2. Se for um dos 4 heróis oficiais
    const official = officialCharacters.find(oc => {
      const ocNorm = normalizeId(oc.id);
      return (targetCharId && (targetCharId === ocNorm || targetCharId.includes(ocNorm) || ocNorm.includes(targetCharId))) ||
             (targetUserId && (targetUserId === ocNorm || targetUserId.includes(ocNorm))) ||
             (c?.name && normalizeId(c.name) === normalizeId(oc.name));
    });
    if (official) {
      return Number(official.base_defense ?? official.baseDefense ?? official.defense ?? 8);
    }

    // 3. Pelo caminho do personagem (Regras 2.0: 7 + armadura base do caminho)
    const charCaminho = c?.caminho || player?.caminho;
    if (charCaminho) {
      const caminhoObj = getCaminho(charCaminho);
      if (caminhoObj && caminhoObj.armadura !== undefined) {
        return 7 + Number(caminhoObj.armadura);
      }
    }

    // 4. Fallback padrão canônico das Regras 2.0
    return 8;
  }, [c?.base_defense, c?.baseDefense, player?.base_defense, player?.baseDefense, c?.name, c?.caminho, player?.caminho, targetCharId, targetUserId]);

  // Detecção de escudo equipado
  const hasShield = useMemo(() => {
    return equippedItems.some(it => {
      const slot = it.equip_slot || '';
      const cat = (it.category || '').toLowerCase();
      const sub = (it.subcategory || '').toLowerCase();
      const name = (it.name || '').toLowerCase();
      return slot === 'off_hand' || cat === 'shield' || cat === 'escudo' || sub === 'shield' || sub === 'escudo' || name.includes('escudo');
    });
  }, [equippedItems]);

  // Bônus derivados da Árvore do Juramento (Vida Máxima, Foco Máximo, Defesa e Perícias)
  const effectiveTreeData = useMemo(() => {
    return treeData ||
      player?.oath_tree ||
      c?.oath_tree ||
      getHeroTreeFromStorage(charId, userId) ||
      getDefaultHeroTree(charId || userId, skills) ||
      null;
  }, [treeData, player?.oath_tree, c?.oath_tree, charId, userId, skills]);

  const treeBonuses = useMemo(() => {
    return calculateOathTreeBonuses(effectiveTreeData, GRAPH?.N, { hasShield });
  }, [effectiveTreeData, hasShield]);

  // Cálculo da Defesa Total: Base do Herói + bônus de armadura + bônus de talentos + soma(defesa_mod * pilhas)
  const { defense, defenseModEffects, defenseFormula } = useMemo(() => {
    let effectsMod = 0;
    const parts = [`${baseDefense} Base`];
    if (equipmentBonuses.armorBonus !== 0) {
      parts.push(`${equipmentBonuses.armorBonus > 0 ? '+' : ''}${equipmentBonuses.armorBonus} Armadura`);
    }
    if (treeBonuses.defenseBonus > 0) {
      parts.push(`+${treeBonuses.defenseBonus} Talento`);
    }

    const effectsApplied = [];
    (activeEffects || []).forEach(eff => {
      const mod = Number(eff.catalogo?.defesa_mod || eff.defesa_mod || 0);
      const pilhas = Number(eff.pilhas || 1);
      if (mod !== 0) {
        const totalEffMod = mod * pilhas;
        effectsMod += totalEffMod;
        const nome = eff.catalogo?.nome || eff.nome || eff.efeito_id;
        const sign = totalEffMod > 0 ? '+' : '−';
        const absVal = Math.abs(totalEffMod);
        parts.push(`${sign} ${absVal} ${nome}`);
        effectsApplied.push({ nome, mod: totalEffMod, pilhas });
      }
    });

    const total = Math.max(0, baseDefense + equipmentBonuses.armorBonus + treeBonuses.defenseBonus + effectsMod);
    const formulaStr = `${parts.join(' ')} = ${total}`;

    return {
      defense: total,
      defenseModEffects: effectsMod,
      defenseFormula: formulaStr,
    };
  }, [baseDefense, equipmentBonuses.armorBonus, treeBonuses.defenseBonus, activeEffects]);

  const maxFocusBonus = equipmentBonuses.focusBonus + (treeBonuses.focusBonus || 0);
  const maxHealthBonus = equipmentBonuses.healthBonus + (treeBonuses.hpBonus || 0);
  const equipmentSkillBonuses = useMemo(() => {
    const map = { ...equipmentBonuses.skillBonusMap };
    if (treeBonuses.skillBonuses) {
      Object.entries(treeBonuses.skillBonuses).forEach(([k, s]) => {
        map[k] = (map[k] || 0) + (s.bonus || 0);
      });
    }
    return map;
  }, [equipmentBonuses.skillBonusMap, treeBonuses.skillBonuses]);

  // Helper para identificar se um item é uma arma equipável
  const isWeaponItem = (it) => {
    if (!it) return false;
    if (it.equippable_as === 'weapon' || it.equippable_as === 'arma') return true;
    if (it.category === 'weapon' || it.category === 'arma' || it.category === 'armas') return true;
    if (['main_hand', 'off_hand', 'two_handed', 'weapon', 'arma'].includes(it.equip_slot)) return true;
    if (it.damage_dice || it.damageDice) return true;
    return false;
  };

  // Lista de ataques prontos para combate
  const attacks = useMemo(() => {
    const list = [];
    const processedIds = new Set();

    const isRangedWeapon = (wpn) => {
      if (!wpn) return false;
      if (wpn.ranged || wpn.is_ranged || wpn.isRanged) return true;
      if (wpn.ammo_type || wpn.ammoType) return true;
      const text = `${wpn.name || ''} ${wpn.weapon_class || wpn.weaponClass || ''} ${wpn.subcategory || ''} ${wpn.category || ''} ${wpn.attack_attr || wpn.attackAttr || ''}`.toLowerCase();
      return /(arco|besta|funda|zarabatana|pistola|mosquete|rifle|atirar|tiro|disparo|distancia|distância|arremesso|flecha|virote|ranged|astucia|astúcia|destreza)/.test(text);
    };

    const buildWeaponAttack = (wpn, slotLabel) => {
      if (!wpn) return null;
      const ranged = isRangedWeapon(wpn);
      const rawAttr = (wpn.attack_attr || wpn.attackAttr || '').toLowerCase();

      let attrVal = 0;
      let attrLabel = 'Corpo';

      if (ranged || rawAttr.includes('astucia') || rawAttr.includes('astúcia') || rawAttr.includes('destreza')) {
        attrVal = Number(attrs.astucia ?? attrs.destreza ?? 0);
        attrLabel = 'Astúcia';
      } else if (rawAttr.includes('vontade') || rawAttr.includes('mente')) {
        attrVal = Number(attrs.vontade ?? attrs.mente ?? 0);
        attrLabel = 'Vontade';
      } else if (rawAttr.includes('presenca') || rawAttr.includes('presença')) {
        attrVal = Number(attrs.presenca ?? 0);
        attrLabel = 'Presença';
      } else {
        attrVal = Number(attrs.corpo ?? 0);
        attrLabel = 'Corpo';
      }

      // Procura perícia de combate correspondente nas skills do personagem (apenas informativo)
      const wpnClass = (wpn.weapon_class || wpn.weaponClass || '').toLowerCase();
      const matchedSkill = skills.find(s => {
        const sName = (s.name || '').toLowerCase();
        if (wpnClass && sName.includes(wpnClass)) return true;
        if (ranged && (sName.includes('tiro') || sName.includes('arqueria') || sName.includes('disparo'))) return true;
        if (!ranged && (sName.includes('luta') || sName.includes('combate') || sName.includes('armas') || sName.includes('forja'))) return true;
        return false;
      });

      const skillMod = matchedSkill ? Number(matchedSkill.bonus || 1) : 0;
      const atkBonus = Number(wpn.attack_bonus ?? wpn.attackBonus ?? 0);
      // Regra canônica: Arma de mão = 2d6 + Corpo | Arma de atirar = 2d6 + Astúcia (+ bônus mágico da arma se houver)
      const totalAttackMod = attrVal + atkBonus;

      const dmgBonus = Number(wpn.damage_bonus ?? wpn.damageBonus ?? 0);
      const ammoKey = (wpn.ammo_type || wpn.ammoType || '').toLowerCase();
      let ammoRemaining = null;
      if (ranged && ammoKey) {
        if (ammoKey.includes('flecha')) ammoRemaining = ammoCounts.flecha;
        else if (ammoKey.includes('virote')) ammoRemaining = ammoCounts.virote;
        else if (ammoKey.includes('pedra')) ammoRemaining = ammoCounts.pedra;
        else ammoRemaining = ammoCounts[ammoKey] ?? 0;
      }

      return {
        id: wpn.id,
        item: wpn,
        name: wpn.name,
        slotLabel,
        isRanged: ranged,
        twoHanded: !!(wpn.two_handed || wpn.twoHanded),
        weaponClass: wpn.weapon_class || wpn.weaponClass || (ranged ? 'Distância' : 'Lâmina'),
        attackAttr: attrLabel,
        attrVal,
        skillName: matchedSkill?.name || null,
        skillMod,
        attackBonus: atkBonus,
        totalAttackMod,
        damageDice: wpn.damage_dice || wpn.damageDice || '1d6',
        damageBonus: dmgBonus,
        ammoType: wpn.ammo_type || wpn.ammoType,
        ammoRemaining,
        special: wpn.special,
      };
    };

    // Percorre todos os itens equipados buscando armas
    equippedItems.forEach(it => {
      if (isWeaponItem(it) && !processedIds.has(it.id)) {
        processedIds.add(it.id);
        let slotLabel = 'Equipado';
        if (it.equip_slot === 'main_hand') slotLabel = 'Mão Principal';
        else if (it.equip_slot === 'off_hand') slotLabel = 'Mão Secundária';
        else if (it.equip_slot === 'two_handed') slotLabel = 'Duas Mãos';
        else if (it.equip_slot === 'weapon') slotLabel = 'Arma Equipada';

        const atkObj = buildWeaponAttack(it, slotLabel);
        if (atkObj) list.push(atkObj);
      }
    });

    // Se não tiver nenhuma arma em punho equipada, adiciona Ataque Desarmado (1d4 de dano, 2d6 + Corpo)
    if (list.length === 0) {
      const corpoVal = Number(attrs.corpo ?? 0);
      const fightSkill = skills.find(s => (s.name || '').toLowerCase().includes('briga') || (s.name || '').toLowerCase().includes('luta'));
      list.push({
        id: 'unarmed',
        item: null,
        name: 'Ataque Desarmado / Punhos',
        slotLabel: 'Desarmado',
        isRanged: false,
        twoHanded: false,
        weaponClass: 'Corpo a Corpo',
        attackAttr: 'Corpo',
        attrVal: corpoVal,
        skillName: fightSkill?.name || null,
        skillMod: fightSkill ? Number(fightSkill.bonus || 1) : 0,
        attackBonus: 0,
        totalAttackMod: corpoVal,
        damageDice: '1d4',
        damageBonus: 0,
        ammoType: null,
        ammoRemaining: null,
        special: 'Dano atordoante básico',
      });
    }

    return list;
  }, [equippedItems, attrs, skills, ammoCounts]);

  return {
    defense,
    baseDefense,
    defenseModEffects,
    defenseFormula,
    maxFocusBonus,
    maxHealthBonus,
    equipmentSkillBonuses,
    equippedItems,
    equippedMap,
    attacks,
    ammoCounts,
    treeBonuses,
    treeHpBonus: treeBonuses?.hpBonus || 0,
    treeFocusBonus: treeBonuses?.focusBonus || 0,
    treeDefenseBonus: treeBonuses?.defenseBonus || 0,
  };
}
