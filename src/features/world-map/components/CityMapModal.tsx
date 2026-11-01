import React, { useState } from 'react';
import type { CityDistrict, CityMapData } from '../types';
import { StonePanel } from '../../../shared/ui/StonePanel';
import { WaxSeal } from '../../../shared/ui/WaxSeal';
import {
  Castle,
  Store,
  Anchor,
  Hammer,
  Shield,
  Users,
  Compass,
  AlertTriangle,
  X,
  Scroll,
  Sparkles,
  MapPin,
} from 'lucide-react';

interface CityMapModalProps {
  city: CityMapData;
  onClose: () => void;
  onEnterEstablishment?: (poiName: string, kind: string) => void;
}

export function CityMapModal({ city, onClose, onEnterEstablishment }: CityMapModalProps) {
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(
    city.districts[0]?.id || '',
  );

  const activeDistrict: CityDistrict | undefined =
    city.districts.find((d) => d.id === selectedDistrictId) || city.districts[0];

  const getDistrictIcon = (type: CityDistrict['type']) => {
    switch (type) {
      case 'cidadela':
        return <Castle size={16} className="text-[#c9a45c]" />;
      case 'mercado':
        return <Store size={16} className="text-[#c9a45c]" />;
      case 'cais':
        return <Anchor size={16} className="text-[#5c8790]" />;
      case 'artifices':
        return <Hammer size={16} className="text-[#b08f5f]" />;
      case 'guarda':
        return <Shield size={16} className="text-[#a3291f]" />;
      default:
        return <Compass size={16} className="text-[#c9a45c]" />;
    }
  };

  const getDangerBadge = (danger: CityDistrict['dangerLevel']) => {
    switch (danger) {
      case 'Baixo':
        return 'border-[#22c55e]/30 bg-[#22c55e]/10 text-[#86efac]';
      case 'Médio':
        return 'border-[#eab308]/30 bg-[#eab308]/10 text-[#fef08a]';
      case 'Alto':
        return 'border-[#f97316]/30 bg-[#f97316]/10 text-[#fdba74]';
      case 'Extremo':
        return 'border-[#ef4444]/40 bg-[#ef4444]/15 text-[#fca5a5]';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-title"
    >
      <StonePanel
        variant="elevated"
        className="w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border-[#735429]/60 shadow-[0_16px_48px_rgba(0,0,0,0.95)]"
      >
        {/* Header da Cidade */}
        <div className="relative border-b border-[#735429]/40 bg-gradient-to-b from-[#1c1813] to-[#14110e] px-5 py-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <WaxSeal letter={city.name.charAt(0)} size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="city-title"
                  className="font-serif text-xl sm:text-2xl font-bold tracking-wide text-[#ecd395] uppercase font-cinzel"
                >
                  {city.name}
                </h2>
                <span className="text-[11px] font-cinzel tracking-wider px-2 py-0.5 rounded border border-[#c9a45c]/40 bg-[#c9a45c]/10 text-[#c9a45c]">
                  {city.typeLabel}
                </span>
                <span className="text-[11px] font-serif text-[#a89070]">
                  • {city.regionName}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-serif italic text-[#c2b29c] mt-0.5 line-clamp-1">
                {city.population} • Governada por {city.ruler}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-[#a89070] hover:text-[#ecd395] hover:bg-[#2b2216] transition-colors"
            title="Fechar mapa urbano"
            aria-label="Fechar mapa urbano"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo com Grid de Distritos e Pontos de Interesse */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#0f0e0c]/90">
          {/* Descrição & Defesas */}
          <div className="rounded-lg border border-[#4a3a24]/50 bg-[#161310]/80 p-3.5 flex flex-col sm:flex-row gap-3 items-start justify-between">
            <p className="text-xs sm:text-sm font-serif text-[#ecd395]/90 leading-relaxed flex-1">
              {city.description}
            </p>
            <div className="text-[11px] font-serif text-[#a89070] bg-[#1a140d] px-3 py-1.5 rounded border border-[#5a462b]/40 shrink-0">
              <span className="text-[#c9a45c] font-cinzel">Defesa: </span>
              {city.defense}
            </div>
          </div>

          {/* Abas dos Distritos / Bairros */}
          <div>
            <div className="text-[11px] font-cinzel tracking-wider text-[#a89070] uppercase mb-2 flex items-center gap-1.5">
              <MapPin size={13} className="text-[#c9a45c]" />
              <span>Distritos e Bairros de {city.name}</span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {city.districts.map((dist) => {
                const isActive = dist.id === activeDistrict?.id;
                return (
                  <button
                    key={dist.id}
                    type="button"
                    onClick={() => setSelectedDistrictId(dist.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md font-serif text-xs whitespace-nowrap transition-all border ${
                      isActive
                        ? 'border-[#c9a45c] bg-[#2b2014] text-[#ecd395] shadow-[0_2px_8px_rgba(201,164,92,0.2)]'
                        : 'border-[#4a3a24]/60 bg-[#14120f] text-[#a89070] hover:border-[#735429] hover:text-[#ecd395]'
                    }`}
                  >
                    {getDistrictIcon(dist.type)}
                    <span className="font-semibold">{dist.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalhes do Distrito Ativo */}
          {activeDistrict && (
            <div className="rounded-lg border border-[#735429]/40 bg-[#181410] p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#4a3a24]/40 pb-3">
                <div>
                  <h3 className="font-cinzel text-base sm:text-lg font-bold text-[#ecd395]">
                    {activeDistrict.name}
                  </h3>
                  <p className="text-xs font-serif italic text-[#c2b29c]">
                    {activeDistrict.tagline}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-cinzel tracking-wider px-2 py-0.5 rounded border uppercase ${getDangerBadge(
                      activeDistrict.dangerLevel,
                    )}`}
                  >
                    Risco: {activeDistrict.dangerLevel}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm font-serif text-[#cfc1ad] leading-relaxed">
                {activeDistrict.description}
              </p>

              {/* Pontos de Interesse (POIs) */}
              <div>
                <h4 className="text-[11px] font-cinzel tracking-wider text-[#c9a45c] uppercase mb-2.5 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>Locais & Estabelecimentos de Interesse</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeDistrict.pointsOfInterest.map((poi, idx) => (
                    <div
                      key={idx}
                      className="rounded border border-[#4a3a24]/60 bg-[#12100d] p-3 hover:border-[#c9a45c]/50 transition-colors flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-serif font-bold text-sm text-[#ecd395]">
                            {poi.name}
                          </span>
                          <span className="text-[10px] font-cinzel tracking-wider px-1.5 py-0.5 rounded border border-[#5a462b]/50 bg-[#1c1813] text-[#a89070]">
                            {poi.kind}
                          </span>
                        </div>
                        <p className="text-xs font-serif text-[#b8a792] leading-relaxed">
                          {poi.description}
                        </p>
                        {poi.npc && (
                          <div className="mt-2 text-[11px] font-serif text-[#c9a45c] flex items-center gap-1">
                            <Users size={12} className="text-[#a89070]" />
                            <span>Figura chave: <strong>{poi.npc}</strong></span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[#3a2e1d]/40 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onEnterEstablishment?.(poi.name, poi.kind)}
                          className="px-2.5 py-1 text-[11px] font-cinzel tracking-wider rounded border border-[#c9a45c]/50 bg-[#2b2014] text-[#ecd395] hover:bg-[#3d2c1b] transition-colors"
                        >
                          Visitar Local
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Boato / Segredo da Cidade */}
          <div className="rounded-lg border border-[#8b4526]/50 bg-[#1c120e]/60 p-3.5 flex items-start gap-3">
            <Scroll size={18} className="text-[#c9a45c] shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-cinzel font-bold text-[#fca5a5] tracking-wider uppercase mb-0.5 flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-[#ef4444]" />
                <span>Boato sussurrado pelas vielas:</span>
              </div>
              <p className="text-xs font-serif italic text-[#ecd395]/90 leading-relaxed">
                "{city.localRumor}"
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé com botão de fechar */}
        <div className="border-t border-[#735429]/40 bg-[#14110e] px-5 py-3 flex items-center justify-between">
          <span className="text-xs font-serif italic text-[#8c7b68]">
            Mapa Urbano de Aldrenor • Módulo Cartográfico
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded font-cinzel text-xs tracking-wider uppercase border border-[#735429] bg-[#241a10] text-[#ecd395] hover:border-[#c9a45c] hover:bg-[#332415] transition-colors"
          >
            Voltar ao Mapa Geral
          </button>
        </div>
      </StonePanel>
    </div>
  );
}
