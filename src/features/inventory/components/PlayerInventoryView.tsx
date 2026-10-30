import {
  Filter,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';
import type { EquipSlotKey, InventoryItemRecord } from '../../../entities/item';
import { useSessionStore } from '../../../shared/stores/session';
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
    { id: 'alquimia', label: 'Alquimia' },
    { id: 'comida', label: 'Comida' },
    { id: 'reliquias', label: 'Relíquias' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#08080a] text-[#f5f5f7] overflow-hidden">
      {/* Banner de seleção de herói rápido se não houver herói na sessão */}
      {!sessionHeroId && (
        <div className="bg-[#f5b65b]/10 border-b border-[#f5b65b]/20 px-4 py-2 flex items-center justify-between text-xs text-[#ffd59a]">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            <span>Visualizando inventário de teste: <strong>{hero?.name || heroId}</strong></span>
          </div>
          <div className="flex gap-1">
            {heroes.slice(0, 3).map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => selectHero(h.id)}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-serif font-bold text-white"
              >
                {h.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="p-3 border-b border-white/[0.06] bg-[#0c0c0e]/60 flex flex-col sm:flex-row gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Buscar nos pertences..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#f5b65b]/60 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-serif font-medium whitespace-nowrap transition-all ${
                categoryFilter === c.id
                  ? 'bg-[#f5b65b]/20 text-[#ffd59a] border border-[#f5b65b]/40 font-bold'
                  : 'bg-white/[0.02] text-white/60 hover:text-white border border-transparent'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo Rolável: Silhueta de Equipamento + Grade 40 Slots */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Topo: Silhueta de Equipamento */}
        <EquipSilhouette
          equippedMap={equippedMap}
          onSelectSlot={handleSelectEquipSlot}
        />

        {/* Separador e Título da Mochila */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-serif font-bold text-[#f5b65b] uppercase tracking-wider">
            Mochila de Viagem
          </span>
          <span className="text-[10px] text-white/40 font-mono">
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
