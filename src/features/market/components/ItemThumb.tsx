import { memo, useState } from 'react';
import { renderItemFallbackIcon } from '../../inventory/components/BackpackSlot';

export const RARITY_BORDER: Record<string, string> = {
  comum: '#3D3833',
  incomum: 'var(--moss)',
  raro: '#2F5D8F',
  'épico': '#5D4589',
  epico: '#5D4589',
  'lendário': 'var(--gold)',
  lendario: 'var(--gold)',
  artefato: 'var(--gold-hi)',
  maldito: 'var(--blood)',
};

export function rarityColor(r: string | null | undefined) {
  return RARITY_BORDER[String(r ?? 'comum').toLowerCase()] ?? RARITY_BORDER.comum;
}

/** Imagem do item (carrega só quando aparece na tela) ou ícone de traço (nunca emoji). */
export const ItemThumb = memo(function ItemThumb({
  item,
  size = 'md',
}: {
  item: { name: string; image_url?: string | null; icon?: string | null; category?: string | null; rarity?: string | null };
  size?: 'md' | 'lg';
}) {
  const [broken, setBroken] = useState(false);
  const url = item.image_url && !broken ? item.image_url : null;
  return (
    <div
      className="relative w-full aspect-square overflow-hidden bg-[var(--abyss)] flex items-center justify-center"
      style={{ boxShadow: `inset 0 0 0 1px ${rarityColor(item.rarity)}` }}
    >
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          width={size === 'lg' ? 320 : 160}
          height={size === 'lg' ? 320 : 160}
          onError={() => setBroken(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className={size === 'lg' ? 'scale-[2.2]' : 'scale-125'}>
          {renderItemFallbackIcon({ name: item.name, category: item.category ?? '' } as never)}
        </span>
      )}
    </div>
  );
});
