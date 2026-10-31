import { describe, expect, it } from 'vitest';
import type { GrimorioSpell } from '../features/grimoire/api';

describe('DM Grimoire Engine & Catalog Filtering', () => {
  const mockSpells: GrimorioSpell[] = [
    {
      id: 1,
      nome: 'Mãos Flamejantes',
      circulo: 1,
      escola: 'Evocação',
      fonte: 'Fogo',
      raridade: 'Comum',
      resumo: 'Dispara um leque de chamas incandescentes que incinera alvos.',
      custo_foco: 1,
      revisar_mestre: false,
      efeitos: [{ bloco: 'dano', valor: '2d6', tipo: 'fogo' }],
    },
    {
      id: 2,
      nome: 'Sopro da Peste',
      circulo: 2,
      escola: 'Necromancia',
      fonte: 'Peste',
      raridade: 'Incomum',
      resumo: 'Libera miasma pestilento que infecta e enfraquece a carne.',
      custo_foco: 2,
      revisar_mestre: true,
      efeitos: [{ bloco: 'narrativo', texto: 'Inimigo tosse sangue e fica nauseado' }],
    },
    {
      id: 3,
      nome: 'Canção da Loucura',
      circulo: 0,
      escola: 'Ilusão',
      fonte: 'Som',
      raridade: 'Comum',
      resumo: 'Acordes dissonantes que perturbam a concentração de oponentes.',
      custo_foco: 0,
      revisar_mestre: false,
      efeitos: [{ bloco: 'condicao', condicao: 'atordoado' }],
    },
    {
      id: 4,
      nome: 'Manto da Noite Perpétua',
      circulo: 4,
      escola: 'Abjuração',
      fonte: 'Sombra',
      raridade: 'Lendário',
      resumo: 'Dobra a escuridão absoluta e exige teste dramático de sanidade.',
      custo_foco: 4,
      revisar_mestre: true,
      efeitos: [{ bloco: 'narrativo', texto: 'Zona onde luz natural extingue-se' }],
    },
  ];

  it('filtra magias por termo de busca em nome e resumo', () => {
    const filterByTerm = (spells: GrimorioSpell[], q: string) => {
      const term = q.trim().toLowerCase();
      if (!term) return spells;
      return spells.filter(
        (s) => s.nome.toLowerCase().includes(term) || s.resumo?.toLowerCase().includes(term),
      );
    };

    expect(filterByTerm(mockSpells, 'flamejantes')).toHaveLength(1);
    expect(filterByTerm(mockSpells, 'flamejantes')[0].id).toBe(1);
    expect(filterByTerm(mockSpells, 'miasma')).toHaveLength(1);
    expect(filterByTerm(mockSpells, 'inexistente')).toHaveLength(0);
  });

  it('filtra magias por Círculo e Fonte/Escola', () => {
    const filterCircleAndSchool = (spells: GrimorioSpell[], circulo: string, fonte: string) => {
      return spells.filter((s) => {
        if (circulo !== 'todos' && String(s.circulo) !== circulo) return false;
        if (fonte !== 'todas' && s.fonte !== fonte) return false;
        return true;
      });
    };

    const circulo1 = filterCircleAndSchool(mockSpells, '1', 'todas');
    expect(circulo1).toHaveLength(1);
    expect(circulo1[0].nome).toBe('Mãos Flamejantes');

    const fogoSpells = filterCircleAndSchool(mockSpells, 'todos', 'Fogo');
    expect(fogoSpells).toHaveLength(1);

    const circulo0Som = filterCircleAndSchool(mockSpells, '0', 'Som');
    expect(circulo0Som).toHaveLength(1);
  });

  it('identifica corretamente magias para a fila de arbitragem do Mestre (revisar_mestre ou narrativo)', () => {
    const getArbitrationSpells = (
      spells: GrimorioSpell[],
      filterType: 'todas' | 'revisar_mestre' | 'narrativo',
    ) => {
      return spells.filter((s) => {
        const hasRevisar = Boolean(s.revisar_mestre);
        const hasNarrativo =
          Array.isArray(s.efeitos) &&
          s.efeitos.some((e: unknown) => (e as Record<string, unknown>).bloco === 'narrativo');

        if (filterType === 'revisar_mestre') return hasRevisar;
        if (filterType === 'narrativo') return hasNarrativo;
        return hasRevisar || hasNarrativo;
      });
    };

    const pendingAll = getArbitrationSpells(mockSpells, 'todas');
    expect(pendingAll).toHaveLength(2); // IDs 2 e 4

    const onlyFlag = getArbitrationSpells(mockSpells, 'revisar_mestre');
    expect(onlyFlag).toHaveLength(2);

    const onlyNarrativo = getArbitrationSpells(mockSpells, 'narrativo');
    expect(onlyNarrativo).toHaveLength(2);
  });

  it('calcula progresso e categoriza aprendidas vs em estudo', () => {
    const heroMagias = [
      { character_id: 'kaelis_moonfire', magia_id: 1, marcas: 1, aprendida: true, gratis: true },
      {
        character_id: 'kaelis_moonfire',
        magia_id: 2,
        marcas: 2,
        aprendida: false,
        liberada_pelo_mestre: true,
      },
      {
        character_id: 'kaelis_moonfire',
        magia_id: 3,
        marcas: 0,
        aprendida: false,
        liberada_pelo_mestre: false,
      },
    ];

    const categorizeProgression = (spells: GrimorioSpell[], records: typeof heroMagias) => {
      const recordsMap = new Map(records.map((r) => [r.magia_id, r]));
      const aprendidas: GrimorioSpell[] = [];
      const emProgresso: GrimorioSpell[] = [];

      for (const spell of spells) {
        const record = recordsMap.get(Number(spell.id));
        if (!record) continue;
        if (record.aprendida) {
          aprendidas.push(spell);
        } else if (record.marcas > 0 || record.liberada_pelo_mestre) {
          emProgresso.push(spell);
        }
      }
      return { aprendidas, emProgresso };
    };

    const result = categorizeProgression(mockSpells, heroMagias);
    expect(result.aprendidas).toHaveLength(1);
    expect(result.aprendidas[0].nome).toBe('Mãos Flamejantes');
    expect(result.emProgresso).toHaveLength(1);
    expect(result.emProgresso[0].nome).toBe('Sopro da Peste');
  });

  it('ajusta inspiração respeitando os limites mínimo e máximo', () => {
    const adjustInspiration = (current: number, delta: number, max = 3) => {
      return Math.min(max, Math.max(0, current + delta));
    };

    expect(adjustInspiration(2, 1)).toBe(3);
    expect(adjustInspiration(3, 1)).toBe(3); // capped at 3
    expect(adjustInspiration(1, -1)).toBe(0);
    expect(adjustInspiration(0, -1)).toBe(0); // cannot be negative
  });
});
