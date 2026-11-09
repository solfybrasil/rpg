import { lazy, Suspense, useState } from 'react';
import { toast } from 'sonner';
import { AldrenorMapView } from '../aldrenor/AldrenorMapView';
import type { WorldPlace } from '../aldrenor/useWorldMap';
import { getCityMapData } from '../data/cityData';
import type { MapPlace } from '../types';

const CityMapModal = lazy(() =>
  import('./CityMapModal').then((m) => ({ default: m.CityMapModal })),
);

interface Props {
  role: 'player' | 'dm';
  playerId?: string;
}

/** Mapa do continente + visita às cidades (Jogador e Mestre). */
export function WorldMapScreen({ role, playerId }: Props) {
  const [city, setCity] = useState<WorldPlace | null>(null);

  const cityData = city
    ? getCityMapData({
        id: city.id,
        session_code: 'MESA',
        name: city.name,
        type: city.type as MapPlace['type'],
        region_id: city.region,
        x: city.x,
        y: city.y,
        desc_public: city.descPublic,
        discovered: city.discovered,
        visited: city.visited,
      })
    : null;

  return (
    <div className="absolute inset-0">
      <AldrenorMapView role={role} playerId={playerId} onEnterCity={setCity} />
      {cityData && (
        <Suspense fallback={null}>
          <CityMapModal
            city={cityData}
            onClose={() => setCity(null)}
            onEnterEstablishment={(poi, kind) => toast.info(`Você entrou em "${poi}" (${kind}).`)}
          />
        </Suspense>
      )}
    </div>
  );
}
