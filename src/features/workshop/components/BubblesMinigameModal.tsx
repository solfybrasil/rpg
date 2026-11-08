import { FlaskConical, Sparkles, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import type { MinigameResult } from '../types';

interface Bubble {
  id: number;
  x: number; // %
  y: number; // px from bottom
  size: number; // px
  speed: number;
  color: string;
  isCatalyst?: boolean;
  popped?: boolean;
}

interface BubblesMinigameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: MinigameResult) => void;
}

export const BubblesMinigameModal: React.FC<BubblesMinigameModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [poppedCount, setPoppedCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(4);

  const bubblesRef = useRef<Bubble[]>([]);
  const nextIdRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const poppedCountRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;

    poppedCountRef.current = 0;
    setPoppedCount(0);
    setFeedback(null);
    setTimeLeft(4);
    isRunningRef.current = true;
    bubblesRef.current = [];

    // Spawna bolhas iniciais
    for (let i = 0; i < 5; i++) {
      spawnBubble();
    }

    let lastSpawn = performance.now();
    let lastTime = performance.now();
    const startTime = performance.now();

    const loop = (now: number) => {
      if (!isRunningRef.current) return;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Atualiza timer
      const elapsed = (now - startTime) / 1000;
      const remaining = Math.max(0, 4 - Math.floor(elapsed));
      setTimeLeft(remaining);

      // Spawna novas bolhas a cada 600ms
      if (now - lastSpawn > 600 && bubblesRef.current.length < 12) {
        spawnBubble();
        lastSpawn = now;
      }

      // Move bolhas para cima
      bubblesRef.current = bubblesRef.current
        .map((b) => ({
          ...b,
          y: b.y + b.speed * dt,
        }))
        .filter((b) => b.y < 420 && !b.popped);

      setBubbles([...bubblesRef.current]);

      if (elapsed >= 4) {
        finishMinigame();
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      isRunningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen]);

  const spawnBubble = () => {
    const isCatalyst = Math.random() < 0.25;
    const bubble: Bubble = {
      id: nextIdRef.current++,
      x: 15 + Math.random() * 70, // 15% a 85% da largura
      y: 10 + Math.random() * 30,
      size: isCatalyst ? 48 : 34 + Math.random() * 16,
      speed: 60 + Math.random() * 60,
      color: isCatalyst ? '#c084fc' : '#38bdf8',
      isCatalyst,
    };
    bubblesRef.current.push(bubble);
  };

  const handlePopBubble = (id: number, isCatalyst?: boolean) => {
    bubblesRef.current = bubblesRef.current.filter((b) => b.id !== id);
    setBubbles([...bubblesRef.current]);

    const newCount = poppedCountRef.current + (isCatalyst ? 2 : 1);
    poppedCountRef.current = newCount;
    setPoppedCount(newCount);

    if (newCount >= 4 && !feedback) {
      setFeedback('DESTILAÇÃO PURA ALCANÇADA! (+2 NO TESTE)');
    }
  };

  const finishMinigame = () => {
    isRunningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const count = poppedCountRef.current;
    let res: MinigameResult;

    if (count >= 4) {
      setFeedback('DESTILAÇÃO PURA! (+2)');
      res = {
        completed: true,
        score: 'perfeito',
        modifierBonus: 2,
        doubleYield: true,
        label: 'Destilação Pura (+2 & Dobro em Brilhante)',
      };
    } else if (count >= 2) {
      setFeedback('VAPOR CONDENSADO (+1)');
      res = {
        completed: true,
        score: 'bom',
        modifierBonus: 1,
        doubleYield: false,
        label: 'Vapor Condensado (+1)',
      };
    } else {
      setFeedback('DESTILAÇÃO BÁSICA (+0)');
      res = {
        completed: true,
        score: 'normal',
        modifierBonus: 0,
        doubleYield: false,
        label: 'Destilação Padrão',
      };
    }

    setTimeout(() => {
      onComplete(res);
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-[#9a917f] hover:text-[#f5ede0] rounded-full bg-[#14120e] border border-[rgba(201,169,97,0.3)] transition-colors cursor-pointer"
      >
        <X size={20} />
      </button>

      {/* Caldeirão Central */}
      <div className="relative mb-3">
        <div className="w-24 h-24 rounded-2xl border-2 border-[rgba(168,85,247,0.5)] bg-[#14120e] flex items-center justify-center shadow-[0_0_30px_rgba(192,132,252,0.3)]">
          <img
            src="/assets/alquimia/caldeirao.webp"
            alt="Caldeirão"
            className="w-16 h-16 object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      </div>

      <h2 className="text-xl font-['Cinzel',serif] font-bold text-[#f5ede0] mb-1 tracking-wider uppercase">
        Minigame das Bolhas
      </h2>
      <p className="text-xs text-[#9a917f] font-serif italic mb-3 text-center max-w-xs">
        Estoure as bolhas de essência e vapor antes que escapem para aumentar o poder do elixir!
      </p>

      {/* Estatísticas e Tempo */}
      <div className="flex items-center gap-4 text-xs font-['Cinzel',serif] mb-3">
        <span className="text-[#ffd27a] font-bold">Tempo: {timeLeft}s</span>
        <span className="text-[#c084fc]">Bolhas: {poppedCount} estouradas</span>
      </div>

      {/* Câmara de Bolhas (400px x 320px) */}
      <div className="relative w-[340px] h-[340px] rounded-2xl bg-gradient-to-t from-[#2a133d] via-[#14120e] to-[#0a0907] border-2 border-[rgba(168,85,247,0.4)] overflow-hidden shadow-2xl mb-4">
        {bubbles.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => handlePopBubble(b.id, b.isCatalyst)}
            className="absolute rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-75 select-none focus:outline-none"
            style={{
              left: `${b.x}%`,
              bottom: `${b.y}px`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              backgroundColor: `${b.color}20`,
              borderColor: b.color,
              borderWidth: b.isCatalyst ? '2px' : '1.5px',
              boxShadow: `0 0 12px ${b.color}80`,
              transform: 'translate(-50%, 0)',
            }}
          >
            {b.isCatalyst ? (
              <Sparkles size={14} className="text-purple-200 animate-pulse pointer-events-none" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-white/70 pointer-events-none" />
            )}
          </button>
        ))}
      </div>

      {feedback && (
        <span className="text-sm font-['Cinzel',serif] font-bold text-[#ffd27a] tracking-wider animate-in zoom-in-75 duration-150">
          {feedback}
        </span>
      )}
    </div>
  );
};
