import {
  AlertTriangle,
  ArrowRightLeft,
  Heart,
  Package,
  Shield,
  Sword,
  Trash2,
  Utensils,
  Zap,
} from 'lucide-react';
import React from 'react';
import {
  type InventoryItemRecord,
  formatCoinsString,
  parseConsumableEffects,
} from '../../../entities/item';
import { GoldButton, Parchment, Sheet, StoneButton } from '../../../shared/ui';

export interface ItemDetailSheetProps {
  item: InventoryItemRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseItem?: (item: InventoryItemRecord) => void;
  onEquipItem?: (item: InventoryItemRecord) => void;
  onUnequipItem?: (item: InventoryItemRecord) => void;
  onOpenTransfer?: (item: InventoryItemRecord) => void;
  onOpenDiscard?: (item: InventoryItemRecord) => void;
}

export const ItemDetailSheet: React.FC<ItemDetailSheetProps> = ({
  item,
  open,
  onOpenChange,
  onUseItem,
  onEquipItem,
  onUnequipItem,
  onOpenTransfer,
  onOpenDiscard,
}) => {
  if (!item) return null;

  const itemName = item.name || (item.item_name as string) || 'Artefato';
  const effects = parseConsumableEffects(item);
  const isEquipped = Boolean(item.equip_slot);
  const isEquippable = Boolean(
    item.equippable_as ||
      item.damage_dice ||
      (item.armor_bonus && Number(item.armor_bonus) > 0) ||
      item.category?.toLowerCase().includes('arma') ||
      item.category?.toLowerCase().includes('armadura') ||
      item.category?.toLowerCase().includes('escudo') ||
      item.category?.toLowerCase().includes('anel') ||
      item.category?.toLowerCase().includes('amuleto'),
  );

  const isUsable =
    effects.isFood ||
    Boolean(effects.healsHp) ||
    effects.healsAllHp ||
    Boolean(effects.restoresFocus) ||
    effects.restoresAllFocus ||
    item.category?.toLowerCase().includes('alquimia') ||
    item.category?.toLowerCase().includes('consumível') ||
    item.category?.toLowerCase().includes('poção') ||
    item.wear_type === 'single_use';

  const actionVerb = effects.isFood
    ? 'Comer / Ingerir'
    : effects.healsHp || effects.restoresFocus
      ? 'Beber / Usar'
      : 'Ativar Item';

  const hasPrimaryUseAction = Boolean(isUsable && onUseItem);
  const costBronze = Number(item.price_bronze ?? item.base_cost_bronze ?? 0);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={itemName}
      description={`${item.category || 'Item'} • Peso: ${String(item.weight || 0)} kg`}
    >
      <div className="flex flex-col gap-4 py-2">
        {/* Parchment Card with Item Details */}
        <Parchment seed={33} unroll className="space-y-3">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--ink)]/20 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 border border-[var(--gold-lo)] bg-black/10 flex items-center justify-center shrink-0">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={itemName}
                    className="w-7 h-7 object-contain"
                  />
                ) : (
                  <Package className="w-5 h-5 text-[var(--ink)]" />
                )}
              </div>
              <div>
                <h3 className="font-['Cinzel',serif] text-base font-bold text-[var(--ink)] leading-tight">
                  {itemName}
                </h3>
                <span className="text-[11px] font-['EB_Garamond',serif] italic text-[var(--ink)]/80">
                  {item.rarity?.toUpperCase() || 'COMUM'} • {item.category || 'Geral'}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-['Cinzel',serif] text-[var(--ink)]/75 block">
                Valor:
              </span>
              <span className="text-xs font-['Cinzel',serif] font-bold text-[var(--ink)] tabular-nums">
                {formatCoinsString(costBronze)}
              </span>
            </div>
          </div>

          {/* Description & Lore */}
          <p className="text-xs text-[var(--ink)] font-['EB_Garamond',serif] italic leading-relaxed">
            {item.description || 'Nenhuma inscrição rúnica visível neste artefato.'}
          </p>

          {Boolean(item.special) && (
            <p className="text-xs text-[var(--ink)] font-['EB_Garamond',serif] leading-relaxed border-t border-[var(--ink)]/15 pt-2">
              <strong>Propriedade:</strong> {item.special}
            </p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--ink)]/20">
            {item.damage_dice && (
              <div className="flex items-center gap-2 p-2 border border-[var(--ink)]/20 bg-black/5">
                <Sword className="w-4 h-4 text-[var(--blood)] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-['Cinzel',serif] text-[var(--ink)]/75 font-bold">
                    Dano
                  </span>
                  <span className="text-xs font-['Cinzel',serif] tabular-nums font-bold text-[var(--ink)]">
                    {item.damage_dice}
                    {item.damage_bonus ? ` +${item.damage_bonus}` : ''}
                  </span>
                </div>
              </div>
            )}

            {Boolean(item.armor_bonus && Number(item.armor_bonus) > 0) && (
              <div className="flex items-center gap-2 p-2 border border-[var(--ink)]/20 bg-black/5">
                <Shield className="w-4 h-4 text-[var(--moss)] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-['Cinzel',serif] text-[var(--ink)]/75 font-bold">
                    Defesa
                  </span>
                  <span className="text-xs font-['Cinzel',serif] tabular-nums font-bold text-[var(--ink)]">
                    +{item.armor_bonus} Armadura
                  </span>
                </div>
              </div>
            )}

            {effects.isFood && effects.saciedade > 0 && (
              <div className="flex items-center gap-2 p-2 border border-[var(--ink)]/20 bg-black/5">
                <Utensils className="w-4 h-4 text-[var(--gold-lo)] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-['Cinzel',serif] text-[var(--ink)]/75 font-bold">
                    Nutrição
                  </span>
                  <span className="text-xs font-['Cinzel',serif] tabular-nums font-bold text-[var(--ink)]">
                    +{effects.saciedade} Fome
                  </span>
                </div>
              </div>
            )}

            {(effects.healsHp || effects.healsAllHp) && (
              <div className="flex items-center gap-2 p-2 border border-[var(--ink)]/20 bg-black/5">
                <Heart className="w-4 h-4 text-[var(--blood)] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-['Cinzel',serif] text-[var(--ink)]/75 font-bold">
                    Cura
                  </span>
                  <span className="text-xs font-['Cinzel',serif] tabular-nums font-bold text-[var(--ink)]">
                    {effects.healsAllHp ? 'Vida Total' : `+${effects.healsHp} Vida`}
                  </span>
                </div>
              </div>
            )}

            {(effects.restoresFocus || effects.restoresAllFocus) && (
              <div className="flex items-center gap-2 p-2 border border-[var(--ink)]/20 bg-black/5">
                <Zap className="w-4 h-4 text-[var(--mana)] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-['Cinzel',serif] text-[var(--ink)]/75 font-bold">
                    Foco
                  </span>
                  <span className="text-xs font-['Cinzel',serif] tabular-nums font-bold text-[var(--ink)]">
                    {effects.restoresAllFocus ? 'Foco Total' : `+${effects.restoresFocus} Foco`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {effects.givesPlague && (
            <div className="flex items-center gap-2 p-2.5 border border-[var(--blood)]/40 bg-[var(--blood)]/10 text-[var(--blood)] text-xs mt-2">
              <AlertTriangle className="w-4 h-4 text-[var(--blood)] shrink-0" />
              <span>
                <strong>Atenção:</strong> O consumo transfere <strong>+1 Peste</strong> ao corpo do
                herói.
              </span>
            </div>
          )}
        </Parchment>

        {/* Barra de Ações Rápidas (Máximo 1 GoldButton para ação principal + StoneButton para secundárias) */}
        <div className="border-t border-[var(--iron)] pt-4 flex flex-wrap gap-2.5 items-center justify-between">
          <div className="flex gap-2">
            {onOpenTransfer && (
              <StoneButton
                title="Enviar"
                icon={<ArrowRightLeft className="w-3.5 h-3.5 text-[var(--gold)]" />}
                onClick={() => onOpenTransfer(item)}
                className="w-auto px-3 py-1.5"
              />
            )}

            {onOpenDiscard && (
              <StoneButton
                title="Descartar"
                icon={<Trash2 className="w-3.5 h-3.5 text-[var(--blood)]" />}
                onClick={() => onOpenDiscard(item)}
                className="w-auto px-3 py-1.5 border-[var(--blood)]/60"
              />
            )}
          </div>

          <div className="flex gap-2">
            {hasPrimaryUseAction && onUseItem && (
              <GoldButton
                onClick={() => onUseItem(item)}
                className="w-auto px-4 py-1.5 text-xs font-['Cinzel',serif] font-bold uppercase tracking-wider"
              >
                {actionVerb}
              </GoldButton>
            )}

            {isEquippable && (
              <>
                {isEquipped ? (
                  onUnequipItem &&
                  (hasPrimaryUseAction ? (
                    <StoneButton
                      title="Desequipar"
                      onClick={() => onUnequipItem(item)}
                      className="w-auto px-3 py-1.5"
                    />
                  ) : (
                    <GoldButton
                      onClick={() => onUnequipItem(item)}
                      className="w-auto px-4 py-1.5 text-xs font-['Cinzel',serif] font-bold uppercase tracking-wider"
                    >
                      Desequipar
                    </GoldButton>
                  ))
                ) : (
                  onEquipItem &&
                  (hasPrimaryUseAction ? (
                    <StoneButton
                      title="Equipar"
                      onClick={() => onEquipItem(item)}
                      className="w-auto px-3 py-1.5"
                    />
                  ) : (
                    <GoldButton
                      onClick={() => onEquipItem(item)}
                      className="w-auto px-4 py-1.5 text-xs font-['Cinzel',serif] font-bold uppercase tracking-wider"
                    >
                      Equipar
                    </GoldButton>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
};
