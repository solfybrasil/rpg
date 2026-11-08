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
import '../../../styles/features/PlayerGrimoire.css';

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
    <div className="grimoire-container">
      {/* 1. Header & Vitals Banner */}
      <div className="grimoire-vitals-banner">
        <div className="grimoire-hero-info">
          <span className="grimoire-kicker">
            Compêndio Místico de Aldrenor
          </span>
          <h1 className="grimoire-hero-title">
            Grimório de {hero.name}
          </h1>
          <p className="grimoire-hero-meta">
            {hero.title || 'Jurado'} • Nível {heroLevel} • Caminho: <strong>{hero.caminho || 'Geral'}</strong> • Vontade: <strong style={{ color: '#c9a961' }}>+{heroVontade}</strong>
          </p>
        </div>

        {/* Vitals: Focus & Inspiration */}
        <div className="grimoire-vitals-group">
          {/* Foco Card */}
          <div className="grimoire-vital-card">
            <span className="grimoire-vital-label" style={{ color: '#38bdf8' }}>
              Foco Arcano
            </span>
            <div className="grimoire-vital-value-focus">
              <span>{focusAtual}</span>
              <span className="grimoire-vital-denom"> / {focusMax}</span>
            </div>
          </div>

          {/* Inspiração Seals */}
          <div className="grimoire-vital-card">
            <span className="grimoire-vital-label" style={{ color: '#c9a961' }}>
              Inspiração ({inspiracaoAtual}/{inspiracaoMax})
            </span>
            <div className="grimoire-inspiration-seals">
              {Array.from({ length: Math.max(3, inspiracaoMax) }).map((_, i) => (
                <div
                  key={i}
                  className={`grimoire-seal-orb ${i < inspiracaoAtual ? 'filled' : ''}`}
                  title={i < inspiracaoAtual ? 'Inspiração Disponível' : 'Lacre Vazio'}
                />
              ))}
            </div>
          </div>

          {/* Afinidades Pills */}
          <div className="grimoire-vital-card grimoire-affinities-card">
            <span className="grimoire-vital-label">
              Afinidades
            </span>
            <div className="grimoire-affinities-pills">
              {heroFontesAfinidade.size > 0 ? (
                Array.from(heroFontesAfinidade).map((f) => (
                  <span
                    key={f}
                    className="grimoire-affinity-pill"
                    style={{
                      borderColor: FONTE_CORES[f] || 'rgba(201,169,97,0.4)',
                      color: FONTE_CORES[f] || '#c9a961',
                    }}
                  >
                    {f}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.68rem', color: '#9a917f' }}>Padrão</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sub-Tabs */}
      <div className="grimoire-tabs-bar">
        <button
          type="button"
          onClick={() => setSubTab('minhas')}
          className={`grimoire-tab-btn ${subTab === 'minhas' ? 'active' : ''}`}
        >
          <BookOpen size={14} />
          <span>Minhas Magias</span>
          <span className="grimoire-badge-count">
            {todasMagiasAprendidas.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('aprender')}
          className={`grimoire-tab-btn ${subTab === 'aprender' ? 'active' : ''}`}
        >
          <Sparkles size={14} />
          <span>Aprender Novas Magias</span>
          {magiasEmEstudo.length > 0 && (
            <span className="grimoire-badge-studying">
              {magiasEmEstudo.length} em estudo
            </span>
          )}
        </button>
      </div>

      {/* 3. SUB-TAB: MINHAS MAGIAS */}
      {subTab === 'minhas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Em Estudo Section */}
          {magiasEmEstudo.length > 0 && (
            <div className="grimoire-studying-panel">
              <div className="grimoire-studying-header">
                <div className="grimoire-studying-title-group">
                  <Clock size={15} style={{ color: '#c9a961' }} />
                  <span className="grimoire-studying-title">
                    Estudos Místicos em Andamento ({magiasEmEstudo.length})
                  </span>
                </div>
                <span className="grimoire-studying-hint">
                  Invista Inspiração para dominar a fórmula
                </span>
              </div>

              <div className="grimoire-studying-grid">
                {magiasEmEstudo.map((mag) => {
                  const marcas = mag.hm?.marcas || 0;
                  const custo = mag.custo_inspiracao || 1;
                  return (
                    <div key={mag.id} className="grimoire-studying-card">
                      <div className="grimoire-studying-card-header">
                        <h4
                          onClick={() => setInspectMagia(mag)}
                          className="grimoire-studying-name"
                        >
                          {mag.nome}
                        </h4>
                        <span style={{ fontSize: '0.7rem', color: '#9a917f' }}>
                          Círc {mag.circulo}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#9a917f' }}>
                        {mag.fonte} • {mag.escola}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {Array.from({ length: custo }).map((_, i) => (
                            <div
                              key={i}
                              style={{
                                width: 9,
                                height: 9,
                                borderRadius: '50%',
                                backgroundColor: i < marcas ? '#c9a961' : 'transparent',
                                border: '1.5px solid rgba(201, 169, 97, 0.4)',
                                boxShadow: i < marcas ? '0 0 6px rgba(201, 169, 97, 0.6)' : 'none',
                              }}
                            />
                          ))}
                          <span style={{ fontSize: '0.7rem', color: '#9a917f', fontFamily: 'var(--font-mono, monospace)', marginLeft: 4 }}>
                            {marcas}/{custo}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleInvestir(mag)}
                          disabled={inspiracaoAtual <= 0}
                          className="grimoire-card-action-btn primary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            height: '26px',
                            padding: '0 0.55rem',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: inspiracaoAtual > 0 ? 'pointer' : 'not-allowed',
                            opacity: inspiracaoAtual > 0 ? 1 : 0.4,
                          }}
                        >
                          <Sparkles size={11} />
                          <span>Investir 1 Insp</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="grimoire-filter-card">
            <div className="grimoire-search-wrap">
              <Search size={14} className="grimoire-search-icon" />
              <input
                type="text"
                placeholder="Buscar magias aprendidas por nome, escola ou efeito..."
                value={searchMinhas}
                onChange={(e) => setSearchMinhas(e.target.value)}
                className="grimoire-search-input"
              />
              {searchMinhas && (
                <button
                  type="button"
                  onClick={() => setSearchMinhas('')}
                  className="grimoire-search-clear"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Circle Pills */}
            <div className="grimoire-chips-row">
              {['todos', '0', '1', '2', '3', '4'].map((circ) => (
                <button
                  key={circ}
                  type="button"
                  onClick={() => setFiltroCirculoMinhas(circ)}
                  className={`grimoire-chip ${filtroCirculoMinhas === circ ? 'active' : ''}`}
                >
                  {circ === 'todos' ? 'Todos' : circ === '0' ? 'Truques' : `Círc ${circ}`}
                </button>
              ))}
            </div>

            {/* Source Select */}
            <select
              value={filtroFonteMinhas}
              onChange={(e) => setFiltroFonteMinhas(e.target.value)}
              className="grimoire-filter-select"
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
          </div>

          {/* Grouped by Circle */}
          {[0, 1, 2, 3, 4].map((circulo) => {
            const magiasDoCirculo = magiasConhecidasPorCirculo[circulo] || [];
            if (magiasDoCirculo.length === 0) return null;

            return (
              <div key={circulo} className="grimoire-circle-group">
                <div className="grimoire-circle-header">
                  <h3 className="grimoire-circle-title">
                    {circulo === 0 ? 'Círculo 0 • Truques Inatos' : `Círculo ${circulo}`}
                  </h3>
                  <span className="grimoire-circle-count">
                    {magiasDoCirculo.length} {magiasDoCirculo.length === 1 ? 'fórmula' : 'fórmulas'}
                  </span>
                </div>

                <div className="grimoire-spells-grid">
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
              </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Filters */}
          <div className="grimoire-filter-card">
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="grimoire-search-wrap" style={{ flex: 1, minWidth: 200 }}>
                <Search size={14} className="grimoire-search-icon" />
                <input
                  type="text"
                  placeholder="Pesquisar catálogo arcano..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="grimoire-search-input"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="grimoire-search-clear"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Circle Filter */}
              <select
                value={filtroCirculo}
                onChange={(e) => setFiltroCirculo(e.target.value)}
                className="grimoire-filter-select"
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
                className="grimoire-filter-select"
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
                className="grimoire-filter-select"
              >
                <option value="todas">Todas as Escolas</option>
                {escolasUnicas.map((esc) => (
                  <option key={esc} value={esc}>{esc}</option>
                ))}
              </select>
            </div>

            {/* Row 2: Toggles */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.4rem', borderTop: '1px solid rgba(201, 169, 97, 0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setSoPodeAprender((prev) => !prev)}
                  className={`grimoire-chip ${soPodeAprender ? 'active' : ''}`}
                >
                  <Check size={11} />
                  <span>Apenas Disponíveis para Estudo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setApenasEmEstudo((prev) => !prev)}
                  className={`grimoire-chip ${apenasEmEstudo ? 'active' : ''}`}
                >
                  <Clock size={11} />
                  <span>Apenas em Estudo</span>
                </button>
              </div>

              <span style={{ fontSize: '0.72rem', color: '#9a917f' }}>
                Exibindo {Math.min(displayCount, magiasParaAprender.length)} de {magiasParaAprender.length} fórmulas
              </span>
            </div>
          </div>

          {/* Grid of Spells */}
          <div className="grimoire-spells-grid">
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
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <button
                type="button"
                onClick={() => setDisplayCount((prev) => prev + 40)}
                className="grimoire-load-more-btn"
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
    </div>
  );
};
