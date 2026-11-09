import { BedDouble, ChevronDown, Moon, Tent } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { HORAS_ATE_EXAUSTO } from '../../../shared/lib/fome';
import { useWorldClock } from '../api/clock';
import { ClockDial, climaInfo, hhmm } from './ClockDial';
import { HungerMeter } from './HungerMeter';

interface HeroLike {
  saciedade?: number | null;
  horas_acordado?: number | null;
  vida_max_fome?: number | null;
  exausto?: boolean | null;
}

/**
 * Faixa fina sob a barra do jogador: hora, fase do dia, data e clima.
 * Toque para abrir o pergaminho com os detalhes (lua, estação, fome, cansaço).
 */
export function PlayerClockStrip({ hero }: { hero: HeroLike | null }) {
  const { data, abrigado, climaExtremo, emCombate, correndo } = useWorldClock();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { icon: ClimaIcon, efeito } = climaInfo(data.clima);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  const acordado = Number(hero?.horas_acordado ?? 0);

  return (
    <div ref={ref} className="relative z-20 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="player-clock-strip"
        className="w-full h-8 flex items-center gap-2 px-3 border-b border-[var(--iron)] bg-[linear-gradient(#0d0c0b,#151311)] text-left cursor-pointer"
      >
        <ClockDial data={data} size={34} />
        <span className="font-['Cinzel',serif] text-[13px] tabular-nums text-[var(--gold-hi)]">{hhmm(data)}</span>
        <span className="text-xs italic text-[var(--muted)] truncate">
          {data.faseDia} · {data.dia} de {data.nomeMes}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[var(--muted)]">
          {hero?.exausto && <BedDouble className="w-3.5 h-3.5 text-[var(--ember)]" aria-label="Exausto" />}
          <ClimaIcon className={`w-3.5 h-3.5 ${climaExtremo ? 'text-[var(--ember)]' : ''}`} aria-label={data.clima} />
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-[var(--t-fast)] ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full mt-1 p-4 flex flex-col gap-3 bg-[var(--parch)] text-[var(--ink)] shadow-[0_12px_30px_rgba(0,0,0,0.7),inset_0_0_30px_rgba(90,70,50,0.35)] animate-[fadeIn_var(--t-base)_var(--ease-out)]">
          <div className="flex items-center gap-3">
            <ClockDial data={data} size={84} />
            <div className="min-w-0">
              <p className="font-['Cinzel',serif] text-2xl tabular-nums leading-none text-[var(--ink)]">{hhmm(data)}</p>
              <p className="text-sm text-[var(--ink-soft)]">
                {data.diaSemana}, {data.dia} de {data.nomeMes}
              </p>
              <p className="text-xs italic text-[var(--ink-soft)]">
                Ano {data.ano} · {data.estacao} · {data.faseLua}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Info label="Clima">
              <span className="inline-flex items-center gap-1">
                <ClimaIcon className="w-4 h-4" /> {data.clima}
              </span>
              {efeito && !abrigado && <span className="block text-xs text-[var(--blood)]">{efeito}</span>}
            </Info>
            <Info label="O grupo">
              {abrigado ? (
                <span className="inline-flex items-center gap-1">
                  <Tent className="w-4 h-4" /> Abrigado
                </span>
              ) : (
                'Ao relento'
              )}
              <span className="block text-xs text-[var(--ink-soft)]">
                {emCombate ? 'Tempo parado: combate' : correndo ? 'O tempo corre' : 'Tempo parado'}
              </span>
            </Info>
          </div>

          {hero && (
            <div className="flex flex-col gap-2 pt-2 border-t border-[var(--ink-soft)]/30">
              <div className="p-2.5 bg-[var(--stone)] text-[var(--text)]">
                <HungerMeter value={Number(hero.saciedade ?? 8)} vidaPerdida={Number(hero.vida_max_fome ?? 0)} />
              </div>
              <p className="text-xs text-[var(--ink-soft)] flex items-center gap-1">
                <Moon className="w-3.5 h-3.5" />
                {hero.exausto
                  ? 'Exausto: precisa de um descanso longo.'
                  : `Acordado há ${acordado}h · Exausto em ${Math.max(0, HORAS_ATE_EXAUSTO - acordado)}h`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="font-['Cinzel',serif] text-[9px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">{label}</span>
      <span className="text-[var(--ink)]">{children}</span>
    </div>
  );
}
