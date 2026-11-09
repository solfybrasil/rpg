// =====================================================================
// FOME, CANSAÇO E DESCANSO — regra única do sistema
// Saciedade vai de 0 a 10 (inteiro). O tempo do mundo é contado em minutos.
// =====================================================================

/** A cada 4 horas do mundo a saciedade cai 1 ponto (6 por dia). */
export const FOME_INTERVALO_MIN = 240;
/** Horas acordado até ficar Exausto. */
export const HORAS_ATE_EXAUSTO = 18;
/** Horas faminto (saciedade 0) para perder 1 de Vida máxima. */
export const HORAS_FAMINTO_POR_VIDA = 24;

export type EstadoFomeChave = 'saciado' | 'alimentado' | 'fome' | 'faminto';

export interface EstadoFome {
  chave: EstadoFomeChave;
  nome: string;
  efeito: string;
  /** Cor (token CSS) do estado. */
  cor: string;
}

export function estadoFome(saciedade: number): EstadoFome {
  const s = Math.max(0, Math.min(10, Number(saciedade) || 0));
  if (s >= 7)
    return {
      chave: 'saciado',
      nome: 'Saciado',
      efeito: '+1 Foco no descanso curto',
      cor: 'var(--moss)',
    };
  if (s >= 4)
    return {
      chave: 'alimentado',
      nome: 'Alimentado',
      efeito: 'Pronto para a marcha',
      cor: 'var(--gold)',
    };
  if (s > 0)
    return {
      chave: 'fome',
      nome: 'Com fome',
      efeito: '−1 em testes de Corpo e Vontade',
      cor: 'var(--ember)',
    };
  return {
    chave: 'faminto',
    nome: 'Faminto',
    efeito: 'Sem cura natural · perde 1 Vida máx. por dia',
    cor: 'var(--blood)',
  };
}

/** Quantas marcas de `intervalo` minutos são cruzadas ao andar de `de` até `de + minutos`. */
export function marcasCruzadas(de: number, minutos: number, intervalo: number): number {
  if (minutos <= 0) return 0;
  return Math.floor((de + minutos) / intervalo) - Math.floor(de / intervalo);
}

/**
 * Pontos de saciedade perdidos numa passagem de tempo.
 * Usa marcas fixas do relógio (00h, 04h, 08h…) para ser determinístico:
 * avançar 2h + 2h dá o mesmo que avançar 4h.
 * Clima extremo (sem abrigo) soma 1 ponto a cada 8h → 1,5× mais fome.
 */
export function quedaDeFome(de: number, minutos: number, climaExtremo = false): number {
  const base = marcasCruzadas(de, minutos, FOME_INTERVALO_MIN);
  const extra = climaExtremo ? marcasCruzadas(de, minutos, FOME_INTERVALO_MIN * 2) : 0;
  return base + extra;
}

export interface HeroiTempo {
  saciedade?: number | null;
  horas_acordado?: number | null;
  horas_faminto?: number | null;
  vida_max_fome?: number | null;
  exausto?: boolean | null;
  health?: number | null;
  max_health?: number | null;
  focus?: number | null;
  max_focus?: number | null;
}

export interface PatchTempo {
  saciedade: number;
  horas_acordado: number;
  horas_faminto: number;
  vida_max_fome: number;
  exausto: boolean;
  health?: number;
}

/** Vida máxima efetiva, já descontando a perda por fome. */
export function vidaMaxEfetiva(h: HeroiTempo): number {
  const max = Number(h.max_health ?? 10);
  return Math.max(1, max - Number(h.vida_max_fome ?? 0));
}

/** Aplica a passagem do tempo a um herói (fome, cansaço, fome prolongada). */
export function aplicarPassagem(
  h: HeroiTempo,
  opts: { de: number; minutos: number; climaExtremo?: boolean; dormindo?: boolean },
): PatchTempo {
  const horas = marcasCruzadas(opts.de, opts.minutos, 60);
  const sac = Math.max(
    0,
    Number(h.saciedade ?? 8) - quedaDeFome(opts.de, opts.minutos, opts.climaExtremo),
  );

  const acordado = opts.dormindo ? 0 : Number(h.horas_acordado ?? 0) + horas;
  const faminto = sac <= 0 ? Number(h.horas_faminto ?? 0) + horas : 0;
  const max = Number(h.max_health ?? 10);
  const perdaFome =
    sac <= 0
      ? Math.min(max - 1, Math.floor(faminto / HORAS_FAMINTO_POR_VIDA))
      : Number(h.vida_max_fome ?? 0);

  const patch: PatchTempo = {
    saciedade: sac,
    horas_acordado: acordado,
    horas_faminto: faminto,
    vida_max_fome: Math.max(0, perdaFome),
    exausto: opts.dormindo ? false : Boolean(h.exausto) || acordado >= HORAS_ATE_EXAUSTO,
  };
  // A Vida atual não pode passar da máxima efetiva
  const teto = Math.max(1, max - patch.vida_max_fome);
  if (h.health != null && Number(h.health) > teto) patch.health = teto;
  return patch;
}

/** Comer: soma saciedade; sair da fome devolve a Vida máxima perdida. */
export function aplicarRefeicao(h: HeroiTempo, pontos: number) {
  const saciedade = Math.max(0, Math.min(10, Number(h.saciedade ?? 0) + pontos));
  return {
    saciedade,
    horas_faminto: saciedade > 0 ? 0 : Number(h.horas_faminto ?? 0),
    vida_max_fome: saciedade >= 4 ? 0 : Number(h.vida_max_fome ?? 0),
  };
}

export type TipoDescanso = 'curto' | 'longo';

export const DESCANSO_MINUTOS: Record<TipoDescanso, number> = { curto: 60, longo: 480 };

/**
 * Recuperação do descanso (depois de aplicar a passagem do tempo).
 * - Curto (1h): metade do Foco máx. (+1 se Saciado) e 2 de Vida.
 * - Longo (8h): Foco cheio, metade da Vida máx., zera cansaço e Exaustão.
 * Faminto não recupera Vida.
 */
export function aplicarDescanso(h: HeroiTempo, tipo: TipoDescanso) {
  const est = estadoFome(Number(h.saciedade ?? 0));
  const maxFoco = Number(h.max_focus ?? 3);
  const teto = vidaMaxEfetiva(h);
  const vida = Number(h.health ?? teto);
  const foco = Number(h.focus ?? 0);

  if (tipo === 'curto') {
    const ganhoFoco = Math.ceil(maxFoco / 2) + (est.chave === 'saciado' ? 1 : 0);
    const ganhoVida = est.chave === 'faminto' ? 0 : 2;
    return {
      focus: Math.min(maxFoco, foco + ganhoFoco),
      health: Math.min(teto, vida + ganhoVida),
    };
  }
  const ganhoVida = est.chave === 'faminto' ? 0 : Math.ceil(teto / 2);
  return {
    focus: maxFoco,
    health: Math.min(teto, vida + ganhoVida),
    horas_acordado: 0,
    exausto: false,
  };
}
