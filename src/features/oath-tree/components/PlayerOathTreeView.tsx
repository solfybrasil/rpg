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
import '../../../styles/features/PlayerOathTree.css';

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
    <div className="oath-tree-root">
      {/* 1. Header & Controls */}
      <div className="oath-tree-header">
        <div className="oath-tree-hero-info">
          <span className="oath-tree-kicker">
            <Sparkles size={10} /> Votos & Linhagens de Aldrenor
          </span>
          <h1 className="oath-tree-title">
            Árvore do Juramento de {hero.name}
          </h1>
          <p className="oath-tree-meta">
            200 Nós Primordiais • 8 Regiões • Nível {heroLevel}
          </p>
        </div>

        {/* Action Controls & Inspiration */}
        <div className="oath-tree-controls">
          {/* Inspiration Counter */}
          <div className="oath-tree-metric-chip">
            <span>Inspiração</span>
            <strong>{heroInspiration}/{heroInspirationMax}</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '4px' }}>
              {Array.from({ length: Math.max(3, heroInspirationMax) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: i < heroInspiration ? '#c9a961' : 'transparent',
                    border: '1.5px solid rgba(201, 169, 97, 0.4)',
                    boxShadow: i < heroInspiration ? '0 0 6px rgba(201, 169, 97, 0.6)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Livro de Perícias Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsSkillsDrawerOpen(true)}
            className="oath-tree-btn gold"
          >
            <BookOpen size={13} style={{ color: '#1a140d' }} />
            <span>Livro de Perícias</span>
          </button>

          {/* Parchment Mode Toggle */}
          <button
            type="button"
            onClick={toggleParchmentMode}
            className={`oath-tree-btn ${isParchmentMode ? 'primary' : ''}`}
          >
            <Scroll size={13} />
            <span>{isParchmentMode ? 'Modo Pergaminho ✓' : 'Modo Pergaminho'}</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Legend Bar */}
      <div className="oath-tree-toolbar">
        <div className="oath-tree-search-wrap">
          <Search size={14} className="oath-tree-search-icon" />
          <input
            type="text"
            placeholder="Pesquisar nós, talentos, perícias ou regiões..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="oath-tree-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="oath-tree-search-clear"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Visual Legend */}
        <div className="oath-tree-legend">
          <div className="oath-tree-legend-item">
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#c9a961', display: 'inline-block' }} />
            <span>Desbloqueado</span>
          </div>
          <div className="oath-tree-legend-item">
            <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #c9a961', display: 'inline-block' }} />
            <span>Disponível</span>
          </div>
          <div className="oath-tree-legend-item">
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#27272a', border: '1.5px solid #52525b', display: 'inline-block' }} />
            <span>Bloqueado</span>
          </div>
        </div>
      </div>

      {/* 3. Interactive SVG Canvas */}
      <div className="oath-tree-canvas-wrapper">
        <OathTreeCanvas
          curTree={treeState}
          heroLevel={heroLevel}
          highlightedNodeIds={highlightedNodeIds}
          selectedNodeId={selectedNode?.id || null}
          onSelectNode={(node) => setSelectedNode(node)}
          isParchmentMode={isParchmentMode}
        />
      </div>

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
    </div>
  );
};
