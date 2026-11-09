import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type GameStateRow, useGameState } from '../../../shared/hooks/baseHooks';
import {
  type DataMundo,
  dataParaMinutos,
  isClimaExtremo,
  minutosParaData,
  sortearClimaParaMes,
} from '../../../shared/lib/calendario';
import { type TipoDescanso, DESCANSO_MINUTOS, aplicarDescanso, aplicarPassagem, aplicarRefeicao } from '../../../shared/lib/fome';
import { queryKeys, supabase } from '../../../shared/supabase';

/** Data inicial canônica: Ano 847, Brasa Alta, dia 1, 08:00. */
const MINUTOS_PADRAO = Number(dataParaMinutos(847, 5, 1, 8, 0));

export interface WorldClockView {
  state: GameStateRow | null;
  /** Minutos do mundo agora (com o relógio correndo, interpolado ao vivo). */
  minutos: number;
  data: DataMundo;
  correndo: boolean;
  escala: number;
  abrigado: boolean;
  emCombate: boolean;
  climaExtremo: boolean;
}

function baseMinutes(s: GameStateRow | null | undefined) {
  const m = Number(s?.mundo_minutos ?? 0);
  return m > 0 ? m : MINUTOS_PADRAO;
}

/** Minutos de mundo ainda não gravados desde o último tick. */
export function minutosPendentes(s: GameStateRow | null | undefined, agora = Date.now()) {
  if (!s?.relogio_correndo || s.combate_ativo || !s.relogio_ultimo_tick) return 0;
  const real = agora - new Date(s.relogio_ultimo_tick).getTime();
  return Math.max(0, Math.floor((real / 60_000) * Number(s.relogio_escala || 1)));
}

/**
 * Relógio do mundo para qualquer tela: lê `game_state` (com tempo real) e
 * interpola o horário enquanto o relógio corre, sem gravar nada.
 */
export function useWorldClock(): WorldClockView {
  const { gameState } = useGameState() as { gameState: GameStateRow | null };
  const s = gameState ?? null;
  const [agora, setAgora] = useState(() => Date.now());
  const running = Boolean(s?.relogio_correndo && !s?.combate_ativo);
  const escala = Number(s?.relogio_escala || 1);

  useEffect(() => {
    if (!running) return;
    // Rápido o bastante para o minuto virar na hora certa, sem custo à toa.
    const passo = Math.max(1000, Math.min(15_000, 60_000 / escala));
    const t = setInterval(() => setAgora(Date.now()), passo);
    return () => clearInterval(t);
  }, [running, escala]);

  return useMemo(() => {
    const minutos = baseMinutes(s) + minutosPendentes(s, agora);
    const clima = s?.clima || 'Céu limpo';
    return {
      state: s,
      minutos,
      data: minutosParaData(minutos, clima),
      correndo: Boolean(s?.relogio_correndo),
      escala,
      abrigado: Boolean(s?.grupo_abrigado),
      emCombate: Boolean(s?.combate_ativo),
      climaExtremo: isClimaExtremo(clima) && !s?.grupo_abrigado,
    };
  }, [s, agora, escala]);
}

// ───────────────────────── Escrita (só o Mestre) ─────────────────────────

const HERO_TIME_COLS =
  'id, name, alive, saciedade, horas_acordado, horas_faminto, vida_max_fome, exausto, health, max_health, focus, max_focus';

async function lerEstado(): Promise<GameStateRow> {
  const { data, error } = await supabase.from('game_state').select('*').limit(1).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Sem linha em game_state');
  return data;
}

async function registrar(minutos: number, texto: string, tipo: string) {
  try {
    await supabase.from('mundo_log' as never).insert({ mundo_minutos: minutos, texto, tipo } as never);
  } catch {
    // tabela opcional
  }
}

export interface AvancoResultado {
  de: number;
  ate: number;
  clima: string;
  heroisAfetados: number;
}

