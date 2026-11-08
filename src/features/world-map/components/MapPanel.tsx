import React, { useState, useMemo } from 'react';
import type { MapPlace } from '../types';
import mapRegions from '../data/mapRegions';
import { iconSVG } from '../engine/mapEngine';
import {
  Search,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  Navigation,
  Compass,
  Undo2,
  Layers,
  ChevronDown,
  ChevronUp,
  MapPin,
  Building,
  Flag,
  Trash2,
  Edit3,
  X,
  Castle,
} from 'lucide-react';

const typeOrder = ['cap', 'cid', 'por', 'vil', 'gui', 'for', 'tem', 'tor', 'rui', 'mas', 'cov', 'mar'] as const;

const plural: Record<string, string> = {
  cap: 'Capitais',
  cid: 'Cidades',
  por: 'Portos',
  vil: 'Vilas',
  gui: 'Guildas',
  for: 'Fortalezas',
  tem: 'Templos',
  tor: 'Torres',
  rui: 'Ruínas',
  mas: 'Masmorras',
  cov: 'Covis',
  mar: 'Marcos',
};

const typeLabels: Record<string, string> = {
  cap: 'Capital Soberana',
  cid: 'Cidade Fortificada',
  por: 'Porto Mercante',
  vil: 'Vila ou Aldeia',
  gui: 'Guilda Comercial',
  for: 'Fortaleza Militar',
  tem: 'Templo Antigo',
  tor: 'Torre Arcana',
  rui: 'Ruína Esquecida',
  mas: 'Masmorra ou Cripta',
  cov: 'Covil Bestial',
  mar: 'Marco Natural',
};

const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export interface MapPanelProps {
  places: MapPlace[];
  selectedPlace: MapPlace | null;
  onSelectPlace: (place: MapPlace | null) => void;
  onFlyTo: (x: number, y: number, z?: number) => void;
  role?: 'player' | 'dm';
  isPlayerView?: boolean;
  onTogglePlayerView?: () => void;
  regionsFog?: Record<string, boolean>;
  onToggleRegionDiscovered?: (regionId: string, discovered: boolean) => void;
  onUpdatePlace?: (id: string, updates: Partial<MapPlace>) => void;
  onDeletePlace?: (id: string) => void;
  onSetPartyPlace?: (place: MapPlace) => void;
  onUndoRoute?: () => void;
  onStartSignalMode?: () => void;
  isSignalMode?: boolean;
  onEditPlace?: (place: MapPlace) => void;
  onLayersChange?: (layers: { route: boolean; roads: boolean; borders: boolean }) => void;
  onHiddenTypesChange?: (hidden: Set<string>) => void;
  onOpenCityMap?: (place: MapPlace) => void;
}

