import {
  AlertTriangle,
  ArrowRightLeft,
  Flame,
  Heart,
  Package,
  Shield,
  Sparkles,
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
import { Badge, type BadgeVariant, Button, Sheet } from '../../../shared/ui';

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

  const effects = parseConsumableEffects(item);
  const rarity = (item.rarity || 'comum').toLowerCase() as BadgeVariant;
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
    ? 'Comer'
    : item.category?.toLowerCase().includes('poção')
    ? 'Beber'
    : item.category?.toLowerCase().includes('pergaminho')
    ? 'Ler'
    : 'Usar';

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      title={
        <div className="flex items-center gap-3">
          <span className="font-serif font-bold text-lg sm:text-xl text-[#f5b65b] tracking-wide">
            {item.name}
          </span>
          <Badge variant={rarity}>{item.rarity || 'Comum'}</Badge>
        </div>
      }
      description={
        <span>
          {item.category || 'Item'} · {Number(item.quantity || 1)}x unidade(s)
          {isEquipped ? ` · Equipado em ${item.equip_slot}` : ''}
        </span>
      }
    >
      <div className="space-y-6 pt-2 pb-6">
        {/* Imagem / Ícone Grande e Estatísticas Rápidas */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
          <div className="w-24 h-24 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <span className="text-4xl">{item.icon || '📦'}</span>
            )}
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <p className="font-serif italic text-sm text-white/80 leading-relaxed">
              {item.description || 'Nenhuma descrição gravada para este objeto.'}
            </p>

            {item.price_bronze !== undefined && item.price_bronze !== null && (
              <div className="text-xs text-[#f5b65b] font-mono">
                Valor estimado: {formatCoinsString(item.price_bronze)}
              </div>
            )}
          </div>
        </div>

        {/* Lista de Efeitos e Atributos */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-serif font-bold text-white/50 uppercase tracking-widest">
            Propriedades e Efeitos
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {item.damage_dice && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Sword className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/50">Dano</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {item.damage_dice}
                    {item.damage_bonus ? ` +${item.damage_bonus}` : ''}
                  </span>
                </div>
              </div>
            )}

            {Boolean(item.armor_bonus && Number(item.armor_bonus) > 0) && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/50">Defesa</span>
                  <span className="text-xs font-mono font-bold text-white">
                    +{item.armor_bonus} Armadura
                  </span>
                </div>
              </div>
            )}

            {effects.isFood && effects.saciedade > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Utensils className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/50">Nutrição</span>
                  <span className="text-xs font-mono font-bold text-white">
                    +{effects.saciedade} Saciedade
                  </span>
                </div>
              </div>
            )}

            {(effects.healsHp || effects.healsAllHp) && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Heart className="w-4 h-4 text-rose-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/50">Cura</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {effects.healsAllHp ? 'Vida Máxima' : `+${effects.healsHp} Vida`}
                  </span>
                </div>
              </div>
            )}

            {(effects.restoresFocus || effects.restoresAllFocus) && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Zap className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/50">Foco</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {effects.restoresAllFocus ? 'Foco Total' : `+${effects.restoresFocus} Foco`}
                  </span>
                </div>
              </div>
            )}

            {item.wear_type === 'durability' && item.max_durability && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/50">Cargas</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {item.durability ?? item.max_durability} / {item.max_durability}
                  </span>
                </div>
              </div>
            )}
          </div>

          {effects.givesPlague && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mt-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Atenção:</strong> O consumo deste item transfere <strong>+1 de Peste</strong> ao corpo do herói.
              </span>
            </div>
          )}
        </div>

        {/* Barra de Ações Rápidas */}
        <div className="border-t border-white/10 pt-4 flex flex-wrap gap-2.5 items-center justify-between">
          <div className="flex gap-2">
            {/* Botão de Enviar */}
            <Button
              variant="secondary"
              size="md"
              leftIcon={<ArrowRightLeft className="w-4 h-4" />}
              onClick={() => onOpenTransfer?.(item)}
            >
              Enviar
            </Button>

            {/* Botão de Descartar */}
            <Button
              variant="danger"
              size="md"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => onOpenDiscard?.(item)}
            >
              Descartar
            </Button>
          </div>

          <div className="flex gap-2">
            {/* Desequipar se equipado */}
            {isEquipped && onUnequipItem && (
              <Button
                variant="outline"
                size="md"
                onClick={() => onUnequipItem(item)}
              >
                Desequipar
              </Button>
            )}

            {/* Equipar se puder ser equipado e não estiver equipado */}
            {!isEquipped && isEquippable && onEquipItem && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Shield className="w-4 h-4" />}
                onClick={() => onEquipItem(item)}
              >
                Equipar
              </Button>
            )}

            {/* Usar se for consumível */}
            {isUsable && onUseItem && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Sparkles className="w-4 h-4" />}
                onClick={() => onUseItem(item)}
              >
                {actionVerb}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
};
