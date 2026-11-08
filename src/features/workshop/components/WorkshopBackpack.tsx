import { Package, Search } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import type { WorkshopStation } from '../../../entities/recipe';

interface WorkshopBackpackProps {
  station: WorkshopStation;
  items: InventoryItemRecord[];
  reservedCounts: Map<string, number>;
  onSelectItem: (item: InventoryItemRecord) => void;
  selectedItemId?: string | null;
}

export const WorkshopBackpack: React.FC<WorkshopBackpackProps> = ({
  station,
  items,
  reservedCounts,
  onSelectItem,
  selectedItemId,
}) => {
  const [search, setSearch] = useState('');

  // Itens disponíveis na mochila (não equipados)
  const availableItems = useMemo(() => {
    return items.filter((it) => {
      if (it.equip_slot) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (it.name || '').toLowerCase().includes(q) ||
        (it.description || '').toLowerCase().includes(q) ||
        (it.category || '').toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  const handleDragStart = (e: React.DragEvent, item: InventoryItemRecord) => {
    const payload = JSON.stringify({ item });
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex flex-col h-full bg-[#14120e] rounded-xl border border-[rgba(201,169,97,0.22)] p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      {/* Cabeçalho da Mochila */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[rgba(201,169,97,0.18)]">
        <div className="flex items-center gap-1.5 text-[#f5ede0]">
          <Package size={15} className="text-[#c9a961]" />
          <span className="text-xs font-['Cinzel',serif] font-bold tracking-wide">
            Mochila ({availableItems.length} materiais)
          </span>
        </div>
        <div className="relative w-36">
          <Search size={12} className="absolute left-2.5 top-2 text-[#8c8272]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-[#0d0c0a] border border-[rgba(201,169,97,0.2)] rounded-md pl-6 pr-2 py-0.5 text-xs font-mono text-[#f5ede0] placeholder:text-[#8c8272] focus:outline-none focus:border-[#c9a961]"
          />
        </div>
      </div>

      {/* Lista de Itens com Scroll */}
      <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 pr-1 max-h-[380px] custom-scrollbar">
        {availableItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-neutral-500 text-xs font-mono text-center">
            <span>Nenhum ingrediente encontrado</span>
            <span className="text-[10px] text-neutral-600 mt-1">
              Colete matérias-primas pelo mundo ou no mercado
            </span>
          </div>
        ) : (
          availableItems.map((item) => {
            const rawQty = Number(item.quantity || 1);
            const reserved = reservedCounts.get(item.id) || 0;
            const remaining = Math.max(0, rawQty - reserved);
            const isExhausted = remaining === 0;
            const isSelected = selectedItemId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                draggable={!isExhausted}
                onDragStart={(e) => handleDragStart(e, item)}
                onClick={() => !isExhausted && onSelectItem(item)}
                disabled={isExhausted}
                className={`w-full flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all select-none ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500/80 shadow-[0_0_8px_rgba(245,182,91,0.2)]'
                    : isExhausted
                      ? 'bg-neutral-950/40 border-neutral-900 opacity-40 cursor-not-allowed'
                      : 'bg-neutral-950/60 border-neutral-800/80 hover:bg-neutral-800/50 hover:border-neutral-700 cursor-pointer active:scale-[0.98]'
                }`}
              >
                {/* Miniatura do Item */}
                <div className="w-9 h-9 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-sm">📦</span>
                  )}
                </div>

                {/* Detalhes do Item */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-mono font-medium text-neutral-200 truncate">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[10px] flex-shrink-0">
                      <span className="text-amber-400 font-bold">{remaining}</span>
                      {reserved > 0 && (
                        <span className="text-neutral-500 text-[9px]">(-{reserved})</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
                    <span className="truncate">{item.category || 'Material'}</span>
                    {item.rarity && (
                      <span className="text-neutral-400">· {item.rarity}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
