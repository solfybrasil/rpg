import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Sparkles,
  Search,
  X,
  Clock,
  Check,
  Flame,
  Skull,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useHero, useHeroes } from '../../../shared/hooks/baseHooks';
import { useSessionStore } from '../../../shared/stores/session';
import {
  fetchMagiasCatalogo,
  fetchMagiasAfinidade,
  fetchHeroiMagias,
  magiaInvestirRPC,
  subscribeToHeroiMagiasRealtime,
} from '../api';
import type { Spell, SpellCheckStatus } from '../types';
import { SpellCard, FONTE_CORES } from './SpellCard';
import { SpellInspectModal } from './SpellInspectModal';
import { SpellCastModal } from './SpellCastModal';

export const PlayerGrimoireView: React.FC = () => {
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const heroId = sessionHeroId || 'teste_1';

  const { hero: directHero, updateHeroAsync, isLoading: isLoadingHero } = useHero(heroId);
  const { heroes, isLoading: isLoadingHeroes } = useHeroes();
  const hero = directHero || heroes[0] || null;

  // Subtab: "minhas" or "aprender"
  const [subTab, setSubTab] = useState<'minhas' | 'aprender'>('minhas');

  // Catalogs and Relations
  const [catalogo, setCatalogo] = useState<Spell[]>([]);
  const [afinidades, setAfinidades] = useState<any[]>([]);
  const [heroiMagias, setHeroiMagias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination for learn tab
  const [displayCount, setDisplayCount] = useState(40);

  // Filters for "Minhas Magias"
  const [searchMinhas, setSearchMinhas] = useState('');
  const [filtroCirculoMinhas, setFiltroCirculoMinhas] = useState('todos');
  const [filtroFonteMinhas, setFiltroFonteMinhas] = useState('todas');

  // Filters for "Aprender"
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroFonte, setFiltroFonte] = useState('todas');
  const [filtroEscola, setFiltroEscola] = useState('todas');
  const [filtroCirculo, setFiltroCirculo] = useState('todos');
  const [soPodeAprender, setSoPodeAprender] = useState(false);
  const [apenasEmEstudo, setApenasEmEstudo] = useState(false);

  // Modals
  const [inspectMagia, setInspectMagia] = useState<Spell | null>(null);
  const [castModalMagia, setCastModalMagia] = useState<Spell | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!hero?.id) return;
    try {
      setLoading(true);
      const [cats, afins, hMags] = await Promise.all([
        fetchMagiasCatalogo(),
        fetchMagiasAfinidade(),
        fetchHeroiMagias(hero.id),
      ]);
      setCatalogo((cats || []) as Spell[]);
      setAfinidades(afins || []);
      setHeroiMagias(hMags || []);
    } catch (err) {
      console.error('[Grimorio] Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [hero?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription
  useEffect(() => {
    if (!hero?.id) return;
    const unsub = subscribeToHeroiMagiasRealtime(() => {
      fetchHeroiMagias(hero.id).then((hMags) => {
        if (hMags) setHeroiMagias(hMags);
      });
    }, hero.id);
    return () => unsub?.();
  }, [hero?.id]);

  // Character Vitals
  const heroVontade = Number(hero?.attributes?.vontade ?? hero?.attributes?.VON ?? 0);
  const focusAtual = Number(hero?.focus ?? 0);
  const focusMax = Number(hero?.max_focus ?? hero?.maxFocus ?? 3);
  const inspiracaoAtual = Number(hero?.inspiration ?? hero?.inspiracao ?? 0);
  const inspiracaoMax = Number(hero?.inspiration_max ?? hero?.inspiracao_max ?? 3);
  const heroLevel = Number(hero?.level ?? 1);
  const heroCaminho = ((hero?.caminho as string) || '').toLowerCase();

  // Affinities
  const heroFontesAfinidade = useMemo(() => {
    if (!heroCaminho || !afinidades.length) return new Set<string>();
    const set = new Set<string>();
    afinidades.forEach((af) => {
      if ((af.caminho || '').toLowerCase() === heroCaminho) {
        set.add(af.fonte);
      }
    });
    return set;
  }, [afinidades, heroCaminho]);

  // Hero Spells Map
  const heroMagiasMap = useMemo(() => {
    const map = new Map<string | number, any>();
    heroiMagias.forEach((hm) => {
      map.set(hm.magia_id, hm);
    });
    return map;
  }, [heroiMagias]);

  // Known schools by circle
  const escolasConhecidasSet = useMemo(() => {
    const set = new Set<string>();
    heroiMagias.forEach((h) => {
      if (!h.aprendida) return;
      const mg = h.magias || catalogo.find((m) => m.id === h.magia_id);
      if (mg?.escola && mg.circulo != null) {
        set.add(`${mg.escola}_${mg.circulo}`);
      }
    });
    return set;
  }, [heroiMagias, catalogo]);

  // Learned Spells
  const todasMagiasAprendidas = useMemo(() => {
    const list: Spell[] = [];
    heroiMagias.forEach((hm) => {
      if (hm.aprendida) {
        const magia = hm.magias || catalogo.find((m) => m.id === hm.magia_id);
        if (magia) {
          list.push({ ...magia, hm });
        }
      }
    });
    // Fallback: if no spells learned yet, provide default circle 0 cantrips
    if (list.length === 0 && catalogo.length > 0) {
      const cantrips = catalogo.filter((m) => Number(m.circulo) === 0).slice(0, 4);
      return cantrips;
    }
    list.sort((a, b) => (Number(a.circulo) - Number(b.circulo)) || a.nome.localeCompare(b.nome));
    return list;
  }, [heroiMagias, catalogo]);

  // Spells currently being studied (marks > 0 but not fully learned)
  const magiasEmEstudo = useMemo(() => {
    const list: Spell[] = [];
    heroiMagias.forEach((hm) => {
      if (!hm.aprendida && (hm.marcas > 0 || hm.liberada_pelo_mestre)) {
        const magia = hm.magias || catalogo.find((m) => m.id === hm.magia_id);
        if (magia) {
          list.push({ ...magia, hm });
        }
      }
    });
    list.sort((a, b) => (Number(a.circulo) - Number(b.circulo)) || a.nome.localeCompare(b.nome));
    return list;
  }, [heroiMagias, catalogo]);

  // Filtered known spells
  const magiasConhecidasFiltradas = useMemo(() => {
    const q = searchMinhas.trim().toLowerCase();
    return todasMagiasAprendidas.filter((mag) => {
      if (filtroCirculoMinhas !== 'todos' && String(mag.circulo) !== filtroCirculoMinhas) return false;
      if (filtroFonteMinhas !== 'todas' && mag.fonte !== filtroFonteMinhas) return false;
      if (q) {
        const matchNome = mag.nome?.toLowerCase().includes(q);
        const matchResumo = mag.resumo?.toLowerCase().includes(q);
        const matchEscola = mag.escola?.toLowerCase().includes(q);
        if (!matchNome && !matchResumo && !matchEscola) return false;
      }
      return true;
    });
  }, [todasMagiasAprendidas, searchMinhas, filtroCirculoMinhas, filtroFonteMinhas]);

  // Grouped by circle
  const magiasConhecidasPorCirculo = useMemo(() => {
    const grupos: Record<number, Spell[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    magiasConhecidasFiltradas.forEach((mag) => {
      const circ = Number(mag.circulo ?? 0);
      if (!grupos[circ]) grupos[circ] = [];
      grupos[circ].push(mag);
    });
    return grupos;
  }, [magiasConhecidasFiltradas]);

  // Unique schools for filter
  const escolasUnicas = useMemo(() => {
    const s = new Set<string>();
    catalogo.forEach((m) => {
      if (m.escola) s.add(m.escola);
    });
    return Array.from(s).sort();
  }, [catalogo]);

  // Check learn status for catalog
  const checkStatusAprender = useCallback(
    (magia: Spell): SpellCheckStatus => {
      const hm = heroMagiasMap.get(magia.id);
      if (hm?.aprendida) return { pode: false, statusText: 'Já aprendida', jaAprendida: true };

      let custo = Number(magia.custo_inspiracao || 1);
      if (magia.fonte !== 'Peste' && !heroFontesAfinidade.has(magia.fonte as string)) {
        custo += 2;
      }

      if (heroLevel < (magia.nivel_min || 1)) {
        return { pode: false, statusText: `Requer Nível ${magia.nivel_min}`, custo, hm };
      }

      if (Number(magia.circulo) >= 2) {
        const circuloAnterior = Number(magia.circulo) - 1;
        const conheceMesmaEscola = escolasConhecidasSet.has(`${magia.escola}_${circuloAnterior}`);
        if (!conheceMesmaEscola) {
          return {
            pode: false,
            statusText: `Requer ${magia.escola} Círc ${circuloAnterior}`,
            custo,
            hm,
          };
        }
      }

      if ((magia.raridade === 'Raro' || magia.raridade === 'Lendário') && !hm?.liberada_pelo_mestre) {
        return { pode: false, statusText: 'Requer bênção do Confessor', custo, hm };
      }

      return { pode: true, statusText: 'Disponível para estudo', custo, hm };
    },
    [heroMagiasMap, heroFontesAfinidade, heroLevel, escolasConhecidasSet],
  );

  // Spells to learn filtered
  const magiasParaAprender = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const result: Array<{ magia: Spell; avaliacao: SpellCheckStatus }> = [];

    for (const mag of catalogo) {
      if (Number(mag.circulo) === 0) continue;

      if (filtroFonte !== 'todas' && mag.fonte !== filtroFonte) continue;
      if (filtroEscola !== 'todas' && mag.escola !== filtroEscola) continue;
      if (filtroCirculo !== 'todos' && String(mag.circulo) !== filtroCirculo) continue;

      const hm = heroMagiasMap.get(mag.id);
      if (apenasEmEstudo && !(hm?.marcas > 0 || hm?.liberada_pelo_mestre)) continue;

      if (q) {
        const matchNome = mag.nome?.toLowerCase().includes(q);
        const matchResumo = mag.resumo?.toLowerCase().includes(q);
        const matchEscola = mag.escola?.toLowerCase().includes(q);
        if (!matchNome && !matchResumo && !matchEscola) continue;
      }

      const avaliacao = checkStatusAprender(mag);
      if (soPodeAprender && !avaliacao.pode) continue;

      result.push({ magia: mag, avaliacao });
    }

    return result;
  }, [
    catalogo,
    searchTerm,
    filtroFonte,
    filtroEscola,
    filtroCirculo,
    soPodeAprender,
    apenasEmEstudo,
    heroMagiasMap,
    checkStatusAprender,
  ]);

  // Action: Invest 1 Inspiration
  const handleInvestir = async (magia: Spell) => {
    if (!hero?.id) return;
    if (inspiracaoAtual <= 0) {
      toast.error('Você não tem Inspiração disponível para investir.');
      return;
    }
    try {
      const res = await magiaInvestirRPC(hero.id, String(magia.id));
      toast.success(
        res?.aprendida
          ? `✦ Você dominou ${magia.nome}!`
          : `✦ Marca investida em ${magia.nome}!`,
      );
      if (updateHeroAsync) {
        await updateHeroAsync({
          inspiration: Math.max(0, inspiracaoAtual - 1),
        });
      }
      const freshHeroMagias = await fetchHeroiMagias(hero.id);
      setHeroiMagias(freshHeroMagias);
    } catch (err) {
      toast.error(`Não foi possível investir: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  };

  if (isLoadingHero || !hero) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <span className="text-xs uppercase font-cinzel text-[var(--gold-dim)] tracking-widest">
            Abrindo Grimório de Aldrenor...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* 1. Header & Vitals Banner */}
      <section className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div>
          <span className="text-[10px] font-cinzel uppercase text-[var(--gold-dim)] tracking-widest">
            Compêndio Místico de Aldrenor
          </span>
          <h1 className="font-cinzel font-bold text-2xl text-[var(--text-1)] mt-0.5">
            Grimório de {hero.name}
          </h1>
          <p className="text-xs text-[var(--text-3)] font-cinzel mt-1">
            {hero.title || 'Jurado'} • Nível {heroLevel} • Caminho: <strong className="text-[var(--text-2)]">{hero.caminho || 'Geral'}</strong> • Vontade: <strong className="text-[var(--gold)]">+{heroVontade}</strong>
          </p>
        </div>

        {/* Vitals: Focus & Inspiration */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Foco Card */}
          <div className="px-3.5 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] flex flex-col">
            <span className="text-[9px] uppercase font-cinzel text-sky-400 font-bold tracking-wider">
              Foco Arcano
            </span>
            <div className="font-mono text-base font-bold text-sky-300 flex items-baseline gap-1 mt-0.5">
              <span>{focusAtual}</span>
              <span className="text-xs text-sky-600 font-normal">/ {focusMax}</span>
            </div>
          </div>

          {/* Inspiração Seals */}
          <div className="px-3.5 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] flex flex-col">
            <span className="text-[9px] uppercase font-cinzel text-[var(--gold)] font-bold tracking-wider">
              Inspiração ({inspiracaoAtual}/{inspiracaoMax})
            </span>
            <div className="flex items-center gap-1.5 mt-1.5">
              {Array.from({ length: Math.max(3, inspiracaoMax) }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border transition-all ${
                    i < inspiracaoAtual
                      ? 'bg-[var(--gold)] border-[var(--gold-bright)] shadow-[0_0_6px_rgba(201,169,97,0.6)]'
                      : 'bg-black/60 border-zinc-700'
                  }`}
                  title={i < inspiracaoAtual ? 'Inspiração Disponível' : 'Lacre Vazio'}
                />
              ))}
            </div>
          </div>

          {/* Afinidades Pills */}
          <div className="px-3.5 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] flex flex-col">
            <span className="text-[9px] uppercase font-cinzel text-[var(--text-3)] font-bold tracking-wider">
              Afinidades
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              {heroFontesAfinidade.size > 0 ? (
                Array.from(heroFontesAfinidade).map((f) => (
                  <span
                    key={f}
                    className="px-2 py-0.5 rounded text-[10px] font-cinzel border"
                    style={{
                      borderColor: FONTE_CORES[f] || 'rgba(201,169,97,0.4)',
                      color: FONTE_CORES[f] || '#c9a961',
                    }}
                  >
                    {f}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-[var(--text-3)] font-cinzel">Padrão</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Sub-Tabs */}
      <nav className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <button
          type="button"
          onClick={() => setSubTab('minhas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-cinzel text-xs font-semibold transition-colors cursor-pointer ${
            subTab === 'minhas'
              ? 'bg-[var(--gold)] text-black shadow-sm'
              : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--card)]'
          }`}
        >
          <BookOpen size={14} />
          <span>Minhas Magias</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-[var(--gold)] border border-black/20">
            {todasMagiasAprendidas.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('aprender')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-cinzel text-xs font-semibold transition-colors cursor-pointer ${
            subTab === 'aprender'
              ? 'bg-[var(--gold)] text-black shadow-sm'
              : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--card)]'
          }`}
        >
          <Sparkles size={14} />
          <span>Aprender Novas Magias</span>
          {magiasEmEstudo.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950 text-amber-300 border border-amber-800">
              {magiasEmEstudo.length} em estudo
            </span>
          )}
        </button>
      </nav>

      {/* 3. SUB-TAB: MINHAS MAGIAS */}
      {subTab === 'minhas' && (
        <div className="flex flex-col gap-6">
          {/* Em Estudo Section */}
          {magiasEmEstudo.length > 0 && (
            <section className="p-4 rounded-xl bg-amber-950/10 border border-amber-800/30 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 font-cinzel font-semibold text-xs">
                  <Clock size={15} />
                  <span>Estudos Místicos em Andamento ({magiasEmEstudo.length})</span>
                </div>
                <span className="text-[11px] text-[var(--text-3)] font-cinzel">
                  Invista Inspiração para dominar a fórmula
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {magiasEmEstudo.map((mag) => {
                  const marcas = mag.hm?.marcas || 0;
                  const custo = mag.custo_inspiracao || 1;
                  return (
                    <div
                      key={mag.id}
                      className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between gap-3"
                    >
                      <div>
                        <h4
                          onClick={() => setInspectMagia(mag)}
                          className="font-cinzel font-semibold text-xs text-[var(--text-1)] hover:text-[var(--gold)] cursor-pointer"
                        >
                          {mag.nome}
                        </h4>
                        <span className="text-[10px] text-[var(--text-3)] font-cinzel">
                          {mag.fonte} • {mag.escola} • Círc {mag.circulo}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {Array.from({ length: custo }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-2.5 h-2.5 rounded-full ${
                                i < marcas ? 'bg-[var(--gold)]' : 'bg-black/60 border border-zinc-700'
                              }`}
                            />
                          ))}
                          <span className="text-[10px] text-[var(--text-3)] font-mono ml-1">
                            {marcas}/{custo}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleInvestir(mag)}
                        disabled={inspiracaoAtual <= 0}
                        className="px-2.5 py-1.5 rounded bg-[var(--card)] hover:bg-[var(--gold)] hover:text-black border border-[var(--gold-dim)] text-[var(--gold)] text-xs font-cinzel transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles size={11} />
                        <span>Investir 1 Insp</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Filter Bar */}
          <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
              <input
                type="text"
                placeholder="Buscar magias aprendidas por nome, escola ou efeito..."
                value={searchMinhas}
                onChange={(e) => setSearchMinhas(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-hidden focus:border-[var(--gold-dim)]"
              />
              {searchMinhas && (
                <button
                  type="button"
                  onClick={() => setSearchMinhas('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)]"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Circle Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {['todos', '0', '1', '2', '3', '4'].map((circ) => (
                <button
                  key={circ}
                  type="button"
                  onClick={() => setFiltroCirculoMinhas(circ)}
                  className={`px-2.5 py-1 rounded text-xs font-cinzel font-semibold transition-colors shrink-0 cursor-pointer ${
                    filtroCirculoMinhas === circ
                      ? 'bg-[var(--gold)] text-black'
                      : 'bg-[var(--card)] text-[var(--text-3)] hover:text-[var(--text-1)] border border-[var(--border)]'
                  }`}
                >
                  {circ === 'todos' ? 'Todos' : circ === '0' ? 'Truques' : `Círc ${circ}`}
                </button>
              ))}
            </div>

            {/* Source Select */}
            <select
              value={filtroFonteMinhas}
              onChange={(e) => setFiltroFonteMinhas(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--text-2)] outline-hidden font-cinzel"
            >
              <option value="todas">Todas as Fontes</option>
              <option value="Fogo">Fogo</option>
              <option value="Som">Som</option>
              <option value="Sangue">Sangue</option>
              <option value="Sombra">Sombra</option>
              <option value="Luz">Luz</option>
              <option value="Peste">Peste</option>
              <option value="Arcana">Arcana</option>
            </select>
          </section>

          {/* Grouped by Circle */}
          {[0, 1, 2, 3, 4].map((circulo) => {
            const magiasDoCirculo = magiasConhecidasPorCirculo[circulo] || [];
            if (magiasDoCirculo.length === 0) return null;

            return (
              <section key={circulo} className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
                  <h3 className="font-cinzel font-bold text-sm text-[var(--gold)] tracking-wide">
                    {circulo === 0 ? 'Círculo 0 • Truques Inatos' : `Círculo ${circulo}`}
                  </h3>
                  <span className="text-[11px] text-[var(--text-3)] font-cinzel">
                    {magiasDoCirculo.length} {magiasDoCirculo.length === 1 ? 'fórmula' : 'fórmulas'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {magiasDoCirculo.map((mag) => (
                    <SpellCard
                      key={mag.id}
                      magia={mag}
                      mode="known"
                      onInspect={() => setInspectMagia(mag)}
                      onCast={() => setCastModalMagia(mag)}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {magiasConhecidasFiltradas.length === 0 && (
            <div className="p-8 text-center border border-dashed border-[var(--border)] rounded-xl text-xs text-[var(--text-3)] font-cinzel">
              Nenhuma magia encontrada com os filtros selecionados.
            </div>
          )}
        </div>
      )}

      {/* 4. SUB-TAB: APRENDER NOVAS MAGIAS */}
      {subTab === 'aprender' && (
        <div className="flex flex-col gap-5">
          {/* Filters */}
          <section className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                <input
                  type="text"
                  placeholder="Pesquisar catálogo arcano..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-hidden focus:border-[var(--gold-dim)]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)]"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Circle Filter */}
              <select
                value={filtroCirculo}
                onChange={(e) => setFiltroCirculo(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--text-2)] outline-hidden font-cinzel"
              >
                <option value="todos">Todos os Círculos</option>
                <option value="1">Círculo 1</option>
                <option value="2">Círculo 2</option>
                <option value="3">Círculo 3</option>
                <option value="4">Círculo 4</option>
              </select>

              {/* Source Filter */}
              <select
                value={filtroFonte}
                onChange={(e) => setFiltroFonte(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--text-2)] outline-hidden font-cinzel"
              >
                <option value="todas">Todas as Fontes</option>
                <option value="Fogo">Fogo</option>
                <option value="Som">Som</option>
                <option value="Sangue">Sangue</option>
                <option value="Sombra">Sombra</option>
                <option value="Luz">Luz</option>
                <option value="Peste">Peste</option>
                <option value="Arcana">Arcana</option>
              </select>

              {/* School Filter */}
              <select
                value={filtroEscola}
                onChange={(e) => setFiltroEscola(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--text-2)] outline-hidden font-cinzel"
              >
                <option value="todas">Todas as Escolas</option>
                {escolasUnicas.map((esc) => (
                  <option key={esc} value={esc}>{esc}</option>
                ))}
              </select>
            </div>

            {/* Row 2: Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[var(--border)]/60">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSoPodeAprender((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-cinzel transition-colors cursor-pointer ${
                    soPodeAprender
                      ? 'bg-[var(--gold)] text-black font-semibold'
                      : 'bg-[var(--card)] text-[var(--text-3)] border border-[var(--border)]'
                  }`}
                >
                  <Check size={11} />
                  <span>Apenas Disponíveis para Estudo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setApenasEmEstudo((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-cinzel transition-colors cursor-pointer ${
                    apenasEmEstudo
                      ? 'bg-[var(--gold)] text-black font-semibold'
                      : 'bg-[var(--card)] text-[var(--text-3)] border border-[var(--border)]'
                  }`}
                >
                  <Clock size={11} />
                  <span>Apenas em Estudo</span>
                </button>
              </div>

              <span className="text-[11px] text-[var(--text-3)] font-cinzel">
                Exibindo {Math.min(displayCount, magiasParaAprender.length)} de {magiasParaAprender.length} fórmulas
              </span>
            </div>
          </section>

          {/* Grid of Spells */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {magiasParaAprender.slice(0, displayCount).map(({ magia, avaliacao }) => (
              <SpellCard
                key={magia.id}
                magia={magia}
                mode="learn"
                avaliacao={avaliacao}
                inspiracaoAtual={inspiracaoAtual}
                onInspect={() => setInspectMagia(magia)}
                onInvest={() => handleInvestir(magia)}
              />
            ))}
          </div>

          {/* Show more button */}
          {magiasParaAprender.length > displayCount && (
            <div className="text-center py-2">
              <button
                type="button"
                onClick={() => setDisplayCount((prev) => prev + 40)}
                className="px-5 py-2 rounded-lg bg-[var(--surface)] border border-[var(--gold-dim)] text-[var(--gold)] font-cinzel text-xs font-semibold hover:border-[var(--gold)] transition-colors cursor-pointer"
              >
                Mostrar Mais Fórmulas ({magiasParaAprender.length - displayCount} restantes)
              </button>
            </div>
          )}

          {magiasParaAprender.length === 0 && (
            <div className="p-8 text-center border border-dashed border-[var(--border)] rounded-xl text-xs text-[var(--text-3)] font-cinzel">
              Nenhuma fórmula encontrada com os filtros selecionados.
            </div>
          )}
        </div>
      )}

      {/* Inspect Modal */}
      {inspectMagia && (
        <SpellInspectModal
          magia={inspectMagia}
          onClose={() => setInspectMagia(null)}
          onCastFromInspect={() => {
            setCastModalMagia(inspectMagia);
            setInspectMagia(null);
          }}
        />
      )}

      {/* Cast Modal */}
      {castModalMagia && hero && (
        <SpellCastModal
          magia={castModalMagia}
          hero={{
            id: hero.id,
            name: hero.name,
            focus: focusAtual,
            max_focus: focusMax,
            hp_current: hero.hp_current,
            plague: hero.plague,
            attributes: hero.attributes as Record<string, number>,
            conditions: (hero.conditions as any) || [],
            inspiration: inspiracaoAtual,
          }}
          onClose={() => setCastModalMagia(null)}
          onSuccess={() => {
            loadData();
          }}
          updateHeroAsync={updateHeroAsync}
        />
      )}
    </main>
  );
};
