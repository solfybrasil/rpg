import React from 'react';
import type { HeroAttributes } from '../../../entities/hero';

interface AttributesGridProps {
  attributes?: HeroAttributes | Record<string, number> | null;
}

interface AttributeMeta {
  key: string;
  label: string;
  description: string;
}

const ATTRIBUTES_CONFIG: AttributeMeta[] = [
  {
    key: 'corpo',
    label: 'Corpo',
    description: 'Vigor físico, atletismo, combate corpo a corpo e resistência biológica.',
  },
  {
    key: 'vontade',
    label: 'Vontade',
    description: 'Firmeza de propósito, coragem mental e integridade do Juramento.',
  },
  {
    key: 'astucia',
    label: 'Astúcia',
    description: 'Percepção tática, reflexos ágeis, sobrevivência e inteligência prática.',
  },
  {
    key: 'presenca',
    label: 'Presença',
    description: 'Magnetismo de liderança, intimidação, persuasão e autoridade solene.',
  },
];

export const AttributesGrid: React.FC<AttributesGridProps> = ({ attributes }) => {
  const attrs = attributes || { corpo: 0, vontade: 0, astucia: 0, presenca: 0 };

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {ATTRIBUTES_CONFIG.map((attr) => {
        const val = Number((attrs as Record<string, number>)[attr.key] ?? 0);
        const signed = val > 0 ? `+${val}` : `${val}`;

        return (
          <div
            key={attr.key}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--line)] shadow-md hover:border-[var(--line-strong)] transition-all group relative overflow-hidden"
            title={`${attr.label}: ${attr.description}`}
          >
            {/* Background glowing flare */}
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--surface)] to-transparent pointer-events-none opacity-50" />

            {/* Big number in Cinzel 32 */}
            <span
              className={`text-[32px] font-cinzel font-bold leading-tight tabular-nums transition-transform duration-200 group-hover:scale-105 ${
                val > 0
                  ? 'text-[var(--gold-bright)]'
                  : val < 0
                  ? 'text-red-400'
                  : 'text-[var(--text)]'
              }`}
            >
              {signed}
            </span>

            {/* Label in small Inter */}
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-3)] mt-1 font-sans">
              {attr.label}
            </span>
          </div>
        );
      })}
    </section>
  );
};
