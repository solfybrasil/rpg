import {
  BedDouble,
  CalendarCog,
  Dices,
  FastForward,
  Loader2,
  Minus,
  Pause,
  Play,
  Plus,
  Soup,
  Sunrise,
  Tent,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useHeroes } from '../../../shared/hooks/baseHooks';
import { MESES, calcularTransicaoProximaFase, sortearClimaParaMes } from '../../../shared/lib/calendario';
import { HORAS_ATE_EXAUSTO, estadoFome } from '../../../shared/lib/fome';
import { useClockTicker, useWorldClock, useWorldClockActions } from '../api/clock';
import { ClockDial, climaInfo, hhmm } from './ClockDial';
import { HungerPips } from './HungerMeter';

const CLIMAS = [
  'Céu limpo',
  'Nublado',
  'Neblina',
  'Chuva fina',
  'Chuva',
  'Tempestade',
  'Vento forte',
  'Calor forte',
  'Neve',
  'Nevasca',
  'Céu limpo e gelado',
];

const VELOCIDADES = [
  { escala: 1, label: '1×', hint: 'tempo real' },
  { escala: 10, label: '10×', hint: '1 min = 10 min' },
  { escala: 60, label: '60×', hint: '1 min = 1 hora' },
];

/** Relógio compacto na barra do Mestre + gaveta com os controles do tempo. */
export function DMClockButton() {
  const clock = useWorldClock();
  const [open, setOpen] = useState(false);
  // Só a tela do Mestre grava o tempo que passa.
  useClockTicker(clock.correndo && !clock.emCombate);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="dm-clock-button"
        title="Tempo, clima e fome"
        className="h-10 pl-1 pr-3 flex items-center gap-2 border border-[var(--iron)] bg-[var(--stone)] hover:border-[var(--gold-lo)] cursor-pointer"
      >
        <ClockDial data={clock.data} size={40} />
        <span className="flex flex-col items-start leading-tight">
          <span className="font-['Cinzel',serif] text-sm tabular-nums text-[var(--gold-hi)]">
            {hhmm(clock.data)}
            {clock.correndo && !clock.emCombate && (
              <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-[var(--moss)] align-middle animate-pulse" />
            )}
          </span>
          <span className="hidden sm:block text-[10px] text-[var(--muted)]">
            {clock.data.dia} de {clock.data.nomeMes}
          </span>
        </span>
      </button>
      {/* Portal: a barra do Mestre é sticky e prenderia o `fixed` da gaveta. */}
      {open && createPortal(<DMTimeDrawer onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function DMTimeDrawer({ onClose }: { onClose: () => void }) {
  const clock = useWorldClock();
  const actions = useWorldClockActions();
  const { heroes = [] } = useHeroes();
  const [busy, setBusy] = useState<string | null>(null);
  const [showDate, setShowDate] = useState(false);
  const { data } = clock;
  const { icon: ClimaIcon, efeito } = climaInfo(data.clima);
  const prox = calcularTransicaoProximaFase(clock.minutos);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (err) {
      toast.error(`Não foi possível: ${err instanceof Error ? err.message : 'erro'}`);
    } finally {
      setBusy(null);
    }
  };

  const avancar = (min: number, rotulo: string) =>
    run(`adv${min}`, async () => {
      const r = await actions.avancar(min, rotulo);
      if (!r) throw new Error('outra tela avançou o tempo ao mesmo tempo; tente de novo');
    }, `${rotulo}.`);

  const vivos = heroes.filter((h) => h.alive !== false);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Tempo do mundo">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/60 cursor-default" onClick={onClose} />
      <aside className="relative w-full sm:w-[460px] h-full overflow-y-auto flex flex-col bg-[var(--stone)] border-l border-[var(--iron)] shadow-[-20px_0_40px_rgba(0,0,0,0.6)] animate-[slideInRight_var(--t-slow)_var(--ease-out)]">
        {/* Céu */}
        <header className="relative p-4 border-b border-[var(--iron)]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4">
            <ClockDial data={data} size={150} />
            <div className="min-w-0">
              <p className="font-['Cinzel',serif] text-4xl tabular-nums leading-none text-[var(--gold-hi)]">{hhmm(data)}</p>
              <p className="mt-1 font-['Cinzel',serif] text-xs uppercase tracking-[0.16em] text-[var(--gold)]">{data.faseDia}</p>
              <p className="text-sm text-[var(--text)]">
                {data.diaSemana}, {data.dia} de {data.nomeMes}
              </p>
              <p className="text-xs italic text-[var(--muted)]">
                Ano {data.ano} · {data.estacao} · {data.faseLua}
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-5 p-4">
          {/* Relógio */}
          <Section title="Relógio">
            <div className="flex gap-2">
              {clock.correndo ? (
                <Btn icon={Pause} onClick={() => run('pause', actions.pausar, 'Tempo pausado.')} busy={busy === 'pause'}>
                  Pausar
                </Btn>
              ) : (
                <Btn icon={Play} gold onClick={() => run('play', actions.tocar, 'O tempo volta a correr.')} busy={busy === 'play'}>
                  Deixar correr
                </Btn>
              )}
              <div className="flex border border-[var(--iron)]" role="radiogroup" aria-label="Velocidade">
                {VELOCIDADES.map((v) => (
                  <button
                    key={v.escala}
                    type="button"
                    role="radio"
                    aria-checked={clock.escala === v.escala}
                    title={v.hint}
                    onClick={() => run(`vel${v.escala}`, () => actions.velocidade(v.escala))}
                    className={`h-9 px-3 text-sm cursor-pointer ${
                      clock.escala === v.escala ? 'bg-[var(--gold)]/15 text-[var(--gold-hi)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs italic text-[var(--muted)]">
              {clock.emCombate
                ? 'Combate ativo: o relógio fica parado até o fim da luta.'
                : clock.correndo
                  ? `Correndo a ${VELOCIDADES.find((v) => v.escala === clock.escala)?.hint ?? `${clock.escala}×`}. Fome e cansaço sobem sozinhos.`
                  : 'Parado. Avance o tempo nos botões abaixo.'}
            </p>
          </Section>

          {/* Avançar */}
          <Section title="Avançar o tempo">
            <div className="grid grid-cols-3 gap-1.5">
              <Btn onClick={() => avancar(10, 'Passaram 10 minutos')} busy={busy === 'adv10'}>+10 min</Btn>
              <Btn onClick={() => avancar(60, 'Passou 1 hora')} busy={busy === 'adv60'}>+1 hora</Btn>
              <Btn onClick={() => avancar(240, 'Passaram 4 horas')} busy={busy === 'adv240'}>+4 horas</Btn>
              <Btn
                icon={Sunrise}
                className="col-span-2"
                onClick={() => avancar(prox.minutosFaltando, `Chegou o(a) ${prox.proximaFase}`)}
                busy={busy === `adv${prox.minutosFaltando}`}
              >
                Até {['Meio-dia', 'Crepúsculo'].includes(prox.proximaFase) ? 'o' : 'a'} {prox.proximaFase}
              </Btn>
              <Btn icon={FastForward} onClick={() => avancar(1440, 'Passou 1 dia')} busy={busy === 'adv1440'}>+1 dia</Btn>
            </div>
          </Section>

          {/* Descanso */}
          <Section title="Descanso do grupo">
            <div className="grid grid-cols-2 gap-1.5">
              <Btn
                icon={Tent}
                onClick={() => run('curto', () => actions.descansar('curto'), 'Descanso curto: Foco e Vida recuperados.')}
                busy={busy === 'curto'}
              >
                Curto · 1h
              </Btn>
              <Btn
                icon={BedDouble}
                onClick={() => run('longo', () => actions.descansar('longo'), 'Descanso longo: o grupo despertou renovado.')}
                busy={busy === 'longo'}
              >
                Longo · 8h
              </Btn>
            </div>
            <p className="text-xs italic text-[var(--muted)]">
              Curto: metade do Foco (+1 se Saciado) e 2 de Vida. Longo: Foco cheio, metade da Vida e fim da Exaustão.
              Famintos não recuperam Vida.
            </p>
          </Section>

          {/* Clima e abrigo */}
          <Section title="Clima">
            <div className="flex gap-1.5">
              <label className="relative flex-1">
                <ClimaIcon className="absolute left-2 top-2.5 w-4 h-4 text-[var(--gold)] pointer-events-none" />
                <select
                  value={CLIMAS.includes(data.clima) ? data.clima : ''}
                  onChange={(e) => run('clima', () => actions.clima(e.target.value))}
                  className="w-full h-9 pl-8 text-sm rounded-none"
                  aria-label="Clima"
                >
                  {!CLIMAS.includes(data.clima) && <option value="">{data.clima}</option>}
                  {CLIMAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <Btn icon={Dices} title="Sortear pela estação" onClick={() => run('sort', () => actions.clima(sortearClimaParaMes(data.mes)))}>
                Sortear
              </Btn>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={clock.abrigado}
              onClick={() => run('abrigo', () => actions.abrigar(!clock.abrigado))}
              className="flex items-center justify-between gap-3 h-9 px-3 border border-[var(--iron)] text-sm cursor-pointer hover:border-[var(--gold-lo)]"
            >
              <span className="flex items-center gap-2">
                <Tent className="w-4 h-4 text-[var(--gold)]" /> Grupo abrigado
              </span>
              <span className={clock.abrigado ? 'text-[var(--moss)]' : 'text-[var(--muted)]'}>{clock.abrigado ? 'Sim' : 'Não'}</span>
            </button>
            {efeito && (
              <p className={`text-xs ${clock.climaExtremo ? 'text-[var(--ember)]' : 'text-[var(--muted)]'}`}>
                {clock.climaExtremo ? `${data.clima}: ${efeito}.` : `${data.clima}, mas o grupo está abrigado.`}
              </p>
            )}
          </Section>

          {/* Fome */}
          <Section
            title="Fome e cansaço"
            action={
              <Btn icon={Soup} onClick={() => run('food', () => actions.alimentar(4), 'Refeição servida: +4 de saciedade para todos.')} busy={busy === 'food'}>
                Refeição p/ todos
              </Btn>
            }
          >
            {vivos.length === 0 ? (
              <p className="text-sm italic text-[var(--muted)]">Nenhum herói.</p>
            ) : (
              <ul className="flex flex-col border border-[var(--iron)]">
                {vivos.map((h) => {
                  const sac = Number(h.saciedade ?? 8);
                  const est = estadoFome(sac);
                  const acordado = Number(h.horas_acordado ?? 0);
                  return (
                    <li key={h.id} className="flex items-center gap-3 px-3 py-2 border-b border-[var(--iron)]/60 last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm text-[var(--text)]">{h.name}</span>
                          <span className="text-[10px] uppercase tracking-[0.1em] font-['Cinzel',serif]" style={{ color: est.cor }}>
                            {est.nome}
                          </span>
                          {h.exausto && (
                            <span className="text-[10px] uppercase tracking-[0.1em] font-['Cinzel',serif] text-[var(--ember)]">Exausto</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <HungerPips value={sac} size={7} />
                          <span className="text-[11px] text-[var(--muted)] tabular-nums" title="Horas acordado">
                            {acordado}/{HORAS_ATE_EXAUSTO}h
                          </span>
                          {Number(h.vida_max_fome ?? 0) > 0 && (
                            <span className="text-[11px] text-[#e0645a]">−{h.vida_max_fome} Vida máx.</span>
                          )}
                        </div>
                      </div>
                      <div className="flex">
                        <IconBtn label={`Tirar 1 de saciedade de ${h.name}`} onClick={() => run(`h-${h.id}`, () => actions.alimentar(-1, h.id))} icon={Minus} />
                        <IconBtn label={`Alimentar ${h.name} (+1)`} onClick={() => run(`h+${h.id}`, () => actions.alimentar(1, h.id))} icon={Plus} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-xs italic text-[var(--muted)]">
              A saciedade cai 1 ponto a cada 4 horas. Sem comer por um dia inteiro, o herói perde 1 de Vida máxima; ela volta quando ele come.
            </p>
          </Section>

          {/* Data */}
          <Section
            title="Data"
            action={
              <button type="button" onClick={() => setShowDate((v) => !v)} className="text-xs text-[var(--gold)] hover:text-[var(--gold-hi)] cursor-pointer flex items-center gap-1">
                <CalendarCog className="w-3.5 h-3.5" /> {showDate ? 'Fechar' : 'Ajustar'}
              </button>
            }
          >
            {showDate && <DateForm current={data} onSave={(a, m, d, h, mi) => run('date', () => actions.definirData(a, m, d, h, mi), 'Data ajustada.')} />}
          </Section>
        </div>
      </aside>
    </div>
  );
}

function DateForm({
  current,
  onSave,
}: {
  current: { ano: number; mes: number; dia: number; hora: number; minuto: number };
  onSave: (ano: number, mes: number, dia: number, hora: number, minuto: number) => void;
}) {
  const [v, setV] = useState(current);
  const input = 'h-9 w-full px-2 text-sm rounded-none';
  return (
    <form
      className="grid grid-cols-[1fr_2fr_1fr] gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(v.ano, v.mes, Math.min(30, Math.max(1, v.dia)), Math.min(23, Math.max(0, v.hora)), Math.min(59, Math.max(0, v.minuto)));
      }}
    >
      <input className={input} type="number" value={v.dia} min={1} max={30} onChange={(e) => setV({ ...v, dia: Number(e.target.value) })} aria-label="Dia" />
      <select className={input} value={v.mes} onChange={(e) => setV({ ...v, mes: Number(e.target.value) })} aria-label="Mês">
        {Object.values(MESES).map((m) => (
          <option key={m.numero} value={m.numero}>{m.nome}</option>
        ))}
      </select>
      <input className={input} type="number" value={v.ano} onChange={(e) => setV({ ...v, ano: Number(e.target.value) })} aria-label="Ano" />
      <input className={input} type="number" value={v.hora} min={0} max={23} onChange={(e) => setV({ ...v, hora: Number(e.target.value) })} aria-label="Hora" />
      <input className={input} type="number" value={v.minuto} min={0} max={59} onChange={(e) => setV({ ...v, minuto: Number(e.target.value) })} aria-label="Minuto" />
      <button type="submit" className="h-9 border border-[var(--gold-lo)] text-sm text-[var(--gold-hi)] hover:bg-[var(--gold)]/10 cursor-pointer">
        Definir
      </button>
      <p className="col-span-3 text-xs italic text-[var(--muted)]">Ajustar a data não aplica fome nem cansaço.</p>
    </form>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-['Cinzel',serif] text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Btn({
  children,
  onClick,
  icon: Icon,
  gold = false,
  busy = false,
  className = '',
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: typeof X;
  gold?: boolean;
  busy?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={title}
      className={`h-9 px-3 inline-flex items-center justify-center gap-1.5 border text-sm cursor-pointer active:translate-y-px disabled:opacity-60 ${
        gold
          ? 'border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] hover:brightness-110'
          : 'border-[var(--iron)] text-[var(--text)] hover:border-[var(--gold-lo)] hover:text-[var(--gold-hi)]'
      } ${className}`}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : Icon ? <Icon className="w-3.5 h-3.5" /> : null}
      {children}
    </button>
  );
}

function IconBtn({ label, onClick, icon: Icon }: { label: string; onClick: () => void; icon: typeof X }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-8 h-8 -ml-px flex items-center justify-center border border-[var(--iron)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--gold-lo)] cursor-pointer"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
