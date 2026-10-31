import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Award,
  Search,
  BookOpen,
  Plus,
  Minus,
  Check,
  Undo2,
  Lock,
  AlertCircle,
  X,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { useHeroes } from '../../../shared/hooks/baseHooks';
import {
  GRAPH,
  type OathTreeNode,
  type OathTreeState,
  fetchHeroTree,
  fetchHeroSkills,
  getDefaultHeroTree,
  getHeroTreeFromStorage,
  saveHeroTreeToStorage,
  mergeTreeStates,
  getNodeState,
  investInspiration,
} from '../../../entities/oath-tree';
import { OathTreeCanvas } from '../../oath-tree/components/OathTreeCanvas';
import { SkillsBookDrawer } from '../../oath-tree/components/SkillsBookDrawer';
import {
  useAdjustHeroInspirationMutation,
  useMasterUndoMarkTreeMutation,
  useMasterUnlockFreeTreeMutation,
} from '../api/useDMGrimoire';
import { Button } from '../../../shared/ui';

const { N, IDS } = GRAPH;

const DEFAULT_HEROES = [
  { id: 'kaelis_moonfire', name: 'Kaelis Moonfire', title: 'Bardo Arcano', icon: '🪕' },
  { id: 'tor_bjorn', name: 'Tor Bjorn', title: 'Artífice Rúnico', icon: '🔨' },
  { id: 'malenia', name: 'Malenia', title: 'Alquimista da Peste', icon: '🧪' },
];

interface DMOathTreeTabProps {
  selectedHeroId: string;
  onSelectHeroId: (id: string) => void;
}

