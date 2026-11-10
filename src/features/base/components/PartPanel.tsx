import { CheckCircle2, Hammer, Loader2, X } from 'lucide-react';
import { useMemo } from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import { type BaseItem, type BasePart, useBaseActions } from '../api/baseApi';
import { conditionLabel, countByName, currentCondition, daysToBreak, needsKey, parseNeeds, partKind } from '../data/parts';
import { healthColor } from './BaseScene';

interface Props {
  part: BasePart;
  minutes: number;
  stored: BaseItem[];
  onClose: () => void;
  hero?: { id: string; name: string; backpack: InventoryItemRecord[] } | null;
  layout?: 'sheet' | 'side';
  /** Mestre: conteúdo extra (editor) abaixo do estado. */
  children?: React.ReactNode;
}

function fmtDays(d: number) {
  if (d < 1) return `${Math.max(1, Math.round(d * 24))} h`;
  return `${Math.round(d)} ${Math.round(d) === 1 ? 'dia' : 'dias'}`;
}

/** Estado de uma parte externa e o conserto com materiais da mochila ou dos baús. */
export function PartPanel({ part, minutes, stored, onClose, hero, layout = 'sheet', children }: Props) {
  const actions = useBaseActions();
  const kind = partKind(part.kind);
  const Icon = kind.icon;
  const max = Math.max(1, part.max_condition || 100);
  const cur = currentCondition(part, minutes);
  const h = cur / max;
  const pct = Math.round(h * 100);
  const days = daysToBreak(part, minutes);
  const needs = parseNeeds(part.repair_items);

  const pack = useMemo(() => countByName((hero?.backpack ?? []).filter((i) => !i.equip_slot)), [hero?.backpack]);
  const chest = useMemo(() => countByName(stored.map((b) => ({ name: b.item.name, quantity: b.quantity }))), [stored]);
  const rows = needs.map((n) => {
    const k = needsKey(n.name);
    const inPack = pack.get(k) ?? 0;
    const inChest = chest.get(k) ?? 0;
    return { ...n, inPack, inChest, ok: inPack + inChest >= n.qty };
  });
  const allOk = rows.every((r) => r.ok);
  const full = cur >= max - 0.01;
  const gain = part.repair_amount > 0 ? Math.min(max - cur, part.repair_amount) : max - cur;

  return (
    <aside
      className={`absolute z-30 flex flex-col bg-[var(--stone)] border-[var(--iron)] font-[family-name:var(--body)] shadow-[0_0_40px_rgba(0,0,0,0.7)] animate-[fadeIn_var(--t-base)_var(--ease-out)] ${
        layout === 'side' ? 'top-0 right-0 bottom-0 w-[400px] max-w-full border-l' : 'left-0 right-0 bottom-0 max-h-[68%] border-t'
      }`}
      data-testid="part-panel"
      aria-label={part.name}
    >
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--iron)]">
        <span className="w-10 h-10 shrink-0 flex items-center justify-center border border-[var(--iron)] text-[var(--text)] bg-[var(--stone-2)]">
          <Icon className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="font-['Cinzel',serif] text-base tracking-[0.08em] text-[var(--gold-hi)] truncate">{part.name}</h2>
          <p className="text-xs text-[var(--muted)]">{kind.label}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="w-9 h-9 flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {/* Estado */}
        <section>
          <div className="flex items-baseline justify-between mb-1">
            <span className="font-['Cinzel',serif] text-sm" style={{ color: healthColor(h) }} data-testid="part-state">
              {conditionLabel(h)}
            </span>
            <span className="text-sm tabular-nums text-[var(--text)]">{pct}%</span>
          </div>
          <div className="h-2 bg-[var(--abyss)] border border-[var(--iron)]">
            <div className="h-full origin-left transition-transform duration-[var(--t-base)]" style={{ transform: `scaleX(${h})`, background: healthColor(h) }} />
          </div>
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            {days == null
              ? 'Não se desgasta com o tempo.'
              : h <= 0
                ? 'Quebrado. Precisa de conserto.'
                : `Perde ${Number(part.wear_per_day).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% por dia · quebra em ~${fmtDays(days)}.`}
            {part.last_repaired_by ? ` Último conserto: ${part.last_repaired_by}.` : ''}
          </p>
        </section>

        {part.description && (
          <p className="px-3 py-2 bg-[var(--parch)] text-[var(--ink)] text-[15px] italic leading-snug">{part.description}</p>
        )}

        {/* Materiais */}
        <section>
          <h3 className="mb-1.5 font-['Cinzel',serif] text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Para consertar
            {part.repair_amount > 0 && <span className="normal-case tracking-normal"> · cada conserto devolve {part.repair_amount}</span>}
          </h3>
          {rows.length === 0 ? (
            <p className="text-xs italic text-[var(--muted)]">Não precisa de materiais.</p>
          ) : (
            <ul className="flex flex-col gap-1" data-testid="repair-needs">
              {rows.map((r) => (
                <li key={r.name} className="flex items-center gap-2 px-2 py-1.5 border border-[var(--iron)] bg-[var(--stone-2)] text-sm">
                  {r.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--moss)] shrink-0" />
                  ) : (
                    <span className="w-4 h-4 shrink-0 border border-[var(--iron)]" />
                  )}
                  <span className="flex-1 truncate text-[var(--text)]">{r.name}</span>
                  <span className={`tabular-nums text-xs ${r.ok ? 'text-[var(--moss)]' : 'text-[#e0645a]'}`}>
                    {Math.min(r.inPack + r.inChest, r.qty)}/{r.qty}
                  </span>
                  {hero && (r.inPack > 0 || r.inChest > 0) && (
                    <span className="text-[10px] text-[var(--muted)]">
                      {[r.inPack && `mochila ${r.inPack}`, r.inChest && `baús ${r.inChest}`].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {children}
      </div>

      {hero && (
        <footer className="border-t border-[var(--iron)] p-3 flex flex-col gap-1.5">
          <button
            type="button"
            disabled={full || !allOk || actions.repairPart.isPending}
            onClick={() =>
              actions.repairPart.mutate({ part, minutes, heroId: hero.id, heroName: hero.name, backpack: hero.backpack, stored })
            }
            data-testid="btn-repair"
            className="h-11 flex items-center justify-center gap-2 border border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] font-['Cinzel',serif] text-sm tracking-[0.1em] cursor-pointer active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {actions.repairPart.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />}
            {full ? 'Em perfeito estado' : `Consertar${gain > 0 ? ` (+${Math.round((gain / max) * 100)}%)` : ''}`}
          </button>
          {!full && !allOk && <p className="text-xs italic text-[var(--muted)] text-center">Junte os materiais na mochila ou nos baús da base.</p>}
        </footer>
      )}
    </aside>
  );
}