/**
 * Avança o tempo do mundo e aplica fome/cansaço em todos os heróis vivos.
 * Usa "compare-and-set" em `mundo_minutos` para que dois cliques (ou duas abas)
 * não avancem o tempo duas vezes.
 */
export async function avancarTempo(
  minutos: number,
  motivo: string,
  opts: { dormindo?: boolean; tickBase?: string | null; novoTick?: string } = {},
): Promise<AvancoResultado | null> {
  if (minutos <= 0) return null;
  const gs = await lerEstado();
  const de = baseMinutes(gs);
  const ate = de + Math.round(minutos);
  const nova = minutosParaData(ate);

  const patch: Partial<GameStateRow> = {
    mundo_minutos: ate,
    relogio_ultimo_tick: opts.novoTick ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  let clima = gs.clima || 'Céu limpo';
  if (gs.clima_dia == null || nova.diaTotal !== Number(gs.clima_dia)) {
    clima = sortearClimaParaMes(nova.mes);
    patch.clima = clima;
    patch.clima_dia = nova.diaTotal;
  }

  let q = supabase.from('game_state').update(patch).eq('id', gs.id).eq('mundo_minutos', gs.mundo_minutos);
  if (opts.tickBase !== undefined) {
    q = opts.tickBase === null ? q.is('relogio_ultimo_tick', null) : q.eq('relogio_ultimo_tick', opts.tickBase);
  }
  const { data: updated, error } = await q.select('id');
  if (error) throw error;
  if (!updated || updated.length === 0) return null; // outra aba já avançou

  // Fome e cansaço
  const extremo = isClimaExtremo(gs.clima || '') && !gs.grupo_abrigado;
  const { data: herois } = await supabase.from('characters').select(HERO_TIME_COLS);
  let afetados = 0;
  await Promise.all(
    (herois ?? [])
      .filter((h) => h.alive !== false)
      .map(async (h) => {
        const p = aplicarPassagem(h, { de, minutos: ate - de, climaExtremo: extremo, dormindo: opts.dormindo });
        const { error: e } = await supabase.from('characters').update(p).eq('id', h.id);
        if (!e) afetados++;
      }),
  );

  if (motivo !== 'relógio' || nova.diaTotal !== minutosParaData(de).diaTotal) {
    await registrar(ate, motivo === 'relógio' ? `Amanhece: ${nova.diaSemana}, ${nova.dia} de ${nova.nomeMes}` : motivo, 'tempo');
  }
  return { de, ate, clima, heroisAfetados: afetados };
}

/** Descanso do grupo: passa o tempo (dormindo, se longo) e aplica a recuperação. */
export async function descansarGrupo(tipo: TipoDescanso) {
  const r = await avancarTempo(DESCANSO_MINUTOS[tipo], tipo === 'curto' ? 'Descanso curto (1h)' : 'Descanso longo (8h)', {
    dormindo: tipo === 'longo',
  });
  if (!r) return null;
  const { data: herois } = await supabase.from('characters').select(HERO_TIME_COLS);
  await Promise.all(
    (herois ?? [])
      .filter((h) => h.alive !== false)
      .map((h) => supabase.from('characters').update(aplicarDescanso(h, tipo)).eq('id', h.id)),
  );
  return r;
}

/** Refeição: soma saciedade a um herói (ou a todos, sem id). */
export async function alimentar(pontos: number, heroId?: string) {
  let q = supabase.from('characters').select(HERO_TIME_COLS);
  if (heroId) q = q.eq('id', heroId);
  const { data: herois } = await q;
  await Promise.all(
    (herois ?? [])
      .filter((h) => h.alive !== false)
      .map((h) => supabase.from('characters').update(aplicarRefeicao(h, pontos)).eq('id', h.id)),
  );
}

/** Hook com as ações do Mestre (mantém o cache de game_state em dia). */
export function useWorldClockActions() {
  const qc = useQueryClient();
  const qk = queryKeys.gameState.global;

  const patchLocal = useCallback(
    (patch: Partial<GameStateRow>) => qc.setQueryData<GameStateRow | null>(qk, (old) => (old ? { ...old, ...patch } : old)),
    [qc, qk],
  );

  const salvarEstado = useCallback(
    async (patch: Partial<GameStateRow>) => {
      patchLocal(patch);
      const gs = await lerEstado();
      const { error } = await supabase.from('game_state').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', gs.id);
      if (error) throw error;
    },
    [patchLocal],
  );

  // Recarrega relógio e heróis (fome/cansaço mudam junto com o tempo)
  const refresh = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: qk }),
      qc.invalidateQueries({ queryKey: queryKeys.heroes.all }),
      qc.invalidateQueries({ queryKey: ['heroes'] }),
    ]);
  }, [qc, qk]);

  return useMemo(
    () => ({
      avancar: async (min: number, motivo: string) => {
        // Grava antes o que o relógio já andou sozinho
        await commitPendente();
        const r = await avancarTempo(min, motivo);
        await refresh();
        return r;
      },
      descansar: async (tipo: TipoDescanso) => {
        await commitPendente();
        const r = await descansarGrupo(tipo);
        await refresh();
        return r;
      },
      alimentar: async (pontos: number, heroId?: string) => {
        await alimentar(pontos, heroId);
        await refresh();
      },
      tocar: async () => salvarEstado({ relogio_correndo: true, relogio_ultimo_tick: new Date().toISOString() }),
      pausar: async () => {
        await commitPendente();
        await salvarEstado({ relogio_correndo: false });
      },
      velocidade: async (escala: number) => {
        await commitPendente();
        await salvarEstado({ relogio_escala: escala, relogio_ultimo_tick: new Date().toISOString() });
      },
      abrigar: (v: boolean) => salvarEstado({ grupo_abrigado: v }),
      clima: (c: string) => salvarEstado({ clima: c }),
      definirData: async (ano: number, mes: number, dia: number, hora: number, minuto = 0) => {
        const m = Number(dataParaMinutos(ano, mes, dia, hora, minuto));
        await salvarEstado({ mundo_minutos: m, relogio_ultimo_tick: new Date().toISOString(), clima_dia: Math.floor(m / 1440) });
        await registrar(m, `O Mestre ajustou a data para ${minutosParaData(m).dia} de ${minutosParaData(m).nomeMes}, Ano ${ano}`, 'tempo');
      },
    }),
    [refresh, salvarEstado],
  );
}

