import { BookOpen, CheckCircle2, Flag, FlagOff, Pencil, Sparkles, Trash2, Undo2, Unlock, X } from 'lucide-react';
import type React from 'react';
import { useEffect } from 'react';
import type { GrimorioSpell } from '../../grimoire/api';
import type { HeroSpellRow } from '../api/useDMGrimoire';

// ───────────────────────── Estado de uma magia para um herói ─────────────────────────

export type SpellStatus = 'conhece' | 'estudo' | 'nenhum';

export function spellStatus(row: HeroSpellRow | undefined): SpellStatus {
  if (!row) return 'nenhum';
  if (row.aprendida) return 'conhece';
  if (row.liberada_pelo_mestre || (row.marcas ?? 0) > 0) return 'estudo';
  return 'nenhum';
}

export function circleLabel(c: number) {
  return c === 0 ? 'Truque' : `Círculo ${c}`;
}

export function spellColor(spell: GrimorioSpell) {
  return (spell.cor as string) || 'var(--gold-lo)';
}

export function hasNarrativeEffect(spell: GrimorioSpell) {
  const ef = spell.efeitos as unknown;
  return Array.isArray(ef) && ef.some((e: any) => e?.bloco === 'narrativo' || e?.tipo === 'narrativo');
}

export function CircleBadge({ spell }: { spell: GrimorioSpell }) {
  const color = spellColor(spell);
  return (
    <span
      className="w-9 h-9 shrink-0 flex flex-col items-center justify-center border font-['Cinzel',serif] leading-none"
      style={{ borderColor: color, background: `color-mix(in srgb, ${color} 18%, transparent)` }}
      title={circleLabel(spell.circulo)}
    >
      <span className="text-[8px] text-[var(--muted)]">{spell.circulo === 0 ? 'TRQ' : 'CÍRC'}</span>
      <span className="text-sm text-[var(--gold-hi)]">{spell.circulo}</span>
    </span>
  );
}

export function StatusChip({ status, row, spell }: { status: SpellStatus; row?: HeroSpellRow; spell?: GrimorioSpell }) {
  if (status === 'conhece') {
    return (
      <span className="inline-flex whitespace-nowrap items-center gap-1 px-1.5 py-px border border-[var(--moss)] text-[10px] uppercase tracking-[0.08em] text-[var(--moss)] font-['Cinzel',serif]">
        <CheckCircle2 className="w-3 h-3" /> Conhece
      </span>
    );
  }
  if (status === 'estudo') {
    const custo = Number(spell?.custo_inspiracao ?? 1);
    return (
      <span className="inline-flex whitespace-nowrap items-center gap-1 px-1.5 py-px border border-[var(--ember)] text-[10px] uppercase tracking-[0.08em] text-[var(--ember)] font-['Cinzel',serif]">
        Em estudo {row ? `${row.marcas ?? 0}/${custo}` : ''}
      </span>
    );
  }
  return null;
}

export const chipBase =
  "inline-flex whitespace-nowrap items-center gap-1 px-1.5 py-px border text-[10px] uppercase tracking-[0.08em] font-['Cinzel',serif]";

