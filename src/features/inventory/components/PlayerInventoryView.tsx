import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  ArrowRightLeft,
  Coins,
  Droplets,
  Heart,
  Package,
  Search,
  Shield,
  Sparkles,
  Sword,
  Trash2,
  Users,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  type EquipSlotKey,
  type InventoryItemRecord,
  canEquipInSlot,
  formatCoinsString,
  getDefaultEquipSlot,
} from '../../../entities/item';
import { useSessionStore } from '../../../shared/stores/session';
import '../../../styles/features/PlayerInventory.css';
import { useBackpack } from '../hooks/useBackpack';
import { BackpackGrid } from './BackpackGrid';
import { renderItemFallbackIcon } from './BackpackSlot';
import { DiscardModal } from './DiscardModal';
import { EquipSilhouette } from './EquipSilhouette';
import { TransferModal } from './TransferModal';

export const PlayerInventoryView: React.FC = () => {
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const selectHero = useSessionStore((s) => s.selectHero);

  // Fallback se não houver herói ativo na sessão
  const heroId = sessionHeroId || 'teste_1';

  const {
    hero,
    heroes,
    slots,
    equippedMap,
    coins,
    totalWeight,
    occupiedCount,
    selectedItem,
    setSelectedItem,
    recentlyReceivedId,
    handleMoveSlot,
    handleEquip,
    handleUnequip,
    handleUseItem,
    handleTransfer,
    handleDiscard,
  } = useBackpack(heroId);

  const [mobileTab, setMobileTab] = useState<'mochila' | 'equipamento'>('mochila');
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todos');

  // Modais secundários
  const [transferItem, setTransferItem] = useState<InventoryItemRecord | null>(null);
  const [discardItem, setDiscardItem] = useState<InventoryItemRecord | null>(null);

  // Drag & drop state
  const [activeDragItem, setActiveDragItem] = useState<{
    item: InventoryItemRecord;
    isEquipped?: boolean;
    slotIndex?: number;
    slotKey?: EquipSlotKey;
  } | null>(null);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 6,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 150,
      tolerance: 5,
    },
  });

  const sensors = useSensors(pointerSensor, touchSensor);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as {
      item: InventoryItemRecord;
      isEquipped?: boolean;
      slotIndex?: number;
      slotKey?: EquipSlotKey;
    };
    if (data?.item) {
      setActiveDragItem(data);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const activeData = active.data.current as {
      item: InventoryItemRecord;
      isEquipped?: boolean;
      slotIndex?: number;
      slotKey?: EquipSlotKey;
    };
    if (!activeData?.item) return;

    const activeItem = activeData.item;
    const isFromEquip = Boolean(activeData.isEquipped);
    const overId = String(over.id);

    // 1. Soltou sobre um slot de equipamento
    if (overId.startsWith('equip-')) {
      const targetSlot = overId.replace('equip-', '') as EquipSlotKey;
      const mainHand = equippedMap.main_hand;
      if (!canEquipInSlot(activeItem, targetSlot, mainHand)) {
        toast.error(`Este item não pode ser equipado em ${targetSlot.replace('_', ' ')}.`);
        return;
      }
      try {
        await handleEquip(activeItem, targetSlot);
      } catch (err) {
        console.error('[EQUIP ERROR]', err);
      }
      return;
    }

    // 2. Desequipando item (arrastou do slot de equipamento para a grade)
    if (isFromEquip && overId.startsWith('slot-')) {
      const overData = over.data.current as { slotIndex: number };
      const targetSlotIndex = overData?.slotIndex;
      try {
        await handleUnequip(activeItem, targetSlotIndex);
      } catch (err) {
        console.error('[UNEQUIP ERROR]', err);
      }
      return;
    }

    // 3. Mochila para mochila (reorganização)
    if (!isFromEquip && overId.startsWith('slot-')) {
      const sourceSlot = activeData.slotIndex;
      const overData = over.data.current as { slotIndex: number };
      const targetSlot = overData?.slotIndex;
      if (
        sourceSlot !== undefined &&
        targetSlot !== undefined &&
        sourceSlot !== targetSlot
      ) {
        await handleMoveSlot(sourceSlot, targetSlot);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveDragItem(null);
  };

  const handleSelectSlot = useCallback(
    (item: InventoryItemRecord) => {
      setSelectedItem(item);
    },
    [setSelectedItem],
  );

  const handleSelectEquipSlot = useCallback(
    (_slotKey: EquipSlotKey, item: InventoryItemRecord | null) => {
      if (item) {
        setSelectedItem(item);
      }
    },
    [setSelectedItem],
  );

  // Cálculo da Defesa total: base + armaduras e escudos equipados
  const defense = useMemo(() => {
    const base = Number(hero?.defense ?? 7);
    const armorBonus = Number(equippedMap.chest?.armor_bonus || 0);
    const shieldBonus = Number(equippedMap.off_hand?.armor_bonus || 0);
    const headBonus = Number(equippedMap.head?.armor_bonus || 0);
    const amuletBonus = Number(equippedMap.amulet?.armor_bonus || 0);
    return base + armorBonus + shieldBonus + headBonus + amuletBonus;
  }, [hero?.defense, equippedMap]);

  // Vitals para os 4 Círculos
  const currentHp = hero?.health ?? 20;
  const maxHp = Math.max(1, hero?.max_health ?? 20);
  const isFallen = currentHp <= 0;
  const currentFocus = hero?.focus ?? 5;
  const maxFocus = Math.max(1, hero?.max_focus ?? 5);
  const saciedade = Math.max(0, Math.min(10, Number((hero as any)?.saciedade ?? 10)));
  const currentPlague = Math.max(0, Math.min(10, Number(hero?.plague ?? 0)));

  const categories = [
    { id: 'todos', label: `Todos (${occupiedCount})` },
    { id: 'armas', label: 'Armas' },
    { id: 'armaduras', label: 'Armaduras' },
    { id: 'alquimia', label: 'Consumíveis' },
    { id: 'comida', label: 'Comida' },
    { id: 'reliquias', label: 'Valiosos' },
  ];

  const defaultEquipSlot = useMemo(() => {
    if (!selectedItem || selectedItem.equip_slot) return null;
    return getDefaultEquipSlot(selectedItem, equippedMap);
  }, [selectedItem, equippedMap]);

  const isConsumable = useMemo(() => {
    if (!selectedItem) return false;
    const cat = (selectedItem.category || selectedItem.type || '').toLowerCase();
    const name = (selectedItem.name || '').toLowerCase();
    const wearType = selectedItem.wear_type || 'unlimited';
    return (
      cat.includes('alquimia') ||
      cat.includes('consumível') ||
      cat.includes('consumivel') ||
      cat.includes('poção') ||
      cat.includes('pocao') ||
      cat.includes('elixir') ||
      cat.includes('comida') ||
      cat.includes('prato') ||
      cat.includes('pergaminho') ||
      name.includes('poção') ||
      name.includes('ração') ||
      name.includes('pão') ||
      wearType === 'single_use' ||
      wearType === 'single'
    );
  }, [selectedItem]);

  const isFood = useMemo(() => {
    if (!selectedItem) return false;
    const cat = (selectedItem.category || selectedItem.type || '').toLowerCase();
    const name = (selectedItem.name || '').toLowerCase();
    return (
      cat.includes('comida') ||
      cat.includes('prato') ||
      name.includes('ração') ||
      name.includes('pão') ||
      name.includes('assado') ||
      name.includes('queijo')
    );
  }, [selectedItem]);

  return (
    <div className="modern-inv-root">
      {/* Banner de seleção de herói rápido se não houver herói na sessão */}
      {!sessionHeroId && (
        <div
          style={{
            background: 'rgba(201, 169, 97, 0.08)',
            border: '1px solid rgba(201, 169, 97, 0.2)',
            borderRadius: '5px',
            padding: '0.25rem 0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.7rem',
            color: '#ecd395',
            flexWrap: 'wrap',
            gap: '0.3rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Users size={12} />
            <span>
              Herói: <strong>{hero?.name || heroId}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {heroes.slice(0, 3).map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => selectHero(h.id)}
                style={{
                  background: '#1c1812',
                  border: '1px solid rgba(201, 169, 97, 0.3)',
                  color: '#ecd395',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '3px',
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-title, "Cinzel", serif)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                {h.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 1. HEADER EXECUTIVO: IDENTIDADE, CARTEIRA & MÉTRICAS ── */}
      <div className="modern-inv-header">
        <div className="modern-inv-header-top-row">
          <div className="modern-inv-hero-info">
            <span className="modern-inv-kicker">
              <Sparkles size={10} /> ARSENAL & INVENTÁRIO
            </span>
            <h2 className="modern-inv-title">
              {hero?.name || 'Mochila de Viagem'}
              <span className="modern-inv-badge-oath">
                {(hero as any)?.oath || hero?.title || hero?.race || 'Guerreiro'}
              </span>
            </h2>
          </div>

          {/* Carteira do Jurado */}
          <div className="modern-inv-wallet-box">
            <div className="modern-inv-coins-row">
              <div className="modern-coin-item gold" title="Ouro (1 Ouro = 50 Pratas = 2500 Bronzes)">
                <span className="modern-coin-pip gold" />
                <span>{coins.gold}</span>
                <span className="modern-coin-suffix">o</span>
              </div>
              <div className="modern-coin-item silver" title="Prata (1 Prata = 50 Bronzes)">
                <span className="modern-coin-pip silver" />
                <span>{coins.silver}</span>
                <span className="modern-coin-suffix">p</span>
              </div>
              <div className="modern-coin-item bronze" title="Bronze (Cobre)">
                <span className="modern-coin-pip bronze" />
                <span>{coins.bronze}</span>
                <span className="modern-coin-suffix">b</span>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas Rápidas: Defesa e Carga */}
        <div className="modern-inv-metrics-group">
          <div className="modern-inv-metric-chip defense" title="Defesa Total: Base + Bônus de Armaduras">
            <Shield size={12} />
            <span>DEFESA <strong>{defense}</strong></span>
          </div>
          <div className="modern-inv-metric-chip capacity" title={`Ocupação da Mochila: ${occupiedCount} de 40 slots (Peso: ${totalWeight}kg)`}>
            <Package size={12} />
            <span>CARGA <strong>{occupiedCount}/40</strong></span>
          </div>
        </div>
      </div>

      {/* ── 2. SELETOR MOBILE: ALTERNAR ENTRE MOCHILA E ARSENAL (TELAS < 840px) ── */}
      <div className="modern-inv-mobile-switch">
        <button
          type="button"
          onClick={() => setMobileTab('mochila')}
          className={`modern-inv-mobile-switch-btn ${mobileTab === 'mochila' ? 'active' : ''}`}
        >
          <Package size={15} />
          <span>Mochila ({occupiedCount}/40)</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('equipamento')}
          className={`modern-inv-mobile-switch-btn ${mobileTab === 'equipamento' ? 'active' : ''}`}
        >
          <Shield size={15} />
          <span>Arsenal ({defense} Defesa)</span>
        </button>
      </div>

      {/* ── 3. DND CONTEXT UNIFICADO: BENTO GRID (MOCHILA + ARSENAL & INSPETOR) ── */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="modern-inv-bento-layout">
          {/* ── COLUNA ESQUERDA: A MOCHILA DE VIAGEM ── */}
          <div className={`modern-backpack-card ${mobileTab !== 'mochila' ? 'mobile-hidden' : ''}`}>
            <div className="modern-backpack-header">
              <div className="modern-backpack-title-row">
                <h3 className="modern-backpack-title">Mochila de Viagem</h3>
                <span className="modern-backpack-count">({occupiedCount}/40)</span>
              </div>
              <span className="modern-backpack-hint">
                {selectedItem ? 'Item selecionado' : 'Toque ou arraste para organizar'}
              </span>
            </div>

            {/* Toolbar com Barra de Busca e Filtros de Categoria */}
            <div className="modern-backpack-toolbar">
              <div className="modern-backpack-search-wrap">
                <Search size={14} className="modern-backpack-search-icon" />
                <input
                  type="text"
                  placeholder="Buscar itens, armas, poções..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="modern-backpack-search-input"
                />
                {searchFilter && (
                  <button
                    type="button"
                    onClick={() => setSearchFilter('')}
                    className="modern-backpack-search-clear"
                    title="Limpar busca"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="modern-backpack-chips-row">
                {categories.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`modern-backpack-chip ${categoryFilter === tab.id ? 'active' : ''}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid com os 40 Slots */}
            <BackpackGrid
              slots={slots}
              selectedItemId={selectedItem?.id || null}
              recentlyReceivedId={recentlyReceivedId}
              searchFilter={searchFilter}
              categoryFilter={categoryFilter}
              onSelectSlot={handleSelectSlot}
            />
          </div>

          {/* ── COLUNA DIREITA: MANEQUIM DE EQUIPAMENTO & INSPETOR ── */}
          <div className={`modern-armory-column ${mobileTab !== 'equipamento' ? 'mobile-hidden' : ''}`}>
            {/* CARD DO MANEQUIM */}
            <EquipSilhouette
              equippedMap={equippedMap}
              selectedItem={selectedItem}
              defense={defense}
              heroPortrait={(hero as any)?.portrait_url || hero?.avatar_icon}
              onSelectSlot={handleSelectEquipSlot}
              onEquip={(item, slotKey) => handleEquip(item, slotKey)}
            />

            {/* CARD DO INSPETOR DE ITENS (DESKTOP) */}
            <div className="modern-inspector-card desktop-only">
              {selectedItem ? (
                <>
                  <div className="modern-inspector-header">
                    <div className="modern-inspector-avatar-box">
                      {selectedItem.image_url ? (
                        <img
                          src={selectedItem.image_url}
                          alt={selectedItem.name}
                          className="modern-inspector-avatar-img"
                        />
                      ) : selectedItem.icon && !selectedItem.icon.startsWith('<') ? (
                        <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{selectedItem.icon}</span>
                      ) : (
                        renderItemFallbackIcon(selectedItem)
                      )}
                    </div>

                    <div className="modern-inspector-meta-col">
                      <div className="modern-inspector-title-row">
                        <h4 className="modern-inspector-name">{selectedItem.name}</h4>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(null)}
                          className="modern-inspector-close"
                          title="Desmarcar item"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="modern-inspector-badges-row">
                        <span className={`modern-chip-rarity rarity-${(selectedItem.rarity || 'comum').toLowerCase()}`}>
                          {selectedItem.rarity || 'Comum'}
                        </span>
                        <span className="modern-chip-tag">
                          {selectedItem.category || selectedItem.type || 'Equipamento'}
                        </span>
                        {selectedItem.equip_slot && (
                          <span className="modern-chip-tag equipped">
                            <Sword size={11} />
                            Equipado ({selectedItem.equip_slot.replace('_', ' ')})
                          </span>
                        )}
                        {Boolean(selectedItem.metadata?.addedByDM || selectedItem.addedByDM) && (
                          <span className="modern-chip-tag" style={{ color: '#eab308' }}>
                            <Sparkles size={11} /> Dádiva Sagrada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Atributos de Combate & Economia */}
                  {(selectedItem.damage_dice ||
                    Number(selectedItem.armor_bonus) > 0 ||
                    Number(selectedItem.price_bronze) > 0) && (
                    <div className="modern-inspector-stats-row">
                      {selectedItem.damage_dice && (
                        <div className="modern-inspector-stat-chip">
                          <Sword size={12} style={{ color: '#e6cf94' }} />
                          <span>
                            Dano: <strong>{selectedItem.damage_dice}</strong>{' '}
                            {selectedItem.two_handed ? '(2 Mãos)' : ''}
                          </span>
                        </div>
                      )}
                      {Number(selectedItem.armor_bonus) > 0 && (
                        <div className="modern-inspector-stat-chip">
                          <Shield size={12} style={{ color: '#88c075' }} />
                          <span>
                            Defesa: <strong>+{selectedItem.armor_bonus}</strong>
                          </span>
                        </div>
                      )}
                      {Number(selectedItem.price_bronze) > 0 && (
                        <div className="modern-inspector-stat-chip">
                          <Coins size={12} style={{ color: '#eab308' }} />
                          <span>
                            Valor: <strong>{formatCoinsString(selectedItem.price_bronze)}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedItem.description && (
                    <p className="modern-inspector-desc">{selectedItem.description}</p>
                  )}

                  {/* Grupo de Ações do Item */}
                  <div className="modern-inspector-actions">
                    {/* Botão Equipar / Desequipar */}
                    {selectedItem.equip_slot ? (
                      <button
                        type="button"
                        onClick={() => handleUnequip(selectedItem)}
                        className="modern-btn secondary"
                      >
                        <Shield size={14} />
                        <span>Desequipar</span>
                      </button>
                    ) : defaultEquipSlot ? (
                      <button
                        type="button"
                        onClick={() => handleEquip(selectedItem, defaultEquipSlot)}
                        className="modern-btn primary"
                      >
                        <Sword size={14} />
                        <span>Equipar</span>
                      </button>
                    ) : null}

                    {/* Botão de Consumir / Usar */}
                    {isConsumable && (
                      <button
                        type="button"
                        onClick={() => handleUseItem(selectedItem)}
                        className="modern-btn primary"
                      >
                        {isFood ? <Utensils size={14} /> : <Sparkles size={14} />}
                        <span>{isFood ? 'Comer' : 'Usar'}</span>
                      </button>
                    )}

                    {/* Botão Transferir */}
                    <button
                      type="button"
                      onClick={() => setTransferItem(selectedItem)}
                      className="modern-btn secondary"
                      title="Transferir item a outro Jurado"
                    >
                      <ArrowRightLeft size={14} />
                      <span>Transferir</span>
                    </button>

                    {/* Botão Descartar */}
                    <button
                      type="button"
                      onClick={() => setDiscardItem(selectedItem)}
                      className="modern-btn danger"
                      title="Descartar item da mochila"
                    >
                      <Trash2 size={14} />
                      <span>Descartar</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="modern-inspector-empty">
                  <Package size={32} className="modern-inspector-empty-icon" />
                  <p className="modern-inspector-empty-text">
                    Selecione qualquer compartimento da mochila ou slot de equipamento para visualizar atributos, equipar ou consumir.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── DRAG OVERLAY ── */}
        <DragOverlay
          dropAnimation={{
            duration: 150,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {activeDragItem ? (
            <div className="modern-drag-overlay">
              {activeDragItem.item.image_url ? (
                <img
                  src={activeDragItem.item.image_url}
                  alt={activeDragItem.item.name}
                />
              ) : activeDragItem.item.icon && !activeDragItem.item.icon.startsWith('<') ? (
                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{activeDragItem.item.icon}</span>
              ) : (
                renderItemFallbackIcon(activeDragItem.item)
              )}
              {Number(activeDragItem.item.quantity || 1) > 1 && (
                <span className="modern-drag-overlay-qty">
                  {activeDragItem.item.quantity}
                </span>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ── 4 CÍRCULOS VITAIS: VIDA | FOME | FOCO | PESTE (ABAIXO DO INVENTÁRIO) ── */}
      <div className="diablo-bottom-bar">
        {/* 1. CÍRCULO DE VIDA */}
        <div className="diablo-orb-container" title={`Vitalidade: ${currentHp}/${maxHp} HP`}>
          <div className={`diablo-health-orb ${isFallen ? 'fallen' : currentHp <= 3 ? 'critical' : ''}`}>
            <div
              className="diablo-orb-liquid-health"
              style={{
                height: `${Math.max(8, Math.min(100, (currentHp / maxHp) * 100))}%`,
                opacity: isFallen ? 0.3 : 1,
              }}
            />
            <div className="diablo-orb-reflection" />
            <div className="diablo-orb-specular" />
            <div className="diablo-orb-value">
              {isFallen ? (
                <>
                  <span style={{ fontSize: '1rem', color: '#fca5a5' }}>💀</span>
                  <small style={{ fontSize: '0.5rem', display: 'block', color: '#fca5a5', fontWeight: 800 }}>CAÍDO</small>
                </>
              ) : (
                <>
                  <span>{currentHp}</span>
                  <small style={{ fontSize: '0.62rem', display: 'block', opacity: 0.85, color: '#fca5a5' }}>
                    /{maxHp}
                  </small>
                </>
              )}
            </div>
          </div>
          <div className="diablo-orb-footer-label">
            <Heart size={11} style={{ color: isFallen ? '#ef4444' : '#f87171' }} />
            <span style={{ color: isFallen ? '#ef4444' : '#fca5a5' }}>VIDA</span>
          </div>
        </div>

        {/* 2. CÍRCULO DE FOME / SACIEDADE */}
        <div className="diablo-orb-container" title={`Fome / Saciedade: ${saciedade}/10`}>
          <div className={`diablo-hunger-orb ${saciedade === 0 ? 'starving' : saciedade <= 3 ? 'hungry' : ''}`}>
            <div
              className="diablo-orb-liquid-hunger"
              style={{
                height: `${Math.max(10, Math.min(100, (saciedade / 10) * 100))}%`,
                background:
                  saciedade === 0
                    ? 'radial-gradient(circle at 45% 65%, #ef4444 0%, #991b1b 50%, #450a0a 100%)'
                    : saciedade <= 3
                    ? 'radial-gradient(circle at 45% 65%, #f97316 0%, #c2410c 50%, #7c2d12 100%)'
                    : saciedade < 7
                    ? 'radial-gradient(circle at 45% 65%, #eab308 0%, #ca8a04 50%, #713f12 100%)'
                    : 'radial-gradient(circle at 45% 65%, #84cc16 0%, #65a30d 50%, #365314 100%)',
              }}
            />
            <div className="diablo-orb-reflection" />
            <div className="diablo-orb-specular" />
            <div className="diablo-orb-value">
              <span>{saciedade}</span>
              <small style={{ fontSize: '0.62rem', display: 'block', opacity: 0.85, color: '#fef08a' }}>
                /10
              </small>
            </div>
          </div>
          <div className="diablo-orb-footer-label">
            <Utensils size={11} style={{ color: '#facc15' }} />
            <span style={{ color: '#fde047' }}>FOME</span>
          </div>
        </div>

        {/* 3. CÍRCULO DE FOCO */}
        <div className="diablo-orb-container" title={`Foco Arcano: ${currentFocus}/${maxFocus}`}>
          <div className="diablo-focus-orb">
            <div
              className="diablo-orb-liquid-focus"
              style={{
                height: `${Math.max(8, Math.min(100, (currentFocus / maxFocus) * 100))}%`,
              }}
            />
            <div className="diablo-orb-reflection" />
            <div className="diablo-orb-specular" />
            <div className="diablo-orb-value">
              <span>{currentFocus}</span>
              <small style={{ fontSize: '0.62rem', display: 'block', opacity: 0.85, color: '#bae6fd' }}>
                /{maxFocus}
              </small>
            </div>
          </div>
          <div className="diablo-orb-footer-label">
            <Zap size={11} style={{ color: '#38bdf8' }} />
            <span style={{ color: '#7dd3fc' }}>FOCO</span>
          </div>
        </div>

        {/* 4. CÍRCULO DE PESTE */}
        <div className="diablo-orb-container" title={`Peste do Juramento: ${currentPlague}/10`}>
          <div className={`diablo-plague-orb ${currentPlague >= 8 ? 'high-danger' : ''}`}>
            <div
              className="diablo-orb-liquid-plague"
              style={{
                height: `${Math.max(10, Math.min(100, (currentPlague / 10) * 100))}%`,
                background:
                  currentPlague >= 8
                    ? 'radial-gradient(circle at 45% 65%, #dc2626 0%, #7f1d1d 50%, #450a0a 100%)'
                    : currentPlague >= 4
                    ? 'radial-gradient(circle at 45% 65%, #c084fc 0%, #9333ea 50%, #581c87 80%, #2e1065 100%)'
                    : 'radial-gradient(circle at 45% 65%, #60a5fa 0%, #2563eb 50%, #1e40af 80%, #0f172a 100%)',
              }}
            />
            <div className="diablo-orb-reflection" />
            <div className="diablo-orb-specular" />
            <div className="diablo-orb-value">
              <span>{currentPlague}</span>
              <small style={{ fontSize: '0.62rem', display: 'block', opacity: 0.85, color: '#e9d5ff' }}>
                /10
              </small>
            </div>
          </div>
          <div className="diablo-orb-footer-label">
            <Droplets size={11} style={{ color: currentPlague >= 8 ? '#f87171' : currentPlague >= 4 ? '#c084fc' : '#93c5fd' }} />
            <span style={{ color: currentPlague >= 8 ? '#f87171' : currentPlague >= 4 ? '#c084fc' : '#93c5fd' }}>
              PESTE
            </span>
          </div>
        </div>
      </div>

      {/* ── MOBILE BOTTOM SHEET: APARECE QUANDO UM ITEM ESTÁ SELECIONADO EM TELAS PEQUENAS ── */}
      {selectedItem && (
        <div className="modern-mobile-sheet-backdrop" onClick={() => setSelectedItem(null)}>
          <div className="modern-mobile-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="modern-mobile-sheet-handle" onClick={() => setSelectedItem(null)} />

            <div className="modern-inspector-header">
              <div className="modern-inspector-avatar-box">
                {selectedItem.image_url ? (
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    className="modern-inspector-avatar-img"
                  />
                ) : selectedItem.icon && !selectedItem.icon.startsWith('<') ? (
                  <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{selectedItem.icon}</span>
                ) : (
                  renderItemFallbackIcon(selectedItem)
                )}
              </div>

              <div className="modern-inspector-meta-col">
                <div className="modern-inspector-title-row">
                  <h4 className="modern-inspector-name">{selectedItem.name}</h4>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="modern-inspector-close"
                    title="Fechar"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="modern-inspector-badges-row">
                  <span className={`modern-chip-rarity rarity-${(selectedItem.rarity || 'comum').toLowerCase()}`}>
                    {selectedItem.rarity || 'Comum'}
                  </span>
                  <span className="modern-chip-tag">
                    {selectedItem.category || selectedItem.type || 'Equipamento'}
                  </span>
                  {selectedItem.equip_slot && (
                    <span className="modern-chip-tag equipped">
                      <Sword size={11} />
                      Equipado ({selectedItem.equip_slot.replace('_', ' ')})
                    </span>
                  )}
                  {Boolean(selectedItem.metadata?.addedByDM || selectedItem.addedByDM) && (
                    <span className="modern-chip-tag" style={{ color: '#eab308' }}>
                      <Sparkles size={11} /> Dádiva Sagrada
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Atributos de Combate & Economia */}
            {(selectedItem.damage_dice ||
              Number(selectedItem.armor_bonus) > 0 ||
              Number(selectedItem.price_bronze) > 0) && (
              <div className="modern-inspector-stats-row">
                {selectedItem.damage_dice && (
                  <div className="modern-inspector-stat-chip">
                    <Sword size={12} style={{ color: '#e6cf94' }} />
                    <span>
                      Dano: <strong>{selectedItem.damage_dice}</strong>{' '}
                      {selectedItem.two_handed ? '(2 Mãos)' : ''}
                    </span>
                  </div>
                )}
                {Number(selectedItem.armor_bonus) > 0 && (
                  <div className="modern-inspector-stat-chip">
                    <Shield size={12} style={{ color: '#88c075' }} />
                    <span>
                      Defesa: <strong>+{selectedItem.armor_bonus}</strong>
                    </span>
                  </div>
                )}
                {Number(selectedItem.price_bronze) > 0 && (
                  <div className="modern-inspector-stat-chip">
                    <Coins size={12} style={{ color: '#eab308' }} />
                    <span>
                      Valor: <strong>{formatCoinsString(selectedItem.price_bronze)}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {selectedItem.description && (
              <p className="modern-inspector-desc">{selectedItem.description}</p>
            )}

            {/* Ações Rápidas Mobile com botões confortáveis para o polegar */}
            <div className="modern-inspector-actions">
              {selectedItem.equip_slot ? (
                <button
                  type="button"
                  onClick={() => handleUnequip(selectedItem)}
                  className="modern-btn secondary"
                >
                  <Shield size={14} />
                  <span>Desequipar</span>
                </button>
              ) : defaultEquipSlot ? (
                <button
                  type="button"
                  onClick={() => handleEquip(selectedItem, defaultEquipSlot)}
                  className="modern-btn primary"
                >
                  <Sword size={14} />
                  <span>Equipar</span>
                </button>
              ) : null}

              {isConsumable && (
                <button
                  type="button"
                  onClick={() => handleUseItem(selectedItem)}
                  className="modern-btn primary"
                >
                  {isFood ? <Utensils size={14} /> : <Sparkles size={14} />}
                  <span>{isFood ? 'Comer' : 'Usar'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setTransferItem(selectedItem)}
                className="modern-btn secondary"
              >
                <ArrowRightLeft size={14} />
                <span>Transferir</span>
              </button>

              <button
                type="button"
                onClick={() => setDiscardItem(selectedItem)}
                className="modern-btn danger"
              >
                <Trash2 size={14} />
                <span>Descartar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAIS DE SUPORTE (TRANSFERÊNCIA & DESCARTE) ── */}
      <TransferModal
        item={transferItem}
        open={Boolean(transferItem)}
        onOpenChange={(open) => {
          if (!open) setTransferItem(null);
        }}
        currentHeroId={heroId}
        heroes={heroes}
        onConfirmTransfer={handleTransfer}
      />

      <DiscardModal
        item={discardItem}
        open={Boolean(discardItem)}
        onOpenChange={(open) => {
          if (!open) setDiscardItem(null);
        }}
        onConfirmDiscard={handleDiscard}
      />
    </div>
  );
};
