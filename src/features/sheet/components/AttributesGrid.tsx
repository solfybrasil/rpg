import React from 'react';
import type { HeroAttributes } from '../../../entities/hero';
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

  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
      {ATTRIBUTES_CONFIG.map((attr) => {
        const val = Number((attrs as Record<string, number>)[attr.key] ?? 0);
        // Em Peste do Juramento, o atributo base é calculado em torno de 10 + mod ou o próprio mod
        const score = 10 + val;

        return (
          <AttrSlab
            key={attr.key}
            name={attr.label}
            value={score}
            modifier={val}
            title={`${attr.label}: ${attr.description}`}
          />
        );
      })}
    </section>
  );
};
