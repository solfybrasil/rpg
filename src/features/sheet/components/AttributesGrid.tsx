import { m } from 'motion/react';
import React from 'react';
import type { HeroAttributes } from '../../../entities/hero';
import { spring } from '../../../shared/styles/motion';
import { AttrSlab } from '../../../shared/ui/AttrSlab';

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
  const maxVal = Math.max(
    ...ATTRIBUTES_CONFIG.map((a) => Number((attrs as Record<string, number>)[a.key] ?? 0)),
  );

  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
      {ATTRIBUTES_CONFIG.map((attr) => {
        const val = Number((attrs as Record<string, number>)[attr.key] ?? 0);
        const score = 10 + val;
        const isHighest = maxVal > 0 && val === maxVal;

        return (
          <m.div
            key={`${attr.key}-${val}`}
            initial={{ scale: 0.97 }}
            animate={{ scale: 1 }}
            transition={spring.soft}
          >
            <AttrSlab
              name={attr.label}
              value={score}
              modifier={val}
              highlight={isHighest}
              title={`${attr.label}: ${attr.description}`}
            />
          </m.div>
        );
      })}
    </section>
  );
};
