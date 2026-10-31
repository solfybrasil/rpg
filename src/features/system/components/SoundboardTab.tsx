import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Square,
  Play,
  RotateCcw,
  Sparkles,
  Music,
  Radio,
} from 'lucide-react';
import {
  ATMOSPHERES,
  SFX_ITEMS,
  playAtmosphere,
  stopAtmosphere,
  getActiveAtmosphere,
  playProceduralSfx,
  setSoundboardVolume,
  getSoundboardVolume,
  SoundAtmosphereDef,
} from '../services/soundboardService';

export const SoundboardTab: React.FC = () => {
  const [activeLoop, setActiveLoop] = useState<string | null>(getActiveAtmosphere());
  const [volume, setVolume] = useState<number>(Math.round(getSoundboardVolume() * 100));
  const [lastSfxPlayed, setLastSfxPlayed] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLoop(getActiveAtmosphere());
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    setSoundboardVolume(val / 100);
  };

  const handleToggleAtmosphere = (item: SoundAtmosphereDef) => {
    playAtmosphere(item.id);
    setActiveLoop(getActiveAtmosphere());
  };

  const handlePlaySfx = (item: SoundAtmosphereDef) => {
    playProceduralSfx(item.id);
    setLastSfxPlayed(item.id);
    setTimeout(() => {
      setLastSfxPlayed((prev) => (prev === item.id ? null : prev));
    }, 600);
  };

  const handleStopAll = () => {
    stopAtmosphere();
    setActiveLoop(null);
  };

  return (
    <div className="space-y-8" data-testid="soundboard-tab">
      {/* Control Bar: Volume & Stop */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/80 border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20">
            <Radio size={20} className={activeLoop ? 'animate-pulse text-[var(--gold)]' : 'text-white/40'} />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm text-[var(--text-1)]">
              Mesa Acústica Sintética
            </h3>
            <p className="text-xs text-[var(--text-2)] font-serif">
              {activeLoop ? (
                <span className="text-[var(--gold)] font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--gold)] animate-ping inline-block" />
                  Transmitindo: {ATMOSPHERES.find((a) => a.id === activeLoop)?.name}
                </span>
              ) : (
                'Nenhuma ambiência ativa em loop'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Master Volume */}
          <div className="flex items-center gap-2.5 bg-black/40 px-3.5 py-2 rounded-xl border border-white/5">
            {volume === 0 ? (
              <VolumeX size={16} className="text-white/40" />
            ) : (
              <Volume2 size={16} className="text-[var(--gold)]" />
            )}
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              data-testid="master-volume-slider"
              className="w-24 sm:w-32 accent-[var(--gold)] cursor-pointer h-1.5 bg-white/10 rounded-lg"
              title="Volume Master"
            />
            <span className="text-xs font-mono text-white/60 w-8 text-right">{volume}%</span>
          </div>

          {/* Stop All */}
          <button
            type="button"
            onClick={handleStopAll}
            data-testid="stop-all-audio-btn"
            disabled={!activeLoop}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-serif text-xs font-bold transition-all cursor-pointer border ${
              activeLoop
                ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 active:scale-95'
                : 'bg-white/5 text-white/30 border-white/5 cursor-not-allowed opacity-50'
            }`}
          >
            <Square size={13} className="fill-current" />
            Silenciar Tudo
          </button>
        </div>
      </div>

      {/* 1. Ambiências em Loop */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music size={16} className="text-[var(--gold)]" />
            <h2 className="font-serif font-bold text-base text-[var(--text-1)]">
              Ambiências & Paisagens Sonoras
            </h2>
          </div>
          <span className="text-[11px] text-[var(--text-2)] font-serif">
            Síntese Web Audio procedural (Loop infinito)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {ATMOSPHERES.map((item) => {
            const isPlaying = activeLoop === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`soundboard-atmosphere-${item.id}`}
                onClick={() => handleToggleAtmosphere(item)}
                className={`group relative flex flex-col items-center justify-between p-4 rounded-2xl aspect-square text-center transition-all cursor-pointer overflow-hidden border ${
                  isPlaying
                    ? 'bg-neutral-900 border-[var(--gold)] ring-2 ring-[var(--gold)]/80 shadow-[0_0_20px_rgba(245,182,91,0.25)]'
                    : 'bg-neutral-900/60 border-white/10 hover:border-white/25 hover:bg-neutral-900/90 active:scale-[0.98]'
                }`}
              >
                {/* Active animated bottom progress bar */}
                {isPlaying && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--gold)] animate-pulse shadow-[0_0_8px_var(--gold)]" />
                )}

                {/* Status Indicator */}
                <div className="w-full flex items-center justify-between text-[10px]">
                  <span
                    className={`px-1.5 py-0.5 rounded font-mono uppercase tracking-wider text-[9px] ${
                      isPlaying
                        ? 'bg-[var(--gold)]/20 text-[var(--gold)] font-bold'
                        : 'text-white/30 group-hover:text-white/50'
                    }`}
                  >
                    {isPlaying ? 'TOCANDO' : 'AMBIENTE'}
                  </span>
                  {isPlaying && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--gold)] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--gold)]" />
                    </span>
                  )}
                </div>

                {/* Big Icon */}
                <div className="my-auto flex flex-col items-center gap-1.5">
                  <span className="text-3xl select-none filter drop-shadow-sm group-hover:scale-110 transition-transform">
                    {item.icon}
                  </span>
                  <span
                    className={`font-serif font-bold text-xs sm:text-sm line-clamp-1 ${
                      isPlaying ? 'text-[var(--gold)]' : 'text-[var(--text-1)]'
                    }`}
                  >
                    {item.name}
                  </span>
                </div>

                {/* Description tooltip / subtitle */}
                <p className="text-[10px] text-[var(--text-2)] font-serif line-clamp-1 w-full">
                  {item.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Efeitos Sonoros Instantâneos (SFX) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" />
            <h2 className="font-serif font-bold text-base text-[var(--text-1)]">
              Efeitos Sonoros & Impactos (SFX)
            </h2>
          </div>
          <span className="text-[11px] text-[var(--text-2)] font-serif">
            Disparos sonoros rápidos com feedback visual
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {SFX_ITEMS.map((item) => {
            const isFlashing = lastSfxPlayed === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`soundboard-sfx-${item.id}`}
                onClick={() => handlePlaySfx(item)}
                className={`group relative flex flex-col items-center justify-between p-4 rounded-2xl aspect-square text-center transition-all cursor-pointer overflow-hidden border active:scale-95 ${
                  isFlashing
                    ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.35)] scale-95'
                    : 'bg-neutral-900/60 border-white/10 hover:border-amber-400/40 hover:bg-neutral-900/90'
                }`}
              >
                {/* Header indicator */}
                <div className="w-full flex items-center justify-between text-[10px]">
                  <span className="px-1.5 py-0.5 rounded font-mono uppercase tracking-wider text-[9px] text-white/30 group-hover:text-amber-400/80">
                    SFX
                  </span>
                  <Play size={10} className="text-white/20 group-hover:text-amber-400 transition-colors" />
                </div>

                {/* Big Icon */}
                <div className="my-auto flex flex-col items-center gap-1.5">
                  <span className="text-3xl select-none filter drop-shadow-sm group-hover:scale-110 transition-transform">
                    {item.icon}
                  </span>
                  <span className="font-serif font-bold text-xs sm:text-sm text-[var(--text-1)] group-hover:text-amber-200 transition-colors line-clamp-1">
                    {item.name}
                  </span>
                </div>

                {/* Subtitle */}
                <p className="text-[10px] text-[var(--text-2)] font-serif line-clamp-1 w-full">
                  {item.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
