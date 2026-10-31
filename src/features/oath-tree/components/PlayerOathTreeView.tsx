import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Award,
  Search,
  BookOpen,
  Scroll,
  X,
  Shield,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { useHero, useHeroes } from '../../../shared/hooks/baseHooks';
import { useSessionStore } from '../../../shared/stores/session';
import {
  GRAPH,
  type OathTreeNode,
  type OathTreeState,
  fetchHeroTree,
  subscribeHeroTree,
  fetchHeroSkills,
  subscribeHeroSkills,
  investInspiration,
  investSkillInspiration,
  getDefaultHeroTree,
  getHeroTreeFromStorage,
  saveHeroTreeToStorage,
  mergeTreeStates,
} from '../../../entities/oath-tree';
import { OathTreeCanvas } from './OathTreeCanvas';
import { NodeDetailSheet } from './NodeDetailSheet';
import { SkillsBookDrawer } from './SkillsBookDrawer';

const { N, IDS } = GRAPH;

export const PlayerOathTreeView: React.FC = () => {
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const heroId = sessionHeroId || 'teste_1';

  const { hero: directHero, updateHeroAsync, isLoading: isLoadingHero } = useHero(heroId);
  const { heroes, isLoading: isLoadingHeroes } = useHeroes();
  const hero = directHero || heroes[0] || null;

  // Parchment Mode Toggle
  const [isParchmentMode, setIsParchmentMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('peste_oath_parchment_mode') === 'true';
    } catch {
      return false;
    }
  });

  const toggleParchmentMode = () => {
    setIsParchmentMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('peste_oath_parchment_mode', String(next));
      } catch {}
      return next;
    });
  };

  // Oath tree state
  const [treeState, setTreeState] = useState<OathTreeState>(() => {
    return (
      getHeroTreeFromStorage(heroId) ||
      getDefaultHeroTree(heroId, (hero as any)?.skills || [])
    );
  });

  // Skills state
  const [heroSkills, setHeroSkills] = useState<any[]>([]);

  // Modals & Drawers
  const [selectedNode, setSelectedNode] = useState<OathTreeNode | null>(null);
  const [isSkillsDrawerOpen, setIsSkillsDrawerOpen] = useState(false);
  const [isInvesting, setIsInvesting] = useState(false);

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch tree and skills from Supabase
  const loadTreeAndSkills = useCallback(async () => {
    if (!hero?.id) return;
    try {
      const [remoteTree, skills] = await Promise.all([
        fetchHeroTree(hero.id),
        fetchHeroSkills(hero.id),
      ]);

      if (remoteTree) {
        setTreeState((prev) => {
          const merged = mergeTreeStates(prev, remoteTree);
          saveHeroTreeToStorage(hero.id, merged);
          return merged;
        });
      }
      if (skills) {
        setHeroSkills(skills);
      }
    } catch (err) {
      console.warn('[OathTree] Falha ao sincronizar com banco:', err);
    }
  }, [hero?.id]);

  useEffect(() => {
    loadTreeAndSkills();
  }, [loadTreeAndSkills]);

  // Realtime subscriptions
  useEffect(() => {
    if (!hero?.id) return;

    const unsubTree = subscribeHeroTree(hero.id, () => {
      fetchHeroTree(hero.id).then((t) => {
        if (t) {
          setTreeState((prev) => mergeTreeStates(prev, t));
        }
      });
    });

    const unsubSkills = subscribeHeroSkills(hero.id, () => {
      fetchHeroSkills(hero.id).then((s) => {
        if (s) setHeroSkills(s);
      });
    });

    return () => {
      unsubTree();
      unsubSkills();
    };
  }, [hero?.id]);

  // Search match highlights
  const highlightedNodeIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return new Set<string>();
    const matches = new Set<string>();
    IDS.forEach((id) => {
      const node = N[id];
      if (
        node.nm.toLowerCase().includes(q) ||
        node.ds.toLowerCase().includes(q) ||
        node.reg.toLowerCase().includes(q) ||
        (node.pericia && node.pericia.toLowerCase().includes(q))
      ) {
        matches.add(id);
      }
    });
    return matches;
  }, [searchQuery]);

  // Vitals
  const heroLevel = Number(hero?.level ?? 1);
  const heroInspiration = Number(hero?.inspiration ?? hero?.inspiracao ?? 0);
  const heroInspirationMax = Number(hero?.inspiration_max ?? hero?.inspiracao_max ?? 3);

  // Selected Node State Calculation
  const selectedNodeStatus = useMemo<'done' | 'avail' | 'lvlock' | 'locked'>(() => {
    if (!selectedNode) return 'locked';
    const id = selectedNode.id;
    const marks = treeState.m?.[id] || 0;
    const isDone = id === 'hub' || marks >= (selectedNode.custo ?? 999) || Boolean(treeState.g?.[id]);
    if (isDone) return 'done';

    // Check connection
    let connected = false;
    for (const a of selectedNode.adj) {
      const aDone = a === 'hub' || (treeState.m?.[a] || 0) >= (N[a]?.custo ?? 999) || Boolean(treeState.g?.[a]);
      if (aDone) {
        connected = true;
        break;
      }
    }
    if (!connected && marks === 0) return 'locked';
    if (heroLevel < (selectedNode.lv ?? 1)) return 'lvlock';
    return 'avail';
  }, [selectedNode, treeState, heroLevel]);

  // Handle Invest in Node
  const handleInvestInNode = async () => {
    if (!selectedNode || !hero?.id) return;
    if (heroInspiration <= 0) {
      toast.error('Você não possui Inspiração disponível.');
      return;
    }

    setIsInvesting(true);
    try {
      const nodeId = selectedNode.id;
      const custoTotal = selectedNode.custo ?? 1;
      const currentMarks = treeState.m?.[nodeId] || 0;
      const nextMarks = currentMarks + 1;
      const nodeUnlocked = nextMarks >= custoTotal;

      // Call RPC
      try {
        await investInspiration(hero.id, nodeId);
      } catch (rpcErr) {
        console.warn('RPC fall back to local update:', rpcErr);
      }

      // Optimistic state update
      const updatedTree: OathTreeState = {
        m: { ...treeState.m, [nodeId]: nextMarks },
        g: { ...treeState.g, ...(nodeUnlocked ? { [nodeId]: true } : {}) },
      };

      setTreeState(updatedTree);
      saveHeroTreeToStorage(hero.id, updatedTree);

      // Decrement hero inspiration
      if (updateHeroAsync) {
        await updateHeroAsync({
          inspiration: Math.max(0, heroInspiration - 1),
        });
      }

      if (nodeUnlocked) {
        toast.success(`🌟 Talento [${selectedNode.nm}] desbloqueado no Jurado!`);
      } else {
        toast.success(`✦ 1 Inspiração investida em ${selectedNode.nm} (${nextMarks}/${custoTotal})`);
      }
    } catch (err) {
      toast.error(`Erro ao investir inspiração: ${err instanceof Error ? err.message : 'Falha'}`);
    } finally {
      setIsInvesting(false);
    }
  };

  // Handle Invest in Skill
  const handleInvestSkill = async (skillName: string) => {
    if (!hero?.id) return;
    if (heroInspiration <= 0) {
      toast.error('Sem Inspiração guardada.');
      return;
    }
    try {
      const res = await investSkillInspiration(hero.id, skillName);
      if (res?.bonus_subiu) {
        toast.success(`🌟 ${skillName} subiu para o nível ${res.nivel} · bônus +${res.bonus}!`);
      } else {
        toast.success(`✦ 1 Inspiração investida em ${skillName}!`);
      }

      if (updateHeroAsync) {
        await updateHeroAsync({
          inspiration: Math.max(0, heroInspiration - 1),
        });
      }
      const updatedSkills = await fetchHeroSkills(hero.id);
      if (updatedSkills) setHeroSkills(updatedSkills);
    } catch (err) {
      toast.error(`Falha ao evoluir perícia: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  };

  if (isLoadingHero || !hero) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <span className="text-xs uppercase font-cinzel text-[var(--gold-dim)] tracking-widest">
            Revelando a Árvore do Juramento...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* 1. Header & Controls */}
      <section className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-cinzel uppercase text-[var(--gold-dim)] tracking-widest">
            Votos & Linhagens de Aldrenor
          </span>
          <h1 className="font-cinzel font-bold text-2xl text-[var(--text-1)] mt-0.5">
            Árvore do Juramento de {hero.name}
          </h1>
          <p className="text-xs text-[var(--text-3)] font-cinzel mt-1">
            200 Nós Primordiais • 8 Regiões • Nível {heroLevel}
          </p>
        </div>

        {/* Action Controls & Inspiration */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Inspiration Counter */}
          <div className="px-3.5 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] flex flex-col">
            <span className="text-[9px] uppercase font-cinzel text-[var(--gold)] font-bold tracking-wider">
              Inspiração ({heroInspiration}/{heroInspirationMax})
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              {Array.from({ length: Math.max(3, heroInspirationMax) }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border transition-all ${
                    i < heroInspiration
                      ? 'bg-[var(--gold)] border-[var(--gold-bright)] shadow-[0_0_6px_rgba(201,169,97,0.6)]'
                      : 'bg-black/60 border-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Livro de Perícias Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsSkillsDrawerOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-[var(--gold-dim)] text-[var(--text-1)] font-cinzel text-xs font-semibold transition-colors cursor-pointer"
          >
            <Award size={15} className="text-[var(--gold)]" />
            <span>Livro de Perícias</span>
          </button>

          {/* Parchment Mode Toggle */}
          <button
            type="button"
            onClick={toggleParchmentMode}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-cinzel text-xs font-semibold border transition-colors cursor-pointer ${
              isParchmentMode
                ? 'bg-[#c9a961] border-[#a07e32] text-black shadow-inner font-bold'
                : 'bg-[var(--card)] border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)]'
            }`}
          >
            <Scroll size={15} />
            <span>{isParchmentMode ? 'Modo Pergaminho ✓' : 'Modo Pergaminho'}</span>
          </button>
        </div>
      </section>

      {/* 2. Search & Legend Bar */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            type="text"
            placeholder="Pesquisar nós, talentos, perícias ou regiões..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-hidden focus:border-[var(--gold-dim)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)]"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Visual Legend */}
        <div className="flex items-center gap-4 text-[11px] font-cinzel text-[var(--text-3)] shrink-0 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--gold)]" />
            <span>Desbloqueado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-[var(--gold)] bg-transparent animate-pulse" />
            <span>Disponível</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-zinc-700 bg-zinc-900" />
            <span>Bloqueado</span>
          </div>
        </div>
      </section>

      {/* 3. Interactive SVG Canvas */}
      <OathTreeCanvas
        curTree={treeState}
        heroLevel={heroLevel}
        highlightedNodeIds={highlightedNodeIds}
        selectedNodeId={selectedNode?.id || null}
        onSelectNode={(node) => setSelectedNode(node)}
        isParchmentMode={isParchmentMode}
      />

      {/* 4. Node Detail Modal/Sheet */}
      {selectedNode && (
        <NodeDetailSheet
          node={selectedNode}
          state={selectedNodeStatus}
          currentMarks={treeState.m?.[selectedNode.id] || 0}
          heroInspiration={heroInspiration}
          heroLevel={heroLevel}
          onClose={() => setSelectedNode(null)}
          onInvest={handleInvestInNode}
          isInvesting={isInvesting}
        />
      )}

      {/* 5. Infinite Skills Book Drawer */}
      <SkillsBookDrawer
        isOpen={isSkillsDrawerOpen}
        onClose={() => setIsSkillsDrawerOpen(false)}
        heroSkills={heroSkills}
        heroInspiration={heroInspiration}
        onInvestSkill={handleInvestSkill}
      />
    </main>
  );
};
