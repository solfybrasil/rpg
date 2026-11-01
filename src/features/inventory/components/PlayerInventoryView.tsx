import { Search, Users } from 'lucide-react';
import { m } from 'motion/react';
import React, { useState } from 'react';
import type { EquipSlotKey, InventoryItemRecord } from '../../../entities/item';
import { useSessionStore } from '../../../shared/stores/session';
import { spring } from '../../../shared/styles/motion';
import { Skeleton } from '../../../shared/ui/Skeleton';
import { useBackpack } from '../hooks/useBackpack';
import { BackpackGrid } from './BackpackGrid';
import { DiscardModal } from './DiscardModal';
import { EquipSilhouette } from './EquipSilhouette';
import { InventoryFooter } from './InventoryFooter';
import { ItemDetailSheet } from './ItemDetailSheet';
import { TransferModal } from './TransferModal';

export const PlayerInventoryView: React.FC = () => {
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const selectHero = useSessionStore((s) => s.selectHero);

  // Fallback se não tiver herói selecionado
  const heroId = sessionHeroId || 'teste_1';

  const {
    hero,
    heroes,
    slots,
    equippedMap,
    coins,
    totalWeight,
    occupiedCount,
    isLoading,
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

  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todos');

  // Modais secundários
  const [transferItem, setTransferItem] = useState<InventoryItemRecord | null>(null);
  const [discardItem, setDiscardItem] = useState<InventoryItemRecord | null>(null);

  const handleSelectSlot = (item: InventoryItemRecord) => {
    setSelectedItem(item);
  };

  const handleSelectEquipSlot = (_slotKey: EquipSlotKey, item: InventoryItemRecord | null) => {
    if (item) {
      setSelectedItem(item);
    }
  };

  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'armas', label: 'Armas' },
    { id: 'armaduras', label: 'Armaduras' },
    { id: 'consumiveis', label: 'Consumíveis' },
    { id: 'artefatos', label: 'Artefatos' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[var(--stone)] text-[var(--text)] overflow-hidden">
      {/* Banner de seleção de herói rápido se não houver herói na sessão */}
      {!sessionHeroId && (
        <div className="bg-[var(--gold-lo)]/20 border-b border-[var(--gold-lo)] px-4 py-2 flex items-center justify-between text-xs text-[var(--gold-hi)] font-['Cinzel',serif]">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            <span>
              Visualizando inventário de teste: <strong>{hero?.name || heroId}</strong>
            </span>
          </div>
          <div className="flex gap-1">
            {heroes.slice(0, 3).map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => selectHero(h.id)}
                className="px-2 py-0.5 slab text-[10px] font-['Cinzel',serif] font-bold text-[var(--gold-hi)] hover:brightness-125 cursor-pointer"
              >
                {h.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="p-3 border-b border-[var(--iron)]/60 slab flex flex-col sm:flex-row gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Buscar nos pertences..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full recess border border-[var(--iron)] pl-8 pr-3 py-1.5 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold-lo)] transition-colors"
          />
        </div>

        <div
          role="tablist"
          aria-label="Filtros de categoria da mochila"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
        >
          {categories.map((c) => {
            const isActive = categoryFilter === c.id;
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => setCategoryFilter(c.id)}
                className={`slab relative px-3 py-1.5 text-[11px] font-['Cinzel',serif] uppercase tracking-[0.12em] whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[var(--gold-hi)] font-bold'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {isActive && (
                  <m.span
                    layoutId="inv-filter-diamond"
                    transition={spring.snap}
                    className="pointer-events-none absolute inset-0 border border-[var(--gold-lo)] shadow-[inset_0_0_12px_rgba(201,164,92,0.18)]"
                  >
                    <span className="absolute left-1/2 -top-[4px] -translate-x-1/2 w-1.5 h-1.5 bg-[var(--gold)] rotate-45 shadow-[0_0_6px_rgba(236,211,149,0.7)]" />
                  </m.span>
                )}
                <span className="relative z-10">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo Rolável: Silhueta de Equipamento + Grade 40 Slots */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {isLoading && occupiedCount === 0 ? (
          <div className="space-y-4" data-testid="inventory-skeleton">
            <Skeleton variant="stone" className="w-full h-24" />
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-['Cinzel',serif] font-bold text-[var(--gold-hi)] uppercase tracking-wider">
                Mochila de Viagem
              </span>
              <span className="text-[10px] text-[var(--muted)] font-['Cinzel',serif] tabular-nums">
                40 compartimentos
              </span>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 p-2">
              {Array.from({ length: 16 }).map((_, idx) => (
                <Skeleton
                  key={`skel-slot-${idx}`}
                  variant="stone"
                  className="aspect-square w-full min-h-[42px] max-h-[56px]"
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Topo: Silhueta de Equipamento */}
            <EquipSilhouette
              equippedMap={equippedMap}
              onSelectSlot={handleSelectEquipSlot}
            />

            {/* Separador e Título da Mochila */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-['Cinzel',serif] font-bold text-[var(--gold-hi)] uppercase tracking-wider">
                Mochila de Viagem
              </span>
              <span className="text-[10px] text-[var(--muted)] font-['Cinzel',serif] tabular-nums">
                40 compartimentos
              </span>
            </div>

            {/* Grade de 40 Slots com DND */}
            <BackpackGrid
              slots={slots}
              selectedItemId={selectedItem?.id || null}
              recentlyReceivedId={recentlyReceivedId}
              searchFilter={searchFilter}
              categoryFilter={categoryFilter}
              onSelectSlot={handleSelectSlot}
              onMoveSlot={handleMoveSlot}
            />
          </>
        )}
      </div>

      {/* Rodapé: Moedas e Peso */}
      <InventoryFooter
        coins={coins}
        occupiedCount={occupiedCount}
        totalWeight={totalWeight}
      />

      {/* Sheet de Detalhe do Item */}
      <ItemDetailSheet
        item={selectedItem}
        open={Boolean(selectedItem)}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
        onUseItem={handleUseItem}
        onEquipItem={handleEquip}
        onUnequipItem={handleUnequip}
        onOpenTransfer={(item) => setTransferItem(item)}
        onOpenDiscard={(item) => setDiscardItem(item)}
      />

      {/* Modal de Transferência */}
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

      {/* Modal de Descarte */}
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
