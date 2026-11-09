import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  type LucideIcon,
  Snowflake,
  Sun,
  ThermometerSun,
  Wind,
} from 'lucide-react';
import { useId } from 'react';
import type { DataMundo } from '../../../shared/lib/calendario';

/** Ícone e efeito de cada clima. */
export function climaInfo(clima: string): { icon: LucideIcon; efeito: string | null } {
  const c = (clima || '').toLowerCase();
  if (c.includes('nevasca')) return { icon: Snowflake, efeito: 'Fome 1,5× sem abrigo' };
  if (c.includes('calor')) return { icon: ThermometerSun, efeito: 'Fome 1,5× sem abrigo' };
  if (c.includes('neve') || c.includes('gelado')) return { icon: Snowflake, efeito: null };
  if (c.includes('tempestade')) return { icon: CloudLightning, efeito: null };
  if (c.includes('chuva fina')) return { icon: CloudDrizzle, efeito: null };
  if (c.includes('chuva')) return { icon: CloudRain, efeito: null };
  if (c.includes('neblina') || c.includes('névoa')) return { icon: CloudFog, efeito: null };
  if (c.includes('vento')) return { icon: Wind, efeito: null };
  if (c.includes('nublado')) return { icon: Cloud, efeito: null };
  return { icon: Sun, efeito: null };
}

/** Cores do céu por hora (madrugada → alvorada → dia → crepúsculo → noite). */
function sky(hora: number): [string, string] {
  if (hora < 5) return ['#070913', '#141b33'];
  if (hora < 7) return ['#2b1a2a', '#c9774a'];
  if (hora < 12) return ['#1f3550', '#7fa6cf'];
  if (hora < 14) return ['#2a4a6b', '#9fc1df'];
  if (hora < 18) return ['#2d3446', '#c99a5c'];
  if (hora < 20) return ['#2a1320', '#a3291f'];
  return ['#080a16', '#1c2443'];
}

/**
 * Mostrador em arco: o sol percorre o céu de 06h a 18h, a lua de 18h a 06h.
 * O fundo muda com a hora. Tamanho livre (o SVG escala).
 */
export function ClockDial({ data, size = 56, className = '' }: { data: DataMundo; size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  const minutoDia = data.hora * 60 + data.minuto;
  const dia = minutoDia >= 360 && minutoDia < 1080;
  // progresso 0..1 no arco do astro visível
  const p = dia ? (minutoDia - 360) / 720 : ((minutoDia + 360) % 1440) / 720;
  const ang = Math.PI * (1 - p); // 180° → 0°
  const cx = 50 + Math.cos(ang) * 38;
  const cy = 56 - Math.sin(ang) * 38;
  const [top, bottom] = sky(data.hora);
  const lua = data.faseLua;
  const luaSombra = lua.includes('nova') ? 1 : lua.includes('cheia') ? 0 : lua.includes('crescente') ? 0.45 : -0.45;

  return (
    <svg
      viewBox="0 0 100 64"
      width={size}
      height={(size * 64) / 100}
      className={className}
      role="img"
      aria-label={`${String(data.hora).padStart(2, '0')}:${String(data.minuto).padStart(2, '0')}, ${data.faseDia}`}
    >
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        <clipPath id={`arc${id}`}>
          <path d="M4 58 A46 46 0 0 1 96 58 Z" />
        </clipPath>
        <radialGradient id={`sun${id}`}>
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.5" stopColor="#ECD395" />
          <stop offset="1" stopColor="#C9A45C" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#arc${id})`}>
        <rect x="0" y="0" width="100" height="64" fill={`url(#sky${id})`} style={{ transition: 'fill 900ms' }} />
        {!dia &&
          [
            [20, 22],
            [34, 12],
            [62, 16],
            [78, 28],
            [48, 26],
            [86, 44],
            [14, 40],
          ].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#E7DCC6" opacity="0.7" />)}
        {/* trilha do astro */}
        <path d="M12 56 A38 38 0 0 1 88 56" fill="none" stroke="#ECD395" strokeOpacity="0.18" strokeDasharray="2 3" />
        {dia ? (
          <g style={{ transition: 'transform 900ms' }}>
            <circle cx={cx} cy={cy} r="12" fill={`url(#sun${id})`} />
            <circle cx={cx} cy={cy} r="5.5" fill="#ECD395" />
          </g>
        ) : (
          <g>
            <circle cx={cx} cy={cy} r="5.5" fill="#E7DCC6" />
            {luaSombra !== 0 && (
              <circle cx={cx + luaSombra * 4} cy={cy - 0.5} r="5.2" fill={top} opacity={Math.abs(luaSombra) === 1 ? 0.92 : 0.95} />
            )}
          </g>
        )}
      </g>
      {/* horizonte de pedra */}
      <rect x="0" y="56" width="100" height="8" fill="#151311" />
      <path d="M4 58 A46 46 0 0 1 96 58" fill="none" stroke="#6E5528" strokeWidth="1.5" />
      <line x1="0" y1="57" x2="100" y2="57" stroke="#3A342D" strokeWidth="1.5" />
    </svg>
  );
}

export function hhmm(d: DataMundo) {
  return `${String(d.hora).padStart(2, '0')}:${String(d.minuto).padStart(2, '0')}`;
}