/** Grava os minutos que o relógio andou sozinho desde o último tick. */
async function commitPendente() {
  const gs = await lerEstado();
  const pend = minutosPendentes(gs);
  if (pend < 1) return null;
  const escala = Number(gs.relogio_escala || 1);
  // Avança o tick só pelo tempo real consumido, sem perder frações.
  const novoTick = new Date(new Date(gs.relogio_ultimo_tick as string).getTime() + (pend * 60_000) / escala).toISOString();
  return avancarTempo(pend, 'relógio', { tickBase: gs.relogio_ultimo_tick, novoTick });
}

/**
 * Motor do relógio: roda só na tela do Mestre. A cada 20 s grava o tempo que
 * passou (se o relógio estiver correndo e fora de combate).
 */
export function useClockTicker(enabled: boolean) {
  const qc = useQueryClient();
  const busy = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    const run = async () => {
      if (busy.current || document.hidden) return;
      busy.current = true;
      try {
        const r = await commitPendente();
        if (r) await qc.invalidateQueries({ queryKey: queryKeys.gameState.global });
      } catch (err) {
        console.warn('[relógio] tick falhou', err);
      } finally {
        busy.current = false;
      }
    };
    const t = setInterval(run, 20_000);
    void run();
    return () => clearInterval(t);
  }, [enabled, qc]);
}