export function MapPanel({
  places = [],
  selectedPlace,
  onSelectPlace,
  onFlyTo,
  role = 'player',
  isPlayerView = false,
  onTogglePlayerView,
  regionsFog = {},
  onToggleRegionDiscovered,
  onUpdatePlace,
  onDeletePlace,
  onSetPartyPlace,
  onUndoRoute,
  onStartSignalMode,
  isSignalMode = false,
  onEditPlace,
  onLayersChange,
  onHiddenTypesChange,
  onOpenCityMap,
}: MapPanelProps) {
  const isDM = role === 'dm';
  const effectiveIsPlayer = !isDM || isPlayerView;

  // Estado da gaveta e de fixação (📌)
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [showRegionsManager, setShowRegionsManager] = useState(false);
  const [layers, setLayers] = useState({ route: true, roads: true, borders: true });

  const regName = useMemo(() => Object.fromEntries(mapRegions.map((r) => [r.id, r.name])), []);
  const regPeople = useMemo(() => Object.fromEntries(mapRegions.map((r) => [r.id, r.people])), []);

  // Filtra lugares
  const filteredPlaces = useMemo(() => {
    const sv = norm(searchQuery.trim());
    return places.filter((p) => {
      if (effectiveIsPlayer && !p.discovered) return false;
      if (hiddenTypes.has(p.type)) return false;
      if (selectedRegion && p.region_id !== selectedRegion && p.region !== selectedRegion) return false;
      if (!sv) return true;
      return norm(p.name).includes(sv) || norm(p.desc_public || p.desc || '').includes(sv);
    });
  }, [places, effectiveIsPlayer, hiddenTypes, selectedRegion, searchQuery]);

  const toggleType = (t: string) => {
    const next = new Set(hiddenTypes);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    setHiddenTypes(next);
    onHiddenTypesChange?.(next);
  };

  const handleLayerToggle = (layerKey: keyof typeof layers) => {
    const next = { ...layers, [layerKey]: !layers[layerKey] };
    setLayers(next);
    onLayersChange?.(next);
  };

  const isCityLike = (type: string) => {
    return ['cap', 'cid', 'por', 'vil', 'for'].includes(type);
  };

  // Se estiver fixado, o painel fica sempre visível
  const panelVisible = isOpen || isPinned;

  return (
    <>
      {/* Botão de alternar no celular quando não fixado */}
      {!panelVisible && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3.5 py-2 rounded-md border border-[rgba(201,169,97,0.28)] bg-[#14120e]/95 text-[#f5ede0] font-cinzel text-xs tracking-wider shadow-[0_4px_16px_rgba(0,0,0,0.8)] backdrop-blur-md hover:border-[#c9a961] hover:bg-[#1c1812] transition-all"
          aria-expanded={false}
          aria-label="Abrir catálogo de lugares de Aldrenor"
        >
          <Compass size={15} className="text-[#c9a961]" />
          <span>Lugares de Aldrenor</span>
        </button>
      )}

      {/* Backdrop mobile quando aberto e não fixado */}
      {panelVisible && !isPinned && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Painel Lateral / Sheet */}
      <aside
        className={`fixed md:absolute top-0 left-0 bottom-0 z-40 w-full sm:w-85 md:w-96 bg-[#14120e] border-r border-[rgba(201,169,97,0.22)] flex flex-col shadow-[8px_0_32px_rgba(0,0,0,0.85)] transition-transform duration-300 ${
          panelVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabeçalho com Título e Botão de Fixar 📌 */}
        <div className="relative border-b border-[rgba(201,169,97,0.22)] bg-gradient-to-b from-[#1a1712] to-[#14120e] p-4 flex items-center justify-between">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[rgba(201,169,97,0.6)] to-transparent pointer-events-none" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-cinzel text-lg font-bold tracking-widest text-[#f5ede0] uppercase">
                ALDRENOR
              </h1>
              <span className="text-[10px] font-cinzel tracking-wider px-1.5 py-0.5 rounded border border-[rgba(201,169,97,0.25)] bg-[#0d0c0a] text-[#c9a961]">
                Cartografia
              </span>
            </div>
            <p className="text-[11px] font-serif italic text-[#9a917f]">
              Lugares, Capitais & Trilhas da Campanha
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Botão de Fixar Painel (Lucide Pin) */}
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`p-1.5 rounded-md border transition-all ${
                isPinned
                  ? 'border-[#c9a961] bg-[#c9a961]/20 text-[#f5ede0]'
                  : 'border-[rgba(201,169,97,0.2)] bg-[#0d0c0a] text-[#9a917f] hover:text-[#f5ede0] hover:border-[#c9a961]'
              }`}
              title={isPinned ? 'Desafixar menu flutuante' : 'Fixar menu lateral aberto'}
              aria-label={isPinned ? 'Desafixar menu' : 'Fixar menu'}
            >
              {isPinned ? <Pin size={15} className="rotate-45" /> : <PinOff size={15} />}
            </button>

            {/* Fechar no celular */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsPinned(false);
              }}
              className="p-1.5 rounded-md border border-[rgba(201,169,97,0.2)] bg-[#0d0c0a] text-[#9a917f] hover:text-[#f5ede0] hover:border-[#c9a961] transition-colors"
              title="Fechar painel"
              aria-label="Fechar painel"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Controles do Confessor (Mestre) */}
        {isDM && (
          <div className="border-b border-[rgba(201,169,97,0.22)] bg-[#110f0c] p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-cinzel tracking-wider text-[#c9a961] uppercase">
                Ferramentas do Confessor
              </span>
              {onTogglePlayerView && (
                <button
                  type="button"
                  onClick={onTogglePlayerView}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-cinzel border ${
                    isPlayerView
                      ? 'border-[#c9a961] bg-[#c9a961]/20 text-[#f5ede0]'
                      : 'border-[rgba(201,169,97,0.2)] bg-[#0d0c0a] text-[#9a917f]'
                  }`}
                >
                  {isPlayerView ? <Eye size={11} /> : <EyeOff size={11} />}
                  <span>{isPlayerView ? 'Visão Jogador' : 'Visão DM'}</span>
                </button>
              )}
            </div>

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={onStartSignalMode}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-[11px] font-cinzel font-semibold border ${
                  isSignalMode
                    ? 'border-[#c9a961] bg-[#3a2c14] text-[#f5ede0]'
                    : 'border-[rgba(201,169,97,0.25)] bg-[#181510] text-[#f5ede0] hover:bg-[#201c15]'
                }`}
              >
                <Compass size={12} className="text-[#c9a961]" />
                <span>{isSignalMode ? 'Toque no mapa...' : 'Sinalizar (Ping)'}</span>
              </button>

              <button
                type="button"
                onClick={onUndoRoute}
                className="flex items-center gap-1 py-1.5 px-2 rounded text-[11px] font-cinzel border border-[rgba(201,169,97,0.25)] bg-[#181510] text-[#9a917f] hover:text-[#f5ede0]"
                title="Desfazer o último trecho da rota desenhada"
              >
                <Undo2 size={12} />
                <span>Desfazer</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRegionsManager(!showRegionsManager)}
                className="flex items-center gap-1 py-1.5 px-2 rounded text-[11px] font-cinzel border border-[rgba(201,169,97,0.25)] bg-[#181510] text-[#9a917f] hover:text-[#f5ede0]"
              >
                <Layers size={12} />
                <span>Névoa</span>
                {showRegionsManager ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            </div>

            {/* Subpainel de Névoa de Guerra por Região */}
            {showRegionsManager && (
              <div className="p-2 rounded bg-[#0d0c0a] border border-[rgba(201,169,97,0.2)] max-h-36 overflow-y-auto space-y-1">
                <span className="text-[10px] font-cinzel text-[#8a7850] block mb-1">
                  Interruptor de Descoberta:
                </span>
                {mapRegions.map((reg) => {
                  const isDisc = Boolean(regionsFog[reg.id]);
                  return (
                    <div
                      key={reg.id}
                      className="flex items-center justify-between text-xs font-serif py-0.5 px-1 hover:bg-[#1a1712] rounded"
                    >
                      <span className={isDisc ? 'text-[#f5ede0]' : 'text-[#6b6255]'}>
                        {reg.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleRegionDiscovered?.(reg.id, !isDisc)}
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          isDisc
                            ? 'border-[#22c55e]/40 bg-[#22c55e]/15 text-[#86efac]'
                            : 'border-[rgba(201,169,97,0.18)] bg-[#14120e] text-[#8a7850]'
                        }`}
                      >
                        {isDisc ? 'Revelada' : 'Oculta'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Busca no topo & Filtros */}
        <div className="border-b border-[rgba(201,169,97,0.22)] bg-[#14120e] p-3 space-y-2.5">
          {/* Pílula de busca */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7850]"
            />
            <input
              type="search"
              placeholder="Buscar cidades, portos, ruínas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[rgba(201,169,97,0.2)] bg-[#0d0c0a] text-xs font-serif text-[#f5ede0] placeholder-[#8a7850] focus:border-[#c9a961] focus:outline-none transition-colors"
            />
          </div>

          {/* Seletor de Região */}
          <select
            value={selectedRegion}
            onChange={(e) => {
              setSelectedRegion(e.target.value);
              const r = mapRegions.find((reg) => reg.id === e.target.value);
              if (r) onFlyTo(r.x, r.y, 2.5);
            }}
            className="w-full px-2.5 py-1.5 rounded-md border border-[rgba(201,169,97,0.2)] bg-[#0d0c0a] text-xs font-serif text-[#f5ede0] focus:border-[#c9a961] focus:outline-none"
          >
            <option value="">Todas as 11 Regiões</option>
            {mapRegions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Chips de filtro por tipo */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {typeOrder.map((t) => {
              const active = !hiddenTypes.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-serif whitespace-nowrap border transition-all ${
                    active
                      ? 'border-[rgba(201,169,97,0.4)] bg-[#1c1812] text-[#f5ede0]'
                      : 'border-[rgba(201,169,97,0.12)] bg-[#0a0907] text-[#6b6255] opacity-60'
                  }`}
                >
                  <span dangerouslySetInnerHTML={{ __html: iconSVG(t) }} />
                  <span>{plural[t]}</span>
                </button>
              );
            })}
          </div>

          {/* Toggles de Camadas (Rota, Estradas, Fronteiras) */}
          <div className="flex items-center justify-between text-[11px] font-serif text-[#9a917f] pt-1">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={layers.route}
                onChange={() => handleLayerToggle('route')}
                className="accent-[#c9a961]"
              />
              <span>Rota</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={layers.roads}
                onChange={() => handleLayerToggle('roads')}
                className="accent-[#c9a961]"
              />
              <span>Estradas</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={layers.borders}
                onChange={() => handleLayerToggle('borders')}
                className="accent-[#c9a961]"
              />
              <span>Fronteiras</span>
            </label>
          </div>
        </div>

        {/* Cartão do Lugar Selecionado */}
        {selectedPlace && (
          <div className="border-b border-[rgba(201,169,97,0.3)] bg-[#17140f] p-4 relative animate-fade-in">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(201,169,97,0.5)] to-transparent pointer-events-none" />
            <button
              type="button"
              onClick={() => onSelectPlace(null)}
              className="absolute top-3 right-3 text-[#9a917f] hover:text-[#f5ede0]"
              title="Fechar detalhes"
            >
              ✕
            </button>

            <div className="flex items-start gap-2.5">
              <div
                className="shrink-0 mt-0.5"
                dangerouslySetInnerHTML={{ __html: iconSVG(selectedPlace.type) }}
              />
              <div className="flex-1 pr-4">
                <h2 className="font-cinzel text-base font-bold text-[#f5ede0] leading-tight">
                  {selectedPlace.name}
                </h2>
                <p className="text-[11px] font-serif text-[#c9a961] mt-0.5">
                  {typeLabels[selectedPlace.type] || selectedPlace.type} •{' '}
                  {regName[selectedPlace.region_id || selectedPlace.region || ''] || 'Aldrenor'}
                </p>
              </div>
            </div>

            <p className="text-xs font-serif text-[#cfc1ad] leading-relaxed mt-2.5">
              {selectedPlace.desc_public ||
                selectedPlace.desc ||
                'Nenhuma anotação pública registrada para este marco geográfico.'}
            </p>

            {/* Tag de Visitado */}
            {selectedPlace.visited && (
              <div className="mt-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[rgba(201,169,97,0.3)] bg-[rgba(201,169,97,0.1)] text-[10px] font-cinzel text-[#f5ede0]">
                <span>✓ A mesa já passou por aqui</span>
              </div>
            )}

            {/* BOTÃO PRINCIPAL: CLICAR NUMA CIDADE ABRE O MAPA DA CIDADE */}
            {isCityLike(selectedPlace.type) && (
              <div className="mt-3 pt-2.5 border-t border-[rgba(201,169,97,0.18)]">
                <button
                  type="button"
                  onClick={() => onOpenCityMap?.(selectedPlace)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded border border-[rgba(201,169,97,0.35)] bg-gradient-to-r from-[#1c1812] to-[#262017] text-[#f5ede0] font-cinzel text-xs font-bold tracking-wider hover:border-[#c9a961] hover:from-[#262017] hover:to-[#332a1e] shadow-[0_2px_10px_rgba(201,169,97,0.15)] transition-all"
                >
                  <Castle size={14} className="text-[#c9a961]" />
                  <span>Explorar Mapa da Cidade</span>
                </button>
              </div>
            )}

            {/* Ações do Mestre */}
            {isDM && !isPlayerView && (
              <div className="mt-3 pt-2 border-t border-[rgba(201,169,97,0.18)] space-y-2">
                {selectedPlace.desc_secret && (
                  <div className="p-2 rounded border border-dashed border-[#dc2626]/60 bg-[#7f1d1d]/15 text-xs font-serif text-[#fca5a5]">
                    <strong className="font-cinzel text-[10px] block text-[#fca5a5] uppercase">
                      🔒 Segredo do Mestre:
                    </strong>
                    {selectedPlace.desc_secret}
                  </div>
                )}

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePlace?.(selectedPlace.id, {
                        discovered: !selectedPlace.discovered,
                      })
                    }
                    className="flex-1 py-1 px-2 rounded text-[10px] font-cinzel border border-[rgba(201,169,97,0.25)] bg-[#14120e] text-[#f5ede0]"
                  >
                    {selectedPlace.discovered ? 'Ocultar' : 'Revelar'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePlace?.(selectedPlace.id, {
                        visited: !selectedPlace.visited,
                      })
                    }
                    className="flex-1 py-1 px-2 rounded text-[10px] font-cinzel border border-[rgba(201,169,97,0.25)] bg-[#14120e] text-[#f5ede0]"
                  >
                    {selectedPlace.visited ? 'Não Visitado' : 'Marcar Visitado'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onSetPartyPlace?.(selectedPlace)}
                    className="flex-1 py-1 px-2 rounded text-[10px] font-cinzel font-bold border border-[#a3291f] bg-[#8c1d18] text-white"
                  >
                    🚩 Mover Grupo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contador */}
        <div className="px-4 py-2 border-b border-[rgba(201,169,97,0.18)] bg-[#0d0c0a] text-[11px] font-serif text-[#9a917f] flex items-center justify-between">
          <span>{filteredPlaces.length} lugares encontrados</span>
          <span>{mapRegions.length} províncias</span>
        </div>

        {/* Lista de Lugares Agrupados por Região */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {mapRegions.map((r) => {
            const items = filteredPlaces
              .filter((p) => p.region_id === r.id || p.region === r.id)
              .sort(
                (a, b) =>
                  typeOrder.indexOf(a.type as (typeof typeOrder)[number]) -
                    typeOrder.indexOf(b.type as (typeof typeOrder)[number]) ||
                  a.name.localeCompare(b.name),
              );

            if (!items.length) return null;

            return (
              <div key={r.id} className="space-y-1">
                <div className="text-[10px] font-cinzel font-bold tracking-wider text-[#c9a961] uppercase px-2 py-0.5 bg-[#17140f] rounded border border-[rgba(201,169,97,0.15)]">
                  {r.name}
                </div>

                <div className="space-y-0.5">
                  {items.map((p) => {
                    const isSelected = selectedPlace?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onSelectPlace(p);
                          onFlyTo(p.x, p.y, 3.8);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-all ${
                          isSelected
                            ? 'bg-[#1e1913] border border-[rgba(201,169,97,0.4)] shadow-[0_1px_4px_rgba(201,169,97,0.2)]'
                            : 'hover:bg-[#14120e] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="shrink-0"
                            dangerouslySetInnerHTML={{ __html: iconSVG(p.type) }}
                          />
                          <span
                            className={`text-xs font-serif truncate ${
                              isSelected ? 'text-[#f5ede0] font-bold' : 'text-[#cfc1ad]'
                            }`}
                          >
                            {p.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-serif text-[#8a7850] shrink-0 ml-2">
                          {typeLabels[p.type] || p.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
