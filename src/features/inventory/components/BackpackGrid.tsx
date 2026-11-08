import React from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import { BackpackSlot } from './BackpackSlot';

export interface BackpackGridProps {
  slots: Array<InventoryItemRecord | null>;
  selectedItemId: string | null;
  recentlyReceivedId: string | null;
  searchFilter?: string;
  categoryFilter?: string;
  onSelectSlot: (item: InventoryItemRecord) => void;
}

export const BackpackGrid: React.FC<BackpackGridProps> = ({
  slots,
  selectedItemId,
  recentlyReceivedId,
  searchFilter = '',
  categoryFilter = 'todos',
  onSelectSlot,
}) => {
  const query = searchFilter.trim().toLowerCase();
  const isFilterActive = Boolean(query || (categoryFilter && categoryFilter !== 'todos'));

  const checkItemMatches = (item: InventoryItemRecord | null) => {
    if (!item) return false;
    const cat = (item.category || item.type || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();

    const matchesSearch =
      !query ||
      name.includes(query) ||
      cat.includes(query) ||
      desc.includes(query);

    if (!matchesSearch) return false;

    if (categoryFilter === 'todos') return true;
    if (categoryFilter === 'armas') {
      if (cat.includes('armadura')) return false; // "armadura" contém "arma"
      return (
        cat.includes('arma') ||
        cat.includes('lâmina') ||
        cat.includes('lamina') ||
        cat.includes('espada') ||
        cat.includes('machado') ||
        cat.includes('arco') ||
        name.includes('espada') ||
        name.includes('machado') ||
        name.includes('adaga')
      );
    }
    if (categoryFilter === 'armaduras') {
      return (
        cat.includes('armadura') ||
        cat.includes('escudo') ||
        cat.includes('proteção') ||
        cat.includes('protecao') ||
        name.includes('armadura') ||
        name.includes('escudo')
      );
    }
    if (categoryFilter === 'alquimia' || categoryFilter === 'consumiveis') {
      return (
        cat.includes('alquimia') ||
        cat.includes('poção') ||
        cat.includes('pocao') ||
        cat.includes('elixir') ||
        cat.includes('consumível') ||
        cat.includes('consumivel') ||
        name.includes('poção')
      );
    }
    if (categoryFilter === 'comida') {
      return (
        cat.includes('comida') ||
        cat.includes('prato') ||
        name.includes('ração') ||
        name.includes('pão') ||
        name.includes('assado')
      );
    }
    if (categoryFilter === 'reliquias' || categoryFilter === 'valiosos') {
      return (
        cat.includes('relíquia') ||
        cat.includes('reliquia') ||
        cat.includes('amuleto') ||
        cat.includes('anel') ||
        name.includes('anel') ||
        name.includes('amuleto')
      );
    }
    return true;
  };

  return (
    <div className="modern-slots-grid-wrapper">
      <div className="modern-slots-grid">
        {slots.map((item, index) => {
          const isSelected = Boolean(item && selectedItemId === item.id);
          const isRecentlyReceived = Boolean(item && recentlyReceivedId === item.id);
          const matches = checkItemMatches(item);
          const isDimmed = isFilterActive && (!item || !matches);
          const isHighlighted = isFilterActive && Boolean(item && matches);

          return (
            <BackpackSlot
              key={item?.id ? `slot-${index}-${item.id}` : `empty-${index}`}
              slotIndex={index}
              item={item}
              isSelected={isSelected}
              isRecentlyReceived={isRecentlyReceived}
              isDimmed={isDimmed}
              isHighlighted={isHighlighted}
              onSelect={onSelectSlot}
            />
          );
        })}
      </div>
    </div>
  );
};