export const DMOathTreeTab: React.FC<DMOathTreeTabProps> = ({
  selectedHeroId,
  onSelectHeroId,
}) => {
  const { heroes: remoteHeroes = [] } = useHeroes();

  // Combine heroes list
  const heroesList = useMemo(() => {
    if (remoteHeroes.length > 0) {
      const canon = remoteHeroes.filter((h) =>
        ['kaelis_moonfire', 'tor_bjorn', 'malenia'].includes(h.id),
      );
      if (canon.length > 0) return canon;
      return remoteHeroes;
    }
    return DEFAULT_HEROES as any[];
  }, [remoteHeroes]);

  const activeHero = useMemo(() => {
    return heroesList.find((h) => h.id === selectedHeroId) || heroesList[0];
  }, [heroesList, selectedHeroId]);

  // Tree state for selected hero
  const [treeState, setTreeState] = useState<OathTreeState>(() => {
    return (
      getHeroTreeFromStorage(selectedHeroId) ||
      getDefaultHeroTree(selectedHeroId, (activeHero as any)?.skills || [])
    );
  });

  const [heroSkills, setHeroSkills] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<OathTreeNode | null>(null);
  const [isSkillsDrawerOpen, setIsSkillsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const adjustInspirationMutation = useAdjustHeroInspirationMutation();
  const unlockFreeMutation = useMasterUnlockFreeTreeMutation();
  const undoMarkMutation = useMasterUndoMarkTreeMutation();

  // Reload tree and skills when active hero changes
  const loadTreeAndSkills = useCallback(async () => {
    if (!activeHero?.id) return;
    try {
      const [remoteTree, skills] = await Promise.all([
        fetchHeroTree(activeHero.id),
        fetchHeroSkills(activeHero.id),
      ]);

      if (remoteTree) {
        setTreeState((prev) => {
          const merged = mergeTreeStates(prev, remoteTree);
          saveHeroTreeToStorage(activeHero.id, merged);
          return merged;
        });
      }
      if (skills) {
        setHeroSkills(skills);
      }
    } catch (err) {
      console.warn('[DMOathTree] Erro ao carregar árvore remota:', err);
    }
  }, [activeHero?.id]);

  useEffect(() => {
    loadTreeAndSkills();
  }, [loadTreeAndSkills]);

  // Node highlight filtering
  const highlightedNodeIds = useMemo(() => {
    if (!searchQuery.trim()) return undefined;
    const q = searchQuery.toLowerCase().trim();
    const set = new Set<string>();

    IDS.forEach((id) => {
      const node = N[id];
      if (!node) return;
      if (
        node.nm.toLowerCase().includes(q) ||
        node.ds.toLowerCase().includes(q) ||
        node.reg.toLowerCase().includes(q) ||
        (node.pericia && node.pericia.toLowerCase().includes(q))
      ) {
        set.add(id);
      }
    });

    return set;
  }, [searchQuery]);

  const heroLevel = Number(activeHero?.level ?? 1);
  const heroInspiration = Number(activeHero?.inspiration ?? 0);

  // Selected node state calculations
  const selectedNodeInfo = useMemo(() => {
    if (!selectedNode) return null;
    const state = getNodeState(selectedNode.id, treeState, heroLevel, N);
    const marks = treeState.m?.[selectedNode.id] || 0;
    const isDone = state === 'done';
    const custoTotal = selectedNode.custo ?? 1;
    return { state, marks, isDone, custoTotal };
  }, [selectedNode, treeState, heroLevel]);

  // Master Actions
  const handleUnlockFree = async () => {
    if (!selectedNode || !activeHero?.id) return;

    try {
      await unlockFreeMutation.mutateAsync({
        characterId: activeHero.id,
        noId: selectedNode.id,
        noNome: selectedNode.nm,
      });

      // Update local state immediately
      setTreeState((prev) => {
        const nextTree: OathTreeState = {
          ...prev,
          m: { ...(prev.m || {}), [selectedNode.id]: selectedNode.custo ?? 1 },
          g: { ...(prev.g || {}), [selectedNode.id]: true },
        };
        saveHeroTreeToStorage(activeHero.id, nextTree);
        return nextTree;
      });
      setSelectedNode(null);
    } catch {
      // toast handled by mutation
    }
  };

  const handleUndoMark = async () => {
    if (!selectedNode || !activeHero?.id) return;

    try {
      await undoMarkMutation.mutateAsync({
        characterId: activeHero.id,
        noId: selectedNode.id,
      });

      // Update local state
      setTreeState((prev) => {
        const currentMarks = prev.m?.[selectedNode.id] || 0;
        const nextMarks = Math.max(0, currentMarks - 1);
        const nextM = { ...(prev.m || {}) };
        const nextG = { ...(prev.g || {}) };

        if (nextMarks === 0) {
          delete nextM[selectedNode.id];
          delete nextG[selectedNode.id];
        } else {
          nextM[selectedNode.id] = nextMarks;
        }

        const nextTree: OathTreeState = { ...prev, m: nextM, g: nextG };
        saveHeroTreeToStorage(activeHero.id, nextTree);
        return nextTree;
      });
      setSelectedNode(null);
    } catch {
      // toast handled by mutation
    }
  };

  const handleInvestInspiration = async () => {
    if (!selectedNode || !activeHero?.id) return;
    if (heroInspiration <= 0) {
      toast.error('O herói não possui Inspiração disponível.');
      return;
    }

    try {
      await investInspiration(activeHero.id, selectedNode.id);
      toast.success(`1 Inspiração investida em "${selectedNode.nm}"!`);
      await loadTreeAndSkills();
      setSelectedNode(null);
    } catch (err: any) {
      toast.error(`Falha ao investir: ${err.message || 'Erro desconhecido'}`);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {/* Hero Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {heroesList.map((hero) => {
            const isSelected = hero.id === selectedHeroId;
            return (
              <button
                key={hero.id}
                type="button"
                data-testid={`dm-oath-hero-${hero.id}`}
                onClick={() => {
                  onSelectHeroId(hero.id);
                  setSelectedNode(null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-serif font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)] shadow-sm'
                    : 'bg-black/30 border-white/10 text-white/60 hover:text-white'
                }`}
              >
                <span>{hero.icon || hero.avatar_icon || '🛡️'}</span>
                <span>{hero.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Hero Stats & Master Quick Controls */}
        <div className="flex items-center gap-3 self-end md:self-center flex-wrap">
          {/* Inspiration Counter with +/- for DM */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 text-[var(--gold)]">
            <span className="text-xs font-serif font-bold">✦ Inspiração:</span>
            <span className="font-mono font-bold text-sm text-[#f5e0a0]" data-testid="dm-hero-inspiration-val">
              {heroInspiration}
            </span>
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                data-testid="dm-decrease-insp-btn"
                disabled={heroInspiration <= 0 || adjustInspirationMutation.isPending}
                onClick={() =>
                  adjustInspirationMutation.mutate({
                    characterId: selectedHeroId,
                    currentInspiration: heroInspiration,
                    delta: -1,
                  })
                }
                title="Diminuir 1 Inspiração"
                className="w-5 h-5 rounded flex items-center justify-center bg-black/40 hover:bg-black/80 border border-white/10 text-xs text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Minus size={12} />
              </button>
              <button
                type="button"
                data-testid="dm-increase-insp-btn"
                disabled={adjustInspirationMutation.isPending}
                onClick={() =>
                  adjustInspirationMutation.mutate({
                    characterId: selectedHeroId,
                    currentInspiration: heroInspiration,
                    delta: 1,
                  })
                }
                title="Conceder 1 Inspiração"
                className="w-5 h-5 rounded flex items-center justify-center bg-black/40 hover:bg-black/80 border border-white/10 text-xs text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Level Badge */}
          <div className="px-3 py-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs font-serif font-bold">
            NV <strong className="text-white ml-0.5">{heroLevel}</strong>
          </div>

          {/* Search Input */}
          <div className="relative w-40 sm:w-48">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
            />
            <input
              type="text"
              data-testid="dm-oath-tree-search"
              placeholder="Buscar nó..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-[#f5f0e1] placeholder-white/40 focus:border-[var(--gold)] focus:outline-none"
            />
          </div>

          {/* Skills Book Drawer Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsSkillsDrawerOpen(true)}
            className="text-xs font-serif border border-white/10 text-white/80 hover:text-white py-1.5 px-3 h-auto"
          >
            <BookOpen size={14} className="mr-1.5" />
            13 Perícias
          </Button>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <div
        data-testid="dm-oath-tree-canvas-container"
        className="relative w-full h-[620px] rounded-xl border border-[var(--border)] overflow-hidden bg-radial from-[#18120d] to-[#080604] shadow-2xl"
      >
        <OathTreeCanvas
          curTree={treeState}
          heroLevel={heroLevel}
          highlightedNodeIds={highlightedNodeIds}
          selectedNodeId={selectedNode?.id || null}
          onSelectNode={(node) => setSelectedNode(node)}
          isParchmentMode={false}
        />
      </div>

      {/* Node Detail Sheet / Modal with Master Controls */}
      {selectedNode && selectedNodeInfo && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedNode(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-[#14100c] border border-[var(--gold)]/30 p-6 shadow-2xl flex flex-col gap-4 text-[#ebe6d6] animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-serif uppercase text-[var(--gold-dim)] tracking-wider block">
                  Região: {selectedNode.reg} • {selectedNode.tipo}
                </span>
                <h3 className="font-serif font-bold text-lg text-[var(--gold)] mt-0.5">
                  {selectedNode.nm}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Description */}
            <div className="p-3.5 rounded-lg bg-black/40 border border-white/10">
              <p className="font-serif italic text-white/80 text-xs leading-relaxed whitespace-pre-line">
                {selectedNode.ds || 'O poder do Juramento ressoa neste nó primordial.'}
              </p>
            </div>

            {/* Requirements & Cost */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded bg-black/30 border border-white/10 flex flex-col">
                <span className="text-[10px] font-serif text-white/40 uppercase">Nível Requerido</span>
                <span className="font-semibold text-white mt-0.5">
                  Nível {selectedNode.lv ?? 1} (Herói: {heroLevel})
                </span>
              </div>

              <div className="p-2.5 rounded bg-black/30 border border-white/10 flex flex-col">
                <span className="text-[10px] font-serif text-white/40 uppercase">Custo de Inspiração</span>
                <span className="font-semibold text-[var(--gold)] mt-0.5">
                  {selectedNodeInfo.custoTotal} {selectedNodeInfo.custoTotal === 1 ? 'Inspiração' : 'Inspirações'}
                </span>
              </div>
            </div>

            {/* State Banner */}
            {selectedNodeInfo.isDone ? (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-2 text-emerald-300 text-xs font-serif font-semibold">
                <Check size={16} />
                <span>Nó Desbloqueado e Ativo no Jurado</span>
              </div>
            ) : selectedNodeInfo.state === 'lvlock' ? (
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 flex items-center gap-2 text-amber-300 text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>Requer Nível {selectedNode.lv} para liberar este nó.</span>
              </div>
            ) : selectedNodeInfo.state === 'locked' ? (
              <div className="p-3 rounded-lg bg-black/60 border border-white/10 flex items-center gap-2 text-white/50 text-xs">
                <Lock size={16} className="shrink-0" />
                <span>Bloqueado. Precisa estar conectado a um nó liberado.</span>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[var(--gold)]/10 border border-[var(--gold)]/30 flex items-center gap-2 text-[var(--gold)] text-xs font-serif">
                <Sparkles size={16} className="shrink-0" />
                <span>Disponível para investimento normal do herói.</span>
              </div>
            )}

            {/* Master Control Buttons */}
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              <span className="text-[10px] font-serif uppercase tracking-wider text-[var(--gold-dim)]">
                Ações de Autoridade do Mestre:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="dm-unlock-free-btn"
                  onClick={handleUnlockFree}
                  disabled={selectedNodeInfo.isDone || unlockFreeMutation.isPending}
                  className="py-2.5 px-3 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-serif font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  title="Libera o nó sem exigir ou gastar Inspiração do jogador"
                >
                  <Sparkles size={14} />
                  <span>Liberar de Graça</span>
                </button>

                <button
                  type="button"
                  data-testid="dm-undo-mark-tree-btn"
                  onClick={handleUndoMark}
                  disabled={selectedNodeInfo.marks <= 0 || undoMarkMutation.isPending}
                  className="py-2.5 px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/50 text-rose-200 font-serif font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  title="Recupera marcas e desfaz este nó na árvore do jogador"
                >
                  <Undo2 size={14} />
                  <span>Desfazer 1 Marca</span>
                </button>
              </div>

              {!selectedNodeInfo.isDone && selectedNodeInfo.state === 'avail' && (
                <button
                  type="button"
                  onClick={handleInvestInspiration}
                  className="w-full py-2 rounded-lg bg-[var(--gold)] hover:bg-[var(--gold-bright)] text-black font-serif font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 mt-1 shadow-md"
                >
                  <Sparkles size={14} className="fill-black" />
                  <span>Investir 1 Inspiração do Herói ({heroInspiration} disponível)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Skills Book Drawer */}
      <SkillsBookDrawer
        isOpen={isSkillsDrawerOpen}
        onClose={() => setIsSkillsDrawerOpen(false)}
        heroSkills={heroSkills}
        heroInspiration={heroInspiration}
        onInvestSkill={() => {
          loadTreeAndSkills();
        }}
      />
    </div>
  );
};
