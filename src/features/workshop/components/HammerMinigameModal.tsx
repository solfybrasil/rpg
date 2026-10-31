import { Hammer, Sparkles, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import type { MinigameResult } from '../types';

interface HammerMinigameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: MinigameResult) => void;
}

export const HammerMinigameModal: React.FC<HammerMinigameModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [hitFeedback, setHitFeedback] = useState<string | null>(null);
  const [isHit, setIsHit] = useState(false);

  // Refs de animação de 60 FPS direta no DOM (sem re-render de React por frame)
  const markerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const posRef = useRef<number>(0);
  const dirRef = useRef<number>(1);
  const isRunningRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    setIsHit(false);
    setHitFeedback(null);
    posRef.current = 0;
    dirRef.current = 1;
    isRunningRef.current = true;

    // Velocidade de oscilação: 1 ciclo a cada ~1.2s
    let lastTime = performance.now();
    const speed = 110; // % por segundo

    const loop = (currentTime: number) => {
      if (!isRunningRef.current) return;
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      let nextPos = posRef.current + dirRef.current * speed * dt;
      if (nextPos >= 100) {
        nextPos = 100;
        dirRef.current = -1;
      } else if (nextPos <= 0) {
        nextPos = 0;
        dirRef.current = 1;
      }
      posRef.current = nextPos;

      if (markerRef.current) {
        markerRef.current.style.transform = `translateX(${nextPos * 3.2}px)`;
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        handleStrike();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isRunningRef.current = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleStrike = () => {
    if (!isRunningRef.current || isHit) return;
    isRunningRef.current = false;
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    setIsHit(true);

    const currentPct = posRef.current;
    // Zona Dourada: 40% a 60% (centro de 20%)
    const inGoldenZone = currentPct >= 40 && currentPct <= 60;
    // Zona Boa: 30% a 70%
    const inGoodZone = currentPct >= 30 && currentPct <= 70;

    let res: MinigameResult;
    if (inGoldenZone) {
      setHitFeedback('MARTELADA PERFEITA! +2 NO TESTE');
      res = {
        completed: true,
        score: 'perfeito',
        modifierBonus: 2,
        doubleYield: true,
        label: 'Martelada Perfeita (+2 & Dobro em Brilhante)',
      };
    } else if (inGoodZone) {
      setHitFeedback('GOLPE FIRME! +1 NO TESTE');
      res = {
        completed: true,
        score: 'bom',
        modifierBonus: 1,
        doubleYield: false,
        label: 'Golpe Firme (+1)',
      };
    } else {
      setHitFeedback('GOLPE NORMAL (+0)');
      res = {
        completed: true,
        score: 'normal',
        modifierBonus: 0,
        doubleYield: false,
        label: 'Golpe Padrão',
      };
    }

    // Avança para rolagem após curta celebração visual
    setTimeout(() => {
      onComplete(res);
    }, 750);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200">
      {/* Botão de Fechar / Pular */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-900 border border-neutral-800"
        title="Cancelar ou fechar"
      >
        <X size={20} />
      </button>

      {/* Ícone Central da Bigorna */}
      <div className="relative mb-6">
        <div
          className={`w-28 h-28 rounded-2xl border-2 border-amber-600/60 bg-neutral-950 flex items-center justify-center transition-transform ${
            isHit ? 'scale-110 shadow-[0_0_40px_rgba(245,182,91,0.6)]' : 'shadow-2xl'
          }`}
        >
          <img
            src="/assets/forja/bigorna.webp"
            alt="Bigorna"
            className="w-20 h-20 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        {isHit && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping">
            <Sparkles size={48} className="text-amber-400 drop-shadow-[0_0_15px_#f5b65b]" />
          </div>
        )}
      </div>

      <h2 className="text-xl font-mono font-bold text-amber-200 mb-1 tracking-wider uppercase">
        Minigame da Forja
      </h2>
      <p className="text-xs text-neutral-400 font-serif italic mb-6 text-center max-w-xs">
        Acerte o marcador no centro dourado para receber +2 de bônus na rolagem de forja!
      </p>

      {/* Barra de Tempo e Zona Dourada */}
      <div className="relative w-[340px] h-10 rounded-full bg-neutral-950 border-2 border-neutral-800 overflow-hidden shadow-inner flex items-center mb-6">
        {/* Zona Prata / Firme (30% a 70%) */}
        <div className="absolute left-[30%] w-[40%] h-full bg-amber-900/30 border-x border-amber-700/40" />

        {/* Zona Dourada Perfeita (40% a 60%) */}
        <div className="absolute left-[40%] w-[20%] h-full bg-gradient-to-r from-amber-600/50 via-amber-400/80 to-amber-600/50 shadow-[0_0_15px_rgba(245,182,91,0.6)] border-x-2 border-amber-300 flex items-center justify-center">
          <span className="text-[10px] font-mono font-bold text-black/80 tracking-widest uppercase">
            GOLPE
          </span>
        </div>

        {/* Marcador que corre a 60fps */}
        <div
          ref={markerRef}
          className="absolute left-0 top-0.5 w-4 h-9 bg-white rounded-full border-2 border-amber-400 shadow-[0_0_12px_#ffffff] z-10 will-change-transform"
        />
      </div>

      {/* Feedback de Acerto */}
      <div className="h-8 flex items-center justify-center mb-4">
        {hitFeedback && (
          <span className="text-sm font-mono font-bold text-amber-300 tracking-wider animate-in zoom-in-75 duration-150">
            {hitFeedback}
          </span>
        )}
      </div>

      {/* Botão de Golpe */}
      <button
        type="button"
        onClick={handleStrike}
        disabled={isHit}
        className={`flex items-center gap-2 px-8 py-3 rounded-xl font-mono text-sm font-bold uppercase tracking-wider transition-all ${
          isHit
            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            : 'bg-gradient-to-b from-amber-500 to-amber-700 text-neutral-950 shadow-[0_0_20px_rgba(245,182,91,0.4)] hover:brightness-110 active:scale-95 cursor-pointer'
        }`}
      >
        <Hammer size={18} />
        <span>GOLPEAR! (Barra de Espaço)</span>
      </button>
    </div>
  );
};
