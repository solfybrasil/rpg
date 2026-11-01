import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { CityMapData, MapPin, MapPlace, MapState } from '../types';
import mapRegions from '../data/mapRegions';
import { getCityMapData } from '../data/cityData';
import { createMapEngine } from '../engine/mapEngine';
import { MapPanel } from './MapPanel';
import { CityMapModal } from './CityMapModal';
import { DEFAULT_PLACES } from '../data/defaultPlaces';
import {
  fetchMapData,
  createMapPin,
  deleteMapPin,
  updateMapPlace,
  deleteMapPlace,
  createMapPlace,
  setRegionDiscovered,
  updateMapState,
  subscribeToMapRealtime,
} from '../api';
import { Compass, Plus, Minus, Maximize2, MapPin as MapPinIcon, X, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export interface WorldMapViewProps {
  userRole?: 'player' | 'dm';
  role?: 'player' | 'dm';
  sessionCode?: string;
  playerId?: string;
}

export function WorldMapView({ userRole, role: propRole, sessionCode = 'MESA', playerId = 'anon' }: WorldMapViewProps) {
  const effectiveRole = userRole || propRole || 'player';
  const isDM = effectiveRole === 'dm';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<ReturnType<typeof createMapEngine> | null>(null);

  // Estados carregados do banco de dados
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [regionsData, setRegionsData] = useState<{ region_id: string; discovered: boolean }[]>([]);
  const [mapState, setMapState] = useState<MapState | null>(null);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de navegação e seleção
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [activeCityMap, setActiveCityMap] = useState<CityMapData | null>(null);
  const [isPlayerView, setIsPlayerView] = useState(false);
  const [isSignalMode, setIsSignalMode] = useState(false);

  // Modais de criação/inspeção de pin e place
  const [pinModalCoords, setPinModalCoords] = useState<{ x: number; y: number } | null>(null);
  const [pinNote, setPinNote] = useState('');
  const [activePinPopup, setActivePinPopup] = useState<MapPin | null>(null);
  const [createPlaceCoords, setCreatePlaceCoords] = useState<{ x: number; y: number } | null>(null);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceType, setNewPlaceType] = useState<MapPlace['type']>('cid');

  // Mapeamento de névoa de guerra
  const regionsFog = useMemo(() => {
    const fog: Record<string, boolean> = {};
    regionsData.forEach((r) => {
      fog[r.region_id] = Boolean(r.discovered);
    });
    // Fallback padrão se vazio
    if (Object.keys(fog).length === 0) {
      fog.charnecas = true;
      fog.aridas = true;
      fog.fuligem = true;
    }
    return fog;
  }, [regionsData]);

  // Carrega dados iniciais
  const loadData = useCallback(async () => {
    try {
      const data = await fetchMapData(sessionCode, effectiveRole);
      const loadedPlaces = (data.places && data.places.length > 0) ? data.places : DEFAULT_PLACES;
      setPlaces(loadedPlaces as MapPlace[]);
      setRegionsData(data.regions as { region_id: string; discovered: boolean }[]);
      setMapState(data.state as MapState | null);
      setPins(data.pins as MapPin[]);
    } catch (err) {
      console.error('[MAP] Falha ao carregar dados do mapa, usando fallback canônico:', err);
      setPlaces(DEFAULT_PLACES);
    } finally {
      setLoading(false);
    }
  }, [sessionCode, effectiveRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler ao clicar num lugar
  const handleSelectPlace = useCallback((p: MapPlace | null) => {
    setSelectedPlace(p);
    // Se for uma cidade e clicada diretamente, pode abrir ou oferecer o botão
    if (p && ['cap', 'cid', 'por'].includes(p.type)) {
      // Abre o mapa da cidade ou atualiza a seleção
    }
  }, []);

  const handleOpenCityMap = useCallback((place: MapPlace) => {
    const region = mapRegions.find((r) => r.id === (place.region_id || place.region));
    const cityData = getCityMapData(place, region?.name || 'Aldrenor');
    setActiveCityMap(cityData);
  }, []);

  // Inicializa o engine do mapa no canvas
  useEffect(() => {
    if (!canvasRef.current || loading) return;

    const canvas = canvasRef.current;
    const initialParty = mapState
      ? { x: Number(mapState.party_x), y: Number(mapState.party_y), place_id: mapState.party_place_id }
      : { x: 1090, y: 1045, place_id: null };
    const initialRoute = Array.isArray(mapState?.route)
      ? mapState.route
      : [[975, 515], [995, 548], [1018, 585], [1040, 655], [1070, 885], [1090, 1045]];

    const engine = createMapEngine(canvas, {
      places,
      regionsFog,
      party: initialParty,
      route: initialRoute as [number, number][],
      pins: isDM ? pins : pins.filter((p) => p.player_id === playerId),
      role: effectiveRole,
      isPlayerView,
      ping: mapState?.ping || null,
      onSelectPlace: (p) => {
        handleSelectPlace(p);
        if (p && ['cap', 'cid', 'por'].includes(p.type)) {
          // Também permite abrir direto
          handleOpenCityMap(p);
        }
      },
      onPinClick: (pin) => setActivePinPopup(pin),
      onEmptyLongPress: ({ x, y }) => {
        if (isDM && !isPlayerView) {
          setCreatePlaceCoords({ x, y });
        } else {
          setPinModalCoords({ x, y });
        }
      },
      onEmptyRightClick: ({ x, y }) => {
        if (isDM && !isPlayerView) {
          setCreatePlaceCoords({ x, y });
        } else {
          setPinModalCoords({ x, y });
        }
      },
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [loading]);

  // Sincronização em tempo real via Supabase Realtime
  useEffect(() => {
    const unsub = subscribeToMapRealtime(sessionCode, {
      onPlaceChange: (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setPlaces((prev) => [...prev.filter((p) => p.id !== payload.new.id), payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setPlaces((prev) => prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p)));
        } else if (payload.eventType === 'DELETE') {
          setPlaces((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      },
      onRegionChange: (payload: any) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setRegionsData((prev) => {
            const exists = prev.some((r) => r.region_id === payload.new.region_id);
            if (exists) {
              return prev.map((r) => (r.region_id === payload.new.region_id ? payload.new : r));
            }
            return [...prev, payload.new];
          });
        }
      },
      onStateChange: (payload: any) => {
        if (payload.new) {
          setMapState(payload.new);
          if (payload.new.ping && engineRef.current) {
            engineRef.current.ping(payload.new.ping);
          }
        }
      },
      onPinChange: (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setPins((prev) => [...prev.filter((p) => p.id !== payload.new.id), payload.new]);
        } else if (payload.eventType === 'DELETE') {
          setPins((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      },
    });

    return () => {
      unsub();
    };
  }, [sessionCode]);

  // Atualiza referências dinâmicas no engine
  useEffect(() => {
    engineRef.current?.setPlaces(places);
  }, [places]);

  useEffect(() => {
    engineRef.current?.setRegionsFog(regionsFog);
  }, [regionsFog]);

  useEffect(() => {
    if (mapState) {
      engineRef.current?.setParty({
        x: Number(mapState.party_x),
        y: Number(mapState.party_y),
        place_id: mapState.party_place_id,
      });
      if (Array.isArray(mapState.route)) {
        engineRef.current?.setRoute(mapState.route);
      }
    }
  }, [mapState]);

  useEffect(() => {
    const visiblePins = isDM ? pins : pins.filter((p) => p.player_id === playerId);
    engineRef.current?.setPins(visiblePins);
  }, [pins, isDM, playerId]);

  useEffect(() => {
    engineRef.current?.setPlayerView(isPlayerView);
  }, [isPlayerView]);

  // Salvar novo alfinete
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModalCoords) return;

    try {
      const created = await createMapPin({
        session_code: sessionCode,
        player_id: playerId,
        x: pinModalCoords.x,
        y: pinModalCoords.y,
        note: pinNote,
      });
      setPins((prev) => [...prev, created]);
      setPinModalCoords(null);
      setPinNote('');
      toast.success('Alfinete fincado na cartografia.');
    } catch (err: any) {
      toast.error('Erro ao fincar alfinete: ' + err.message);
    }
  };

  // Remover alfinete
  const handleDeletePin = async (pinId: string) => {
    try {
      await deleteMapPin(pinId);
      setPins((prev) => prev.filter((p) => p.id !== pinId));
      setActivePinPopup(null);
      toast.success('Alfinete removido.');
    } catch (err: any) {
      toast.error('Erro ao remover alfinete: ' + err.message);
    }
  };

  // Disparar ping
  const handleStartPing = () => {
    setIsSignalMode(true);
    toast.info('Toque em qualquer ponto do mapa para emitir o sinal de ping.');
  };

  // Mover grupo (DM)
  const handleSetPartyPlace = async (place: MapPlace) => {
    const currentRoute = Array.isArray(mapState?.route) ? [...mapState.route] : [];
    const nextRoute = [...currentRoute, [Number(place.x), Number(place.y)] as [number, number]];

    const updates = {
      party_place_id: place.id,
      party_x: Number(place.x),
      party_y: Number(place.y),
      route: nextRoute,
    };

    setMapState((prev) => ({ ...(prev || { session_code: sessionCode }), ...updates } as MapState));
    try {
      await updateMapState(sessionCode, updates);
      if (!place.visited) {
        await updateMapPlace(place.id, { visited: true });
      }
      toast.success(`O Grupo agora está em ${place.name}!`);
    } catch (err: any) {
      toast.error('Falha ao mover grupo: ' + err.message);
    }
  };

  return (
    <div className="relative w-full h-[calc(100dvh-120px)] min-h-[460px] overflow-hidden bg-[#10181b] select-none">
      {/* Canvas Principal */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none cursor-grab active:cursor-grabbing"
      />

      {/* Painel Lateral de Busca e Lugares */}
      <MapPanel
        places={places}
        selectedPlace={selectedPlace}
        onSelectPlace={handleSelectPlace}
        onFlyTo={(x, y, z) => engineRef.current?.flyTo(x, y, z)}
        role={effectiveRole}
        isPlayerView={isPlayerView}
        onTogglePlayerView={() => setIsPlayerView(!isPlayerView)}
        regionsFog={regionsFog}
        onToggleRegionDiscovered={(regId, disc) => setRegionDiscovered(sessionCode, regId, disc)}
        onUpdatePlace={(id, upd) => updateMapPlace(id, upd)}
        onDeletePlace={(id) => deleteMapPlace(id)}
        onSetPartyPlace={handleSetPartyPlace}
        onUndoRoute={() => {}}
        onStartSignalMode={handleStartPing}
        isSignalMode={isSignalMode}
        onOpenCityMap={handleOpenCityMap}
        onLayersChange={(l) => engineRef.current?.setLayers(l)}
        onHiddenTypesChange={(h) => engineRef.current?.setHiddenTypes(h)}
      />

      {/* Controles Flutuantes de Zoom (Canto Inferior Direito) */}
      <div className="absolute bottom-5 right-5 z-20 flex flex-col gap-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
        <button
          type="button"
          onClick={() => engineRef.current?.zoomIn()}
          aria-label="Aproximar zoom"
          className="w-9 h-9 rounded-md border border-[#735429] bg-[#1a140f]/90 text-[#ecd395] hover:bg-[#2e2014] hover:border-[#c9a45c] flex items-center justify-center font-bold text-base transition-colors"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          onClick={() => engineRef.current?.zoomOut()}
          aria-label="Afastar zoom"
          className="w-9 h-9 rounded-md border border-[#735429] bg-[#1a140f]/90 text-[#ecd395] hover:bg-[#2e2014] hover:border-[#c9a45c] flex items-center justify-center font-bold text-base transition-colors"
        >
          <Minus size={16} />
        </button>
        <button
          type="button"
          onClick={() => engineRef.current?.fit()}
          aria-label="Ver o continente inteiro"
          className="w-9 h-9 rounded-md border border-[#735429] bg-[#1a140f]/90 text-[#ecd395] hover:bg-[#2e2014] hover:border-[#c9a45c] flex items-center justify-center font-bold text-xs transition-colors"
          title="Ver o continente inteiro"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* MODAL: MAPA DA CIDADE AO CLICAR */}
      {activeCityMap && (
        <CityMapModal
          city={activeCityMap}
          onClose={() => setActiveCityMap(null)}
          onEnterEstablishment={(poiName, kind) => {
            toast.info(`Você entrou em "${poiName}" (${kind}).`);
          }}
        />
      )}

      {/* MODAL: NOVO ALFINETE PESSOAL */}
      {pinModalCoords && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <form
            onSubmit={handleSavePin}
            className="w-full max-w-sm rounded-lg border border-[#c9a45c] bg-[#1a140f] p-4 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-[#5a462b]/50 pb-2">
              <h3 className="font-cinzel text-sm font-bold text-[#ecd395] flex items-center gap-1.5">
                <MapPinIcon size={14} className="text-[#c9a45c]" />
                <span>Novo Marcador Pessoal</span>
              </h3>
              <button
                type="button"
                onClick={() => setPinModalCoords(null)}
                className="text-[#8c7b68] hover:text-[#ecd395]"
              >
                ✕
              </button>
            </div>
            <p className="text-xs font-serif italic text-[#a89070]">
              Este alfinete fica visível somente para você na mesa.
            </p>
            <input
              type="text"
              placeholder="Anotação (ex: esconderijo, pista, dívida)..."
              value={pinNote}
              onChange={(e) => setPinNote(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-[#5a462b] bg-[#120d09] text-xs font-serif text-[#ecd395] focus:border-[#c9a45c] focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPinModalCoords(null)}
                className="px-3 py-1 rounded text-xs font-serif text-[#a89070] hover:text-[#ecd395]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded font-cinzel text-xs font-bold border border-[#c9a45c] bg-[#2b2014] text-[#ecd395] hover:bg-[#3d2c1b]"
              >
                Fincar Marcador
              </button>
            </div>
          </form>
        </div>
      )}

      {/* POPUP: DETALHE DO ALFINETE PESSOAL */}
      {activePinPopup && (
        <div className="absolute top-4 right-4 z-30 w-72 rounded-lg border border-[#a3291f] bg-[#1c140f]/95 p-3.5 shadow-2xl space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="font-cinzel text-xs font-bold text-[#fca5a5] flex items-center gap-1">
              <MapPinIcon size={13} className="text-[#ef4444]" />
              <span>Seu Marcador Pessoal</span>
            </span>
            <button
              type="button"
              onClick={() => setActivePinPopup(null)}
              className="text-[#8c7b68] hover:text-[#ecd395]"
            >
              ✕
            </button>
          </div>
          <p className="text-xs font-serif italic text-[#ecd395]">
            "{activePinPopup.note || 'Sem anotação'}"
          </p>
          <div className="pt-2 border-t border-[#4a3828]/50 flex justify-end">
            <button
              type="button"
              onClick={() => handleDeletePin(activePinPopup.id)}
              className="px-2.5 py-1 rounded text-[11px] font-cinzel border border-[#ef4444]/60 bg-[#450a0a] text-[#fca5a5] hover:bg-[#5f0d0d]"
            >
              Remover Alfinete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
