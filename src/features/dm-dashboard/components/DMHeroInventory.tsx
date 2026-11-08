import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Package, Save, Search, Trash2, Undo2, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { type InventoryItemRecord, allocateInventoryGrid40, calcTotalInventoryWeight } from '../../../entities/item';
import { useInventory } from '../../../shared/hooks/baseHooks';
import { queryKeys } from '../../../shared/supabase';
import { ITEM_CATEGORIES, ITEM_RARITIES } from '../../item-catalog/data/constants';
import {
  deleteInventoryItemInDB,
  moveSlotInDB,
  unequipItemInDB,
  updateInventoryItemInDB,
} from '../../inventory/api/inventoryService';
import { BackpackGrid } from '../../inventory/components/BackpackGrid';
import { SlotItem } from '../../inventory/components/BackpackSlot';
import '../../../styles/features/PlayerInventory.css';

const EQUIP_LABELS: Record<string, string> = {
  head: 'Cabeça',
  amulet: 'Amuleto',
  chest: 'Armadura',
  hands: 'Mãos',
  main_hand: 'Arma',
  off_hand: 'Secundária',
  ring_1: 'Anel I',
  ring_2: 'Anel II',
};

/** Campos que o Mestre pode editar direto no item. */
type ItemDraft = {
  name: string;
  category: string;
  rarity: string;
  quantity: number;
  description: string;
  image_url: string;
  icon: string;
  damage_dice: string;
  attack_bonus: number;
  damage_bonus: number;
  armor_bonus: number;
  durability: number | null;
  max_durability: number | null;
  wear_type: string;
  special: string;
  price_bronze: number;
  saciedade: number;
  plague_cost: number;
};

function toDraft(i: InventoryItemRecord): ItemDraft {
  return {
    name: i.name ?? '',
    category: i.category ?? '',
    rarity: i.rarity ?? 'Comum',
    quantity: Number(i.quantity ?? 1),
    description: i.description ?? '',
    image_url: i.image_url ?? '',
    icon: i.icon ?? '',
    damage_dice: i.damage_dice ?? '',
    attack_bonus: Number(i.attack_bonus ?? 0),
    damage_bonus: Number(i.damage_bonus ?? 0),
    armor_bonus: Number(i.armor_bonus ?? 0),
    durability: i.durability ?? null,
    max_durability: i.max_durability ?? null,
    wear_type: i.wear_type ?? 'unlimited',
    special: i.special ?? '',
    price_bronze: Number(i.price_bronze ?? 0),
    saciedade: Number(i.saciedade ?? 0),
    plague_cost: Number(i.plague_cost ?? 0),
  };
}

/** Só o que mudou, com campos de texto vazios virando null. */
function diff(item: InventoryItemRecord, d: ItemDraft): Partial<InventoryItemRecord> {
  const base = toDraft(item);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(d) as Array<keyof ItemDraft>) {
    if (d[k] === base[k]) continue;
    const v = d[k];
    out[k] = typeof v === 'string' && v.trim() === '' && k !== 'name' ? null : typeof v === 'string' ? v.trim() : v;
  }
  return out as Partial<InventoryItemRecord>;
}

const field = 'w-full h-8 px-2 text-sm rounded-none border border-[var(--iron)] bg-[var(--abyss)] text-[var(--text)] focus:border-[var(--gold)] outline-none';
const label = "font-['Cinzel',serif] text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]";

