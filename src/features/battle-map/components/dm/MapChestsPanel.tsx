import { Link } from '@tanstack/react-router';
import { Crosshair, Eye, EyeOff, Gift, MapPin, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { TreasureChest } from '../../../treasure/api/treasureQuery';
import { TIERS, TIER_ORDER, type ChestTier } from '../../../treasure/data/loot';
import { parseSpecial } from '../../engine/FxSprite';
import type { BattleToken } from '../../engine/types';
import { IconButton, RangeField, Section, TextButton, Toggle } from './BattleUI';

export function MapChestsPanel({
  tokens,
  chests,
  missing,
  selectedId,
  placing,
  busy,
  onSpread,
  onPlaceOne,
  onCancel,
  onSelect,
  onPatch,
  onRemove,
  onCenter,
}: {
  tokens: BattleToken[];
  chests: TreasureChest[];
  missing: boolean;
  selectedId: string | null;
  placing: ChestTier | null;
  busy: boolean;
  onSpread: (tier: ChestTier, count: number, hidden: boolean) => void;
  onPlaceOne: (tier: ChestTier, hidden: boolean) => void;
  onCancel: () => void;
  onSelect: (id: string) => void;
  onPatch: (id: string, patch: Partial<BattleToken>) => void;
  onRemove: (token: BattleToken) => void;
  onCenter: (id: string) => void;
}) {
  const [tier, setTier] = useState<ChestTier>('madeira');
  const [count, setCount] = useState(3);
  const [hidden, setHidden] = useState(false);
  const byId = useMemo(() => new Map(chests.map((c) => [c.id, c])), [chests]);
  const placed = useMemo(() => tokens.filter((t) => parseSpecial(t.media_url)?.kind === 'bau'), [tokens]);
  const sel = placed.find((t) => t.id === selectedId) ?? null;
  const selSpec = sel ? parseSpecial(sel.media_url) : null;
  const selChest = selSpec?.kind === 'bau' ? byId.get(selSpec.chestId) : undefined;

  if (missing) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Os baús precisam da tabela nova. Abra a aba{' '}
        <Link to="/mestre/tesouros" className="text-[var(--gold-hi)] underline">
          Tesouros
        </Link>{' '}
        para ver o SQL e rodar uma vez no Supabase.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="map-chests-panel">
      <Section title="Espalhar baús">
        <div className="grid grid-cols-5 gap-1">
          {TIER_ORDER.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tier === t}
              title={TIERS[t].nome}
              onClick={() => setTier(t)}
              data-testid={`map-tier-${t}`}
              className={`h-9 border text-[10px] leading-tight cursor-pointer ${
                tier === t ? 'border-[var(--gold)] text-[var(--gold-hi)] bg-[var(--gold)]/10' : 'border-[var(--iron)] text-[var(--muted)]'
              }`}
            >
              {TIERS[t].nome.replace('Baú ', '').replace('Relicário ', '')}
            </button>
          ))}
        </div>
        <RangeField label="Quantos" value={count} min={1} max={12} step={1} onChange={setCount} />
        <Toggle label="Escondidos (você revela depois)" checked={hidden} onChange={setHidden} />
        <p className="text-[11px] text-[var(--muted)]">
          O conteúdo é sorteado na hora. Confira ou troque na aba Tesouros. O jogador abre quando estiver numa casa vizinha.
        </p>
        {placing ? (
          <div className="flex items-center gap-2 p-2 border border-[var(--gold)] bg-[var(--gold)]/10 text-xs text-[var(--gold-hi)]">
            <Crosshair className="w-4 h-4 shrink-0" />
            <span className="flex-1">Clique no mapa onde fica o {TIERS[placing].nome.toLowerCase()}.</span>
            <IconButton size="sm" icon={X} label="Cancelar (Esc)" onClick={onCancel} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            <TextButton variant="gold" icon={Gift} disabled={busy} onClick={() => onSpread(tier, count, hidden)} testId="btn-spread-chests">
              Espalhar {count}
            </TextButton>
            <TextButton icon={MapPin} disabled={busy} onClick={() => onPlaceOne(tier, hidden)} testId="btn-place-chest">
              Pôr um aqui
            </TextButton>
          </div>
        )}
      </Section>

      {sel && (
        <Section title="Baú selecionado">
          <div className="flex flex-col gap-2 border border-[var(--gold-lo)] bg-[var(--stone)] p-3">
            <p className="text-sm text-[var(--gold-hi)]">{sel.name}</p>
            {selChest ? (
              <>
                <ul className="text-xs text-[var(--text)] flex flex-col gap-0.5">
                  {selChest.items.map((i) => (
                    <li key={i.key} className={i.taken_by ? 'line-through text-[var(--muted)]' : ''}>
                      {i.qty > 1 ? `${i.qty}× ` : ''}
                      {i.name} <span className="text-[var(--muted)]">· {i.rarity}</span>
                    </li>
                  ))}
                  {selChest.coins > 0 && <li className={selChest.coins_taken_by ? 'line-through text-[var(--muted)]' : ''}>Moedas</li>}
                </ul>
                <Link to="/mestre/tesouros" className="text-xs text-[var(--gold-hi)] underline">
                  Trocar itens na aba Tesouros
                </Link>
              </>
            ) : (
              <p className="text-xs italic text-[var(--muted)]">Conteúdo não encontrado (o baú foi apagado na aba Tesouros).</p>
            )}
            <div className="grid grid-cols-3 gap-1.5">
              <IconButton
                icon={sel.visible === false ? EyeOff : Eye}
                label={sel.visible === false ? 'Revelar aos jogadores' : 'Esconder dos jogadores'}
                active={sel.visible === false}
                onClick={() => onPatch(sel.id, { visible: sel.visible === false })}
              />
              <IconButton icon={Crosshair} label="Centralizar" onClick={() => onCenter(sel.id)} />
              <IconButton icon={Trash2} label="Tirar do mapa" danger onClick={() => onRemove(sel)} />
            </div>
          </div>
        </Section>
      )}

      <Section title={`No mapa (${placed.length})`}>
        {placed.length === 0 && <p className="text-xs italic text-[var(--muted)]">Nenhum baú no mapa.</p>}
        <ul className="flex flex-col">
          {placed.map((t) => {
            const sp = parseSpecial(t.media_url);
            const ch = sp?.kind === 'bau' ? byId.get(sp.chestId) : undefined;
            const left = ch ? ch.items.filter((i) => !i.taken_by).length : 0;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm cursor-pointer hover:bg-[var(--stone-2)] ${
                    selectedId === t.id ? 'text-[var(--gold-hi)] bg-[var(--stone-2)]' : 'text-[var(--text)]'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span className="flex-1 truncate">{t.name}</span>
                  {t.visible === false && <EyeOff className="w-3.5 h-3.5 text-[var(--muted)]" />}
                  <span className="text-[11px] text-[var(--muted)] tabular-nums">
                    {sp?.kind === 'bau' && sp.opened ? 'aberto · ' : ''}
                    {ch ? `${left}/${ch.items.length}` : '—'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
