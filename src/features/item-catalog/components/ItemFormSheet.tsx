import {
  Archive,
  Check,
  Coins,
  Flame,
  Image as ImageIcon,
  RotateCcw,
  Save,
  Shield,
  Sparkles,
  Sword,
  Upload,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge, Button, CoinsBadge, Sheet } from '../../../shared/ui/index.ts';
import { archiveCatalogItem, saveCatalogItem, uploadItemImage } from '../api/index.ts';
import type { ItemCatalog } from '../api/types.ts';
import { ITEM_CATEGORIES, ITEM_EQUIP_SLOTS, ITEM_RARITIES } from '../data/constants.ts';
import { getItemRarityBadgeVariant, getItemRarityBorder } from './ItemCatalogCardGrid.tsx';

interface ItemFormSheetProps {
  item: ItemCatalog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (savedItem: ItemCatalog) => void;
  onArchived?: (itemId: string, archived: boolean) => void;
}

export const ItemFormSheet: React.FC<ItemFormSheetProps> = ({
  item,
  open,
  onOpenChange,
  onSaved,
  onArchived,
}) => {
  const isEditing = Boolean(item);

  // Form Fields State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Arma');
  const [subcategory, setSubcategory] = useState('');
  const [rarity, setRarity] = useState('Comum');
  const [equippableAs, setEquippableAs] = useState('');
  const [damageDice, setDamageDice] = useState('');
  const [armorBonus, setArmorBonus] = useState<number>(0);
  const [attackBonus, setAttackBonus] = useState<number>(0);
  const [damageBonus, setDamageBonus] = useState<number>(0);
  const [priceBronze, setPriceBronze] = useState<number>(50);
  const [durability, setDurability] = useState<number>(100);
  const [maxDurability, setMaxDurability] = useState<number>(100);
  const [wearType, setWearType] = useState('unlimited');
  const [plagueCost, setPlagueCost] = useState<number>(0);
  const [icon, setIcon] = useState('🗡️');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [special, setSpecial] = useState('');
  const [twoHanded, setTwoHanded] = useState(false);
  const [stackable, setStackable] = useState(false);
  const [archived, setArchived] = useState(false);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setCategory(item.category || 'Geral');
      setSubcategory(item.subcategory || '');
      setRarity(item.rarity || 'Comum');
      setEquippableAs(item.equippable_as || '');
      setDamageDice(item.damage_dice || '');
      setArmorBonus(item.armor_bonus || 0);
      setAttackBonus(item.attack_bonus || 0);
      setDamageBonus(item.damage_bonus || 0);
      setPriceBronze(item.price_bronze || 0);
      setDurability(item.durability ?? 100);
      setMaxDurability(item.max_durability ?? 100);
      setWearType(item.wear_type || 'unlimited');
      setPlagueCost(item.plague_cost || 0);
      setIcon(item.icon || '🗡️');
      setImageUrl(item.image_url || '');
      setDescription(item.description || '');
      setSpecial(item.special || '');
      setTwoHanded(Boolean(item.two_handed));
      setStackable(Boolean(item.stackable));
      setArchived(Boolean(item.archived));
    } else {
      setName('');
      setCategory('Arma');
      setSubcategory('');
      setRarity('Comum');
      setEquippableAs('arma_principal');
      setDamageDice('1d8');
      setArmorBonus(0);
      setAttackBonus(0);
      setDamageBonus(0);
      setPriceBronze(50);
      setDurability(100);
      setMaxDurability(100);
      setWearType('repairable');
      setPlagueCost(0);
      setIcon('🗡️');
      setImageUrl('');
      setDescription('');
      setSpecial('');
      setTwoHanded(false);
      setStackable(false);
      setArchived(false);
    }
  }, [item, open]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadItemImage(file);
      setImageUrl(url);
      toast.success('Imagem carregada com sucesso!');
    } catch (err: any) {
      toast.error(`Falha no upload da imagem: ${err.message || 'Erro'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome do artigo');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<ItemCatalog> = {
        id: item?.id,
        name: name.trim(),
        category,
        subcategory: subcategory.trim() || null,
        rarity,
        equippable_as: equippableAs || null,
        damage_dice: damageDice.trim() || null,
        armor_bonus: Number(armorBonus) || 0,
        attack_bonus: Number(attackBonus) || 0,
        damage_bonus: Number(damageBonus) || 0,
        price_bronze: Number(priceBronze) || 0,
        durability: Number(durability),
        max_durability: Number(maxDurability),
        wear_type: wearType,
        plague_cost: rarity === 'Maldito' ? Math.max(1, Number(plagueCost) || 1) : 0,
        icon: icon.trim() || '🗡️',
        image_url: imageUrl.trim() || null,
        description: description.trim() || null,
        special: special.trim() || null,
        two_handed: twoHanded,
        stackable,
        archived,
      };

      const saved = await saveCatalogItem(payload);
      toast.success(
        isEditing
          ? `Artigo "${saved.name}" atualizado!`
          : `Novo artigo "${saved.name}" forjado no catálogo!`,
      );
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Falha ao salvar artigo: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!item?.id) return;
    const targetState = !archived;
    try {
      await archiveCatalogItem(item.id, targetState);
      setArchived(targetState);
      toast.success(
        targetState ? 'Artigo arquivado com sucesso' : 'Artigo desarquivado',
      );
      onArchived?.(item.id, targetState);
    } catch (err: any) {
      toast.error(`Erro ao alterar arquivamento: ${err.message}`);
    }
  };

  const badgeVariant = getItemRarityBadgeVariant(rarity);
  const rarityBorderClass = getItemRarityBorder(rarity);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      title={
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg font-bold text-[#f5b65b]">
            {isEditing ? `Editar Artigo: ${name || 'Sem Nome'}` : 'Forjar Novo Artigo no Catálogo'}
          </span>
          <Badge variant={badgeVariant}>{rarity}</Badge>
        </div>
      }
      description={
        <span>
          {isEditing
            ? 'Modifique os atributos, custos e arte visual do artigo. Atualizações refletirão em tempo real.'
            : 'Preencha os parâmetros arcanos e marciais para cadastrar este item no catálogo geral de Aldrenor.'}
        </span>
      }
      className="w-full sm:max-w-4xl max-h-screen overflow-y-auto bg-[#121215] border-l border-white/10"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 pb-12">
        {/* LEFT COLUMN: FORM CONTROLS (7 COLS) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-4">
          {/* Identity: Name & Icon */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3 space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Nome do Artigo *
              </label>
              <input
                type="text"
                data-testid="item-form-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Lâmina de Obsidiana"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
              />
            </div>

            <div className="col-span-1 space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Ícone
              </label>
              <input
                type="text"
                data-testid="item-form-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
                className="w-full text-center rounded-xl border border-white/10 bg-black/40 px-2 py-2 text-base text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
              />
            </div>
          </div>

          {/* Category, Subcategory & Rarity */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Categoria
              </label>
              <select
                data-testid="item-form-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#18181d] px-2.5 py-2 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
              >
                {ITEM_CATEGORIES.filter((c) => c !== 'Todos').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Subcategoria
              </label>
              <input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="ex: Espada Curta"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Raridade
              </label>
              <select
                data-testid="item-form-rarity"
                value={rarity}
                onChange={(e) => setRarity(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#18181d] px-2.5 py-2 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
              >
                {ITEM_RARITIES.filter((r) => r !== 'Todas').map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Equip Slot & Two Handed */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Slot de Equipamento
              </label>
              <select
                value={equippableAs}
                onChange={(e) => setEquippableAs(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#18181d] px-2.5 py-2 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
              >
                <option value="">Nenhum (Item de Bolso)</option>
                {ITEM_EQUIP_SLOTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Preço em Bronze
              </label>
              <input
                type="number"
                data-testid="item-form-price"
                min={0}
                value={priceBronze}
                onChange={(e) => setPriceBronze(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
              />
            </div>
          </div>

          {/* Combat Stats: Damage Dice, Armor Bonus, Attack Bonus */}
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-white/10 bg-[#18181d] p-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1">
                <Sword className="h-3 w-3 text-red-400" /> Dado Dano
              </label>
              <input
                type="text"
                value={damageDice}
                onChange={(e) => setDamageDice(e.target.value)}
                placeholder="1d8+2"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1">
                <Shield className="h-3 w-3 text-blue-400" /> Bônus Defesa
              </label>
              <input
                type="number"
                value={armorBonus}
                onChange={(e) => setArmorBonus(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#f5b65b]" /> Bônus Ataque
              </label>
              <input
                type="number"
                value={attackBonus}
                onChange={(e) => setAttackBonus(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
              />
            </div>
          </div>

          {/* Durability & Wear Type */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Desgaste
              </label>
              <select
                value={wearType}
                onChange={(e) => setWearType(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#18181d] px-2.5 py-2 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
              >
                <option value="unlimited">Infinito / Sem perda</option>
                <option value="repairable">Reparável (com PV)</option>
                <option value="single_use">Uso Único (Consumível)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Durabilidade
              </label>
              <input
                type="number"
                min={0}
                value={durability}
                onChange={(e) => setDurability(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Máx Durabilidade
              </label>
              <input
                type="number"
                min={0}
                value={maxDurability}
                onChange={(e) => setMaxDurability(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
              />
            </div>
          </div>

          {/* Image URL & File Upload */}
          <div className="space-y-2 rounded-xl border border-white/10 bg-[#18181d] p-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center justify-between">
              <span>Imagem / Ilustração do Artigo</span>
              {isUploading && <span className="text-[#f5b65b] text-[11px] animate-pulse">Enviando ao Storage...</span>}
            </label>

            <div className="flex gap-2">
              <input
                type="url"
                data-testid="item-form-image-url"
                placeholder="https://... ou suba um arquivo"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
              />

              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 transition-colors">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Description & Special Traits */}
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Descrição & Narrativa (Lore)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva a história, forjamento ou lenda deste artigo..."
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none font-serif"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Efeitos Especiais & Habilidades
              </label>
              <textarea
                rows={2}
                value={special}
                onChange={(e) => setSpecial(e.target.value)}
                placeholder="ex: Em acerto crítico, causa 1d4 de sangramento por 2 rodadas..."
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none font-serif"
              />
            </div>
          </div>

          {/* Toggles: Two handed, Stackable, Maldito */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70">
              <input
                type="checkbox"
                checked={twoHanded}
                onChange={(e) => setTwoHanded(e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-[#f5b65b] focus:ring-0"
              />
              <span>Empunhadura de Duas Mãos</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70">
              <input
                type="checkbox"
                checked={stackable}
                onChange={(e) => setStackable(e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-[#f5b65b] focus:ring-0"
              />
              <span>Empilhável na Algibeira</span>
            </label>

            {rarity === 'Maldito' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400 font-bold">Custo de Peste:</span>
                <input
                  type="number"
                  min={1}
                  value={plagueCost}
                  onChange={(e) => setPlagueCost(Math.max(1, Number(e.target.value) || 1))}
                  className="w-14 rounded-lg border border-red-500/40 bg-black/50 px-2 py-1 text-center font-mono text-xs text-red-300 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleArchive}
                className={archived ? 'text-emerald-400 border-emerald-500/30' : 'text-red-400 border-red-500/30'}
              >
                {archived ? <RotateCcw className="h-4 w-4 mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
                <span>{archived ? 'Desarquivar' : 'Arquivar'}</span>
              </Button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                data-testid="item-form-submit-btn"
                variant="gold"
                disabled={isSaving || !name.trim()}
                className="flex items-center gap-1.5"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Salvando...' : isEditing ? 'Atualizar Artigo' : 'Forjar Artigo'}</span>
              </Button>
            </div>
          </div>
        </form>

        {/* RIGHT COLUMN: LIVE PREVIEW (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[#f5b65b]">
              Prévia ao Vivo do Jogador
            </h4>
            <span className="text-[10px] text-white/40">Visual em Tempo Real</span>
          </div>

          {/* 1. Live Backpack Slot Preview */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <p className="text-[11px] font-semibold text-white/50 mb-2">1. Como surge na Algibeira (Slot):</p>
            <div className="flex items-center gap-4">
              <div
                className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border bg-[#141417] shadow-lg ${rarityBorderClass}`}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={name || 'Item'}
                    className="h-10 w-10 object-contain rounded drop-shadow-sm"
                  />
                ) : (
                  <span className="text-2xl select-none leading-none">{icon || '🗡️'}</span>
                )}

                {/* Durability Mini Bar */}
                {wearType === 'repairable' && (
                  <div className="absolute bottom-1 left-2 right-2 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-emerald-400"
                      style={{
                        width: `${Math.min(100, Math.max(0, (durability / (maxDurability || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-serif font-bold text-sm text-[#ebe6d6] truncate">
                  {name || 'Nome do Artigo'}
                </p>
                <p className="text-xs text-white/40">{category} · {rarity}</p>
                <CoinsBadge coinsBronze={priceBronze} size="sm" className="mt-1" />
              </div>
            </div>
          </div>

          {/* 2. Live Item Detail Preview Sheet Card */}
          <div className="flex-1 rounded-2xl border border-white/10 bg-[#16161b] p-4 space-y-4 shadow-xl">
            <p className="text-[11px] font-semibold text-white/50">2. Como surge na Ficha de Detalhes:</p>

            <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#f5b65b]">
                  {name || 'Novo Artigo Forjado'}
                </h3>
                <p className="text-xs text-white/40 mt-0.5">
                  {category} {subcategory ? `· ${subcategory}` : ''}
                </p>
              </div>
              <Badge variant={badgeVariant}>{rarity}</Badge>
            </div>

            {/* 128px Art Frame */}
            <div className="flex h-32 w-full items-center justify-center rounded-xl border border-white/5 bg-[#0e0e11] overflow-hidden">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={name}
                  className="h-28 w-28 object-contain drop-shadow-md"
                />
              ) : (
                <span className="text-5xl">{icon || '🗡️'}</span>
              )}
            </div>

            {/* Combat Specs Matrix */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                <span className="text-[10px] uppercase text-white/40 block">Dano Marcial</span>
                <span className="font-mono font-bold text-red-300">
                  {damageDice || '—'}
                </span>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                <span className="text-[10px] uppercase text-white/40 block">Proteção / Defesa</span>
                <span className="font-mono font-bold text-blue-300">
                  {armorBonus ? `+${armorBonus} Def` : '—'}
                </span>
              </div>
            </div>

            {/* Special / Lore */}
            {special && (
              <div className="rounded-lg border border-[#f5b65b]/20 bg-[#f5b65b]/5 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#f5b65b] block mb-1">
                  Propriedades Especiais:
                </span>
                <p className="text-xs text-white/80 font-serif leading-relaxed">
                  {special}
                </p>
              </div>
            )}

            {description && (
              <p className="text-xs text-white/50 italic font-serif leading-relaxed">
                "{description}"
              </p>
            )}

            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-xs text-white/40 font-serif">Valor Estimado:</span>
              <CoinsBadge coinsBronze={priceBronze} size="md" />
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
};