export function DMHeroInventory({ heroId, heroName }: { heroId: string; heroName: string }) {
  const qc = useQueryClient();
  const qk = queryKeys.inventory.byHero(heroId);
  const { items: rawItems = [], isLoading } = useInventory(heroId);
  const items = rawItems as unknown as InventoryItemRecord[];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dragItem, setDragItem] = useState<InventoryItemRecord | null>(null);

  const { slots, equipped, overflow } = useMemo(() => {
    const backpack = items.filter((i) => !i.equip_slot || !(i.equip_slot in EQUIP_LABELS));
    const { grid, overflow } = allocateInventoryGrid40(backpack);
    const eq = items.filter((i) => i.equip_slot && i.equip_slot in EQUIP_LABELS);
    return { slots: grid, equipped: eq, overflow };
  }, [items]);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  // Em telas estreitas o editor fica abaixo da grade: leva a tela até ele.
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selectedId && window.innerWidth < 1280) {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedId]);
  const weight = useMemo(() => calcTotalInventoryWeight(items), [items]);
  const occupied = slots.filter(Boolean).length;

  const patchCache = (fn: (list: InventoryItemRecord[]) => InventoryItemRecord[]) =>
    qc.setQueryData<InventoryItemRecord[]>(qk, (old) => fn(old ?? []));

  // ── Arrastar entre compartimentos ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const onDragStart = (e: DragStartEvent) => setDragItem((e.active.data.current?.item as InventoryItemRecord) ?? null);

  const onDragEnd = async (e: DragEndEvent) => {
    setDragItem(null);
    const from = e.active.data.current?.slotIndex as number | undefined;
    const to = e.over?.data.current?.slotIndex as number | undefined;
    if (from == null || to == null || from === to) return;
    const moving = slots[from];
    if (!moving) return;
    const target = slots[to];
    const previous = qc.getQueryData<InventoryItemRecord[]>(qk);
    patchCache((list) =>
      list.map((i) => {
        if (i.id === moving.id) return { ...i, slot_index: to };
        if (target && i.id === target.id) return { ...i, slot_index: from };
        return i;
      }),
    );
    try {
      await moveSlotInDB(moving.id, to, heroId);
      if (target) await moveSlotInDB(target.id, from, heroId);
    } catch (err) {
      if (previous) qc.setQueryData(qk, previous);
      toast.error(`Não foi possível mover: ${err instanceof Error ? err.message : 'erro'}`);
    }
  };

  // ── Ações do editor ──
  const save = async (item: InventoryItemRecord, patch: Partial<InventoryItemRecord>) => {
    if (Object.keys(patch).length === 0) return;
    const previous = qc.getQueryData<InventoryItemRecord[]>(qk);
    patchCache((list) => list.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
    try {
      await updateInventoryItemInDB(item.id, patch as never);
      toast.success(`"${patch.name ?? item.name}" atualizado na mochila de ${heroName}.`);
    } catch (err) {
      if (previous) qc.setQueryData(qk, previous);
      toast.error(`Falha ao salvar item: ${err instanceof Error ? err.message : 'erro'}`);
    }
  };

  const remove = async (item: InventoryItemRecord) => {
    if (!window.confirm(`Remover "${item.name}" da mochila de ${heroName}?`)) return;
    const previous = qc.getQueryData<InventoryItemRecord[]>(qk);
    patchCache((list) => list.filter((i) => i.id !== item.id));
    setSelectedId(null);
    try {
      await deleteInventoryItemInDB(item.id);
      toast.success('Item removido.');
    } catch (err) {
      if (previous) qc.setQueryData(qk, previous);
      toast.error(`Falha ao remover: ${err instanceof Error ? err.message : 'erro'}`);
    }
  };

  const unequip = async (item: InventoryItemRecord) => {
    const free = slots.findIndex((s) => s === null);
    patchCache((list) => list.map((i) => (i.id === item.id ? { ...i, equip_slot: null, slot_index: free } : i)));
    try {
      await unequipItemInDB(item.id, free);
    } catch (err) {
      toast.error(`Falha ao desequipar: ${err instanceof Error ? err.message : 'erro'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--muted)]">
        <Loader2 className="w-4 h-4 animate-spin" /> Abrindo a mochila…
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row gap-4">
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {/* Resumo + busca */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <p className="text-sm text-[var(--muted)]">
            <span className="tabular-nums text-[var(--text)]">{occupied}</span>/40 compartimentos ·{' '}
            <span className="tabular-nums text-[var(--text)]">{weight}</span> de carga
          </p>
          <label className="relative">
            <Search className="absolute left-2 top-2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar na mochila…"
              className={`${field} pl-7 w-52`}
            />
          </label>
        </div>

        {/* Equipados */}
        {equipped.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className={label}>Equipado</span>
            <div className="flex flex-wrap gap-2">
              {equipped.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setSelectedId(it.id)}
                  className={`w-16 flex flex-col items-center gap-1 cursor-pointer ${selectedId === it.id ? 'text-[var(--gold-hi)]' : 'text-[var(--muted)]'}`}
                  title={it.name}
                >
                  <span className={`modern-slot occupied ${selectedId === it.id ? 'selected' : ''} rarity-${(it.rarity || 'comum').toLowerCase()}`}>
                    <SlotItem item={it} />
                  </span>
                  <span className="text-[10px] truncate w-full text-center">{EQUIP_LABELS[it.equip_slot as string]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Grade igual à do jogador */}
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragItem(null)}>
          <BackpackGrid
            slots={slots}
            selectedItemId={selectedId}
            recentlyReceivedId={null}
            searchFilter={search}
            onSelectSlot={(it) => setSelectedId(it.id)}
          />
          <DragOverlay dropAnimation={null}>
            {dragItem ? (
              <div className="w-14 h-14 scale-105 shadow-[0_10px_24px_rgba(0,0,0,0.6)]">
                <div className="modern-slot occupied selected">
                  <SlotItem item={dragItem} />
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {overflow.length > 0 && (
          <p className="text-xs text-[var(--ember)]">
            {overflow.length} item(ns) não cabem nos 40 compartimentos: {overflow.map((o) => o.name).join(', ')}.
          </p>
        )}
        {items.length === 0 ? (
          <p className="text-sm italic text-[var(--muted)]">Mochila vazia. Use "Dar item" no card do herói.</p>
        ) : (
          <p className="text-xs italic text-[var(--muted)]">Clique num item para editar · arraste para mudar de lugar.</p>
        )}
      </div>

      {/* Editor */}
      <div ref={editorRef} className="xl:w-80 shrink-0 scroll-mt-4">
        {selected ? (
          <ItemEditor
            key={selected.id}
            item={selected}
            onSave={(patch) => save(selected, patch)}
            onRemove={() => remove(selected)}
            onUnequip={selected.equip_slot ? () => unequip(selected) : undefined}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="h-full min-h-40 flex flex-col items-center justify-center gap-2 p-6 border border-dashed border-[var(--iron)] text-center">
            <Package className="w-6 h-6 text-[var(--iron)]" />
            <p className="text-sm text-[var(--muted)]">Selecione um item para editar.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ItemEditor({
  item,
  onSave,
  onRemove,
  onUnequip,
  onClose,
}: {
  item: InventoryItemRecord;
  onSave: (patch: Partial<InventoryItemRecord>) => void;
  onRemove: () => void;
  onUnequip?: () => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<ItemDraft>(() => toDraft(item));
  // Se o item mudar por fora (jogador usou, tempo real), recarrega o formulário
  // desde que o Mestre não esteja no meio de uma edição.
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setD(toDraft(item));
  }, [item, dirty]);

  const set = <K extends keyof ItemDraft>(k: K, v: ItemDraft[K]) => {
    setD((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  };
  const changes = diff(item, d);
  const hasChanges = Object.keys(changes).length > 0;
  const num = (k: keyof ItemDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, (e.target.value === '' ? 0 : Number(e.target.value)) as never);

  const submit = () => {
    if (!d.name.trim()) return toast.error('O item precisa de um nome.');
    onSave(changes);
    setDirty(false);
  };

  const categories = [...new Set([...ITEM_CATEGORIES.filter((c) => c !== 'Todos'), d.category].filter(Boolean))];
  const rarities = [...new Set([...ITEM_RARITIES.filter((r) => r !== 'Todas'), d.rarity].filter(Boolean))];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          submit();
        }
      }}
      className="flex flex-col gap-3 p-3 border border-[var(--gold-lo)] bg-[var(--stone)]"
      data-testid="dm-item-editor"
    >
      <div className="flex items-start gap-2">
        <span className="w-12 h-12 shrink-0">
          <span className={`modern-slot occupied rarity-${(d.rarity || 'comum').toLowerCase()}`}>
            <SlotItem item={{ ...item, ...d, image_url: d.image_url || null, icon: d.icon || null }} />
          </span>
        </span>
        <div className="flex-1 min-w-0">
          <input
            value={d.name}
            onChange={(e) => set('name', e.target.value)}
            className={`${field} font-['Cinzel',serif] text-[var(--gold-hi)]`}
            aria-label="Nome do item"
          />
          {item.equip_slot && (
            <p className="text-[11px] text-[var(--muted)] mt-0.5">Equipado: {EQUIP_LABELS[item.equip_slot] ?? item.equip_slot}</p>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar editor" className="w-7 h-7 flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <L t="Categoria">
          <select value={d.category} onChange={(e) => set('category', e.target.value)} className={field}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </L>
        <L t="Raridade">
          <select value={d.rarity} onChange={(e) => set('rarity', e.target.value)} className={field}>
            {rarities.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </L>
        <L t="Quantidade">
          <div className="flex">
            <button type="button" className="w-8 h-8 border border-[var(--iron)] cursor-pointer" onClick={() => set('quantity', Math.max(1, d.quantity - 1))}>−</button>
            <input type="number" min={1} value={d.quantity} onChange={num('quantity')} className={`${field} text-center -mx-px`} />
            <button type="button" className="w-8 h-8 border border-[var(--iron)] cursor-pointer" onClick={() => set('quantity', d.quantity + 1)}>+</button>
          </div>
        </L>
        <L t="Preço (bronze)">
          <input type="number" min={0} value={d.price_bronze} onChange={num('price_bronze')} className={field} />
        </L>
      </div>

      <L t="Descrição">
        <textarea
          value={d.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
          className="w-full px-2 py-1.5 text-sm rounded-none border border-[var(--iron)] bg-[var(--abyss)] text-[var(--text)] focus:border-[var(--gold)] outline-none resize-y"
        />
      </L>

      <details className="group" open={Boolean(d.damage_dice || d.armor_bonus || d.attack_bonus || d.damage_bonus)}>
        <summary className={`${label} cursor-pointer select-none py-1`}>Combate</summary>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <L t="Dano (dados)">
            <input value={d.damage_dice} onChange={(e) => set('damage_dice', e.target.value)} placeholder="1d6" className={field} />
          </L>
          <L t="Bônus de ataque">
            <input type="number" value={d.attack_bonus} onChange={num('attack_bonus')} className={field} />
          </L>
          <L t="Bônus de dano">
            <input type="number" value={d.damage_bonus} onChange={num('damage_bonus')} className={field} />
          </L>
          <L t="Bônus de defesa">
            <input type="number" value={d.armor_bonus} onChange={num('armor_bonus')} className={field} />
          </L>
        </div>
      </details>

      <details className="group">
        <summary className={`${label} cursor-pointer select-none py-1`}>Desgaste, consumo e aparência</summary>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <L t="Desgaste">
            <select value={d.wear_type} onChange={(e) => set('wear_type', e.target.value)} className={field}>
              <option value="unlimited">Sem desgaste</option>
              <option value="durability">Durabilidade</option>
              <option value="consumable">Consumível</option>
            </select>
          </L>
          <L t="Durabilidade">
            <div className="flex items-center gap-1">
              <input type="number" min={0} value={d.durability ?? ''} onChange={(e) => set('durability', e.target.value === '' ? null : Number(e.target.value))} className={field} />
              <span className="text-[var(--muted)]">/</span>
              <input type="number" min={0} value={d.max_durability ?? ''} onChange={(e) => set('max_durability', e.target.value === '' ? null : Number(e.target.value))} className={field} />
            </div>
          </L>
          <L t="Saciedade">
            <input type="number" value={d.saciedade} onChange={num('saciedade')} className={field} />
          </L>
          <L t="Custo de Peste">
            <input type="number" min={0} value={d.plague_cost} onChange={num('plague_cost')} className={field} />
          </L>
          <div className="col-span-2">
            <L t="Especial">
              <input value={d.special} onChange={(e) => set('special', e.target.value)} className={field} />
            </L>
          </div>
          <div className="col-span-2">
            <L t="Imagem (URL)">
              <input value={d.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://…" className={field} />
            </L>
          </div>
        </div>
      </details>

      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--iron)]">
        <button
          type="submit"
          disabled={!hasChanges}
          data-testid="dm-item-save"
          className="h-8 px-3 flex items-center gap-1.5 border border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] text-xs cursor-pointer hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save className="w-3.5 h-3.5" /> Salvar {hasChanges ? '' : '(sem mudanças)'}
        </button>
        {hasChanges && (
          <button
            type="button"
            onClick={() => {
              setD(toDraft(item));
              setDirty(false);
            }}
            className="h-8 px-3 flex items-center gap-1.5 border border-[var(--iron)] text-xs text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" /> Desfazer
          </button>
        )}
        {onUnequip && (
          <button type="button" onClick={onUnequip} className="h-8 px-3 border border-[var(--iron)] text-xs text-[var(--text)] hover:border-[var(--gold-lo)] cursor-pointer">
            Desequipar
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="h-8 px-3 ml-auto flex items-center gap-1.5 border border-[var(--iron)] text-xs text-[var(--muted)] hover:border-[var(--blood)] hover:text-[#e0645a] cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" /> Remover
        </button>
      </div>
    </form>
  );
}

function L({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className={label}>{t}</span>
      {children}
    </label>
  );
}
