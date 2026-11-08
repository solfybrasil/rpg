import { Trash2 } from 'lucide-react';
import React from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import type { WorkshopStation } from '../../../entities/recipe';

interface WorkbenchGridProps {
  station: WorkshopStation;
  slots: Array<InventoryItemRecord | null>;
  onSlotClick: (index: number) => void;
  onDropOnSlot: (index: number, item: InventoryItemRecord) => void;
  onClearGrid: () => void;
  dragOverIndex: number | null;
  setDragOverIndex: (index: number | null) => void;
  isMatched: boolean;
}

const STATION_ACCENT_COLORS: Record<WorkshopStation, { border: string; glow: string; text: string }> = {
  forja: { border: 'border-[rgba(201,169,97,0.35)]', glow: 'shadow-[0_0_20px_rgba(201,169,97,0.2)]', text: 'text-[#ecc05c]' },
  alquimia: { border: 'border-purple-600/40', glow: 'shadow-[0_0_20px_rgba(192,132,252,0.2)]', text: 'text-purple-400' },
  cozinha: { border: 'border-emerald-600/40', glow: 'shadow-[0_0_20px_rgba(74,124,89,0.2)]', text: 'text-emerald-400' },
};

export const WorkbenchGrid: React.FC<WorkbenchGridProps> = ({
  station,
  slots,
  onSlotClick,
  onDropOnSlot,
  onClearGrid,
  dragOverIndex,
  setDragOverIndex,
  isMatched,
}) => {
  const accent = STATION_ACCENT_COLORS[station];
  const occupiedCount = slots.filter(Boolean).length;

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data?.item) {
        onDropOnSlot(index, data.item);
      }
    } catch (err) {
      console.warn('[WORKBENCH] Erro ao processar drop no slot:', err);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Barra de controle da grade */}
      <div className="w-full max-w-[280px] flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
          Grade 3×3 ({occupiedCount}/9)
        </span>
        {occupiedCount > 0 && (
          <button
            type="button"
            onClick={onClearGrid}
            className="flex items-center gap-1 text-[11px] font-mono text-red-400 hover:text-red-300 transition-colors px-1.5 py-0.5 rounded bg-red-950/40 border border-red-800/40"
            title="Limpar todos os itens da grade"
          >
            <Trash2 size={12} />
            <span>Limpar</span>
          </button>
        )}
      </div>

      {/* Grade 3x3 */}
      <div
        className={`relative grid grid-cols-3 gap-2.5 p-3.5 rounded-xl border ${accent.border} ${accent.glow} bg-[#14120e] shadow-[0_8px_32px_rgba(0,0,0,0.6)] transition-all duration-300`}
        style={{
          backgroundImage: `radial-gradient(ellipse at center, rgba(30, 24, 18, 0.5) 0%, rgba(14, 11, 8, 0.95) 100%)`,
        }}
      >
        {slots.map((item, idx) => {
          const isOver = dragOverIndex === idx;
          const bgSlot = isOver
            ? `/assets/${station}/slot_brilho.webp`
            : item
              ? `/assets/${station}/slot_cheio.webp`
              : `/assets/${station}/slot_vazio.webp`;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSlotClick(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => handleDrop(e, idx)}
              title={item ? `${item.name} (clique para retirar)` : 'Slot livre (clique ou arraste um ingrediente)'}
              className={`relative w-[72px] h-[72px] rounded-lg flex items-center justify-center p-1 transition-transform active:scale-95 select-none focus:outline-none focus:ring-1 focus:ring-[rgba(201,169,97,0.5)] bg-[#0d0c0a] border border-[rgba(201,169,97,0.18)] hover:border-[rgba(201,169,97,0.4)] ${
                isOver ? 'scale-105 z-10 border-[#c9a961]' : ''
              }`}
              style={{
                backgroundImage: `url(${bgSlot})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {item ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center p-1 animate-in fade-in zoom-in-95 duration-150">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-11 h-11 object-contain drop-shadow-md pointer-events-none"
                    />
                  ) : (
                    <span className="text-xl pointer-events-none">
                      {station === 'forja' ? '⚒️' : station === 'alquimia' ? '🧪' : '🍲'}
                    </span>
                  )}
                  <span className="text-[9px] font-mono leading-tight text-neutral-200 text-center line-clamp-1 w-full px-0.5 mt-0.5 bg-black/60 rounded">
                    {item.name}
                  </span>
                  {/* Badge de quantidade no slot (se > 1) */}
                  {(item.quantity || 1) > 1 && (
                    <span className="absolute top-0.5 right-0.5 bg-neutral-900/90 text-amber-300 font-mono text-[9px] px-1 rounded border border-amber-600/40">
                      ×{item.quantity}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[10px] font-mono text-neutral-600 select-none">
                  {idx + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Seta direcional luminosa para o produto */}
      <div className="flex items-center justify-center my-2 text-neutral-500 transition-all duration-300">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-all duration-300 ${
            isMatched
              ? `${accent.text} animate-bounce drop-shadow-[0_0_10px_currentColor]`
              : 'text-neutral-700 opacity-60'
          }`}
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};