export function ActionButton({
  children,
  onClick,
  variant = 'stone',
  icon: Icon,
  title,
  testId,
  disabled,
}: {
  children?: React.ReactNode;
  onClick: () => void;
  variant?: 'stone' | 'gold' | 'goldLine' | 'moss' | 'danger';
  icon?: typeof X;
  title?: string;
  testId?: string;
  disabled?: boolean;
}) {
  const styles = {
    stone: 'border-[var(--iron)] text-[var(--text)] hover:border-[var(--gold-lo)] hover:text-[var(--gold-hi)]',
    gold: 'border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] hover:brightness-110',
    goldLine: 'border-[var(--gold)] text-[var(--gold-hi)] hover:bg-[var(--gold)]/15',
    moss: 'border-[var(--moss)] text-[var(--moss)] hover:bg-[var(--moss)]/15',
    danger: 'border-[var(--iron)] text-[var(--muted)] hover:border-[var(--blood)] hover:text-[#e0645a]',
  }[variant];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      aria-label={title}
      data-testid={testId}
      disabled={disabled}
      className={`h-8 ${children ? 'px-2.5' : 'w-8'} shrink-0 inline-flex items-center justify-center gap-1.5 border text-xs cursor-pointer transition-colors duration-[var(--t-fast)] active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed ${styles}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

// ───────────────────────── Painel de detalhes ─────────────────────────

export interface SpellActions {
  heroName: string | null;
  row?: HeroSpellRow;
  onTeach: () => void;
  onRelease: () => void;
  onUndo: () => void;
  onRemove: () => void;
  onEdit: () => void;
  onToggleReview: () => void;
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5 px-2.5 py-1.5 border border-[var(--iron)] bg-[var(--abyss)]">
      <span className="font-['Cinzel',serif] text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">{label}</span>
      <span className="text-sm text-[var(--text)]">{value}</span>
    </div>
  );
}

function ParchBlock({ title, children }: { title?: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex flex-col gap-1">
      {title && (
        <h4 className="font-['Cinzel',serif] text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">{title}</h4>
      )}
      <div className="text-[15px] leading-relaxed text-[var(--ink)]">{children}</div>
    </div>
  );
}

export function SpellDetailDrawer({
  spell,
  actions,
  onClose,
}: {
  spell: GrimorioSpell;
  actions: SpellActions;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const status = spellStatus(actions.row);
  const custo = Number(spell.custo_inspiracao ?? 1);
  const extras = [
    ['Sucesso', spell.efeito_sucesso],
    ['Brilhante', spell.efeito_brilhante],
    ['Falha', spell.efeito_falha],
  ].filter(([, v]) => v) as Array<[string, string]>;
  const risco = spell.risco && typeof spell.risco === 'object' ? (spell.risco as { texto?: string }).texto : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={spell.nome}>
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/60 cursor-default animate-[fadeIn_var(--t-base)_var(--ease-out)]"
        onClick={onClose}
      />
      <aside className="relative w-full sm:w-[440px] h-full flex flex-col bg-[var(--stone)] border-l border-[var(--iron)] shadow-[-20px_0_40px_rgba(0,0,0,0.6)] animate-[slideInRight_var(--t-slow)_var(--ease-out)]">
        <header className="flex items-start gap-3 p-4 border-b border-[var(--iron)]" style={{ boxShadow: `inset 3px 0 0 ${spellColor(spell)}` }}>
          <CircleBadge spell={spell} />
          <div className="flex-1 min-w-0">
            <h3 className="font-['Cinzel',serif] text-lg leading-tight text-[var(--gold-hi)]">{spell.nome}</h3>
            <p className="text-sm italic text-[var(--muted)]">
              {circleLabel(spell.circulo)} · {spell.fonte} · {spell.escola}
              {spell.raridade && spell.raridade !== 'Comum' ? ` · ${spell.raridade}` : ''}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <StatusChip status={status} row={actions.row} spell={spell} />
              {spell.revisar_mestre ? (
                <span className={`${chipBase} border-[var(--ember)] text-[var(--ember)]`}>Para revisar</span>
              ) : null}
              {hasNarrativeEffect(spell) && (
                <span className={`${chipBase} border-[var(--mist)] text-[var(--mist)]`}>Efeito narrativo</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-1.5">
            <Fact label="Foco" value={spell.custo_foco ?? 0} />
            <Fact label="Inspiração p/ aprender" value={custo} />
            <Fact label="Alcance" value={spell.alcance} />
            <Fact label="Alvo" value={spell.area} />
            <Fact label="Duração" value={spell.duracao} />
            <Fact label="Nível mínimo" value={spell.nivel_min} />
            <Fact label="Em combate" value={spell.em_combate ? 'Sim' : 'Não'} />
            {spell.concentracao ? <Fact label="Concentração" value="Sim" /> : null}
          </div>

          <div className="flex flex-col gap-3 p-4 bg-[var(--parch)] shadow-[inset_0_0_30px_rgba(90,70,50,0.35)]">
            <ParchBlock>{spell.resumo}</ParchBlock>
            {spell.texto_regra && spell.texto_regra !== spell.resumo ? (
              <ParchBlock title="Regra">{String(spell.texto_regra)}</ParchBlock>
            ) : null}
            {extras.map(([t, v]) => (
              <ParchBlock key={t} title={t}>
                {v}
              </ParchBlock>
            ))}
            {spell.ampliar ? <ParchBlock title="Ampliar">{spell.ampliar}</ParchBlock> : null}
            {risco ? <ParchBlock title="Risco">{risco}</ParchBlock> : null}
            {spell.descricao && spell.descricao !== spell.resumo ? (
              <p className="text-sm italic text-[var(--ink-soft)]">{spell.descricao}</p>
            ) : null}
          </div>
        </div>

        <footer className="p-4 border-t border-[var(--iron)] flex flex-col gap-2.5">
          {actions.heroName && (
            <>
              <p className="text-xs text-[var(--muted)]">
                Para <span className="text-[var(--gold-hi)]">{actions.heroName}</span>:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {status !== 'conhece' && (
                  <ActionButton variant="gold" icon={Sparkles} onClick={actions.onTeach} testId={`dm-teach-btn-${spell.id}`}>
                    Ensinar agora
                  </ActionButton>
                )}
                {status === 'nenhum' && (
                  <ActionButton variant="moss" icon={Unlock} onClick={actions.onRelease} testId={`dm-liberate-btn-${spell.id}`}>
                    Liberar p/ estudo
                  </ActionButton>
                )}
                {status !== 'nenhum' && (
                  <ActionButton icon={Undo2} onClick={actions.onUndo}>
                    {status === 'conhece' ? 'Desaprender' : 'Desfazer marca'}
                  </ActionButton>
                )}
                {status !== 'nenhum' && (
                  <ActionButton variant="danger" icon={Trash2} onClick={actions.onRemove}>
                    Remover
                  </ActionButton>
                )}
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[var(--iron)]/60">
            <ActionButton icon={Pencil} onClick={actions.onEdit}>
              Editar magia
            </ActionButton>
            <ActionButton icon={spell.revisar_mestre ? FlagOff : Flag} onClick={actions.onToggleReview}>
              {spell.revisar_mestre ? 'Aprovar para jogo' : 'Marcar p/ revisão'}
            </ActionButton>
          </div>
        </footer>
      </aside>
    </div>
  );
}

export function EmptyState({ icon: Icon = BookOpen, title, children }: { icon?: typeof X; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 px-4 text-center border border-dashed border-[var(--iron)]">
      <Icon className="w-7 h-7 text-[var(--iron)]" />
      <p className="font-['Cinzel',serif] text-sm text-[var(--text)]">{title}</p>
      {children && <div className="text-sm text-[var(--muted)] max-w-md">{children}</div>}
    </div>
  );
}

// ───────────────────────── Linha de magia ─────────────────────────

export function SpellRow({
  spell,
  status,
  row,
  onOpen,
  actions,
  testId,
}: {
  spell: GrimorioSpell;
  status: SpellStatus;
  row?: HeroSpellRow;
  onOpen: () => void;
  actions?: React.ReactNode;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="group h-full flex items-center gap-3 pr-3 border-b border-[var(--iron)]/60 bg-[var(--stone)] hover:bg-[var(--stone-2)]"
      style={{ boxShadow: `inset 3px 0 0 ${spellColor(spell)}` }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex-1 min-w-0 h-full flex items-center gap-3 pl-3 text-left cursor-pointer outline-none focus-visible:bg-[var(--stone-2)]"
      >
        <CircleBadge spell={spell} />
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <span className="truncate font-['Cinzel',serif] text-sm text-[var(--gold-hi)] group-hover:underline">
              {spell.nome}
            </span>
            <span className="hidden sm:inline-flex shrink-0">
              <StatusChip status={status} row={row} spell={spell} />
            </span>
            {spell.revisar_mestre ? (
              <span className={`${chipBase} shrink-0 border-[var(--ember)]/60 text-[var(--ember)] hidden sm:inline-flex`}>Revisar</span>
            ) : null}
          </span>
          <span className="block truncate text-xs text-[var(--muted)]">
            {spell.fonte} · {spell.escola} · Foco {spell.custo_foco ?? 0}
            {spell.resumo ? <span className="hidden md:inline"> — {spell.resumo}</span> : null}
          </span>
        </span>
      </button>
      {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
    </div>
  );
}
