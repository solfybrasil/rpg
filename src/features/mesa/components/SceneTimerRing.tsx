import React, { useState, useEffect, useRef, memo } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

interface SceneTimerRingProps {
  defaultSeconds?: number;
}

export const SceneTimerRing: React.FC<SceneTimerRingProps> = memo(({ defaultSeconds = 60 }) => {
  const [totalSeconds, setTotalSeconds] = useState<number>(defaultSeconds);
  const [secondsLeft, setSecondsLeft] = useState<number>(defaultSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, secondsLeft]);

  const handleToggle = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(totalSeconds);
      setIsRunning(true);
    } else {
      setIsRunning((prev) => !prev);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(totalSeconds);
  };

  const handleSetPreset = (secs: number) => {
    setIsRunning(false);
    setTotalSeconds(secs);
    setSecondsLeft(secs);
  };

  // Cálculos SVG do anel
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? (secondsLeft / totalSeconds) : 0;
  const strokeDashoffset = circumference - progress * circumference;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      className="flex flex-col items-center p-3 rounded-2xl bg-neutral-900/60 border border-white/10 backdrop-blur-md shadow-2xl"
      data-testid="scene-timer-container"
    >
      {/* SVG Ring & Countdown */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 110 110">
          {/* Background Ring */}
          <circle
            cx="55"
            cy="55"
            r={radius}
            className="stroke-white/10 fill-none"
            strokeWidth="3.5"
          />
          {/* Animated Gold Ring */}
          <circle
            cx="55"
            cy="55"
            r={radius}
            className="stroke-[var(--gold)] fill-none transition-all duration-1000 ease-linear"
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Digital Time Center Display (min font-size 24px) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            data-testid="scene-timer-display"
            className="font-mono font-bold text-2xl text-[var(--gold)] tracking-wider drop-shadow-sm"
          >
            {formattedTime}
          </span>
          <span className="text-[10px] font-serif uppercase tracking-widest text-white/40">
            {isRunning ? 'Ativo' : secondsLeft === 0 ? 'Fim' : 'Pausa'}
          </span>
        </div>
      </div>

      {/* Control Buttons (Play/Pause, Reset, Presets) */}
      <div className="flex items-center gap-2 mt-2">
        <button
          type="button"
          onClick={handleToggle}
          data-testid="scene-timer-toggle-btn"
          className="p-2 rounded-xl bg-[var(--gold)]/20 hover:bg-[var(--gold)]/30 text-[var(--gold)] border border-[var(--gold)]/40 transition-all cursor-pointer active:scale-95"
          title={isRunning ? 'Pausar' : 'Iniciar'}
        >
          {isRunning ? <Pause size={16} /> : <Play size={16} className="fill-current" />}
        </button>

        <button
          type="button"
          onClick={handleReset}
          data-testid="scene-timer-reset-btn"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-all cursor-pointer active:scale-95"
          title="Reiniciar"
        >
          <RotateCcw size={16} />
        </button>

        {/* Preset selector pills */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-[11px] font-mono">
          {[30, 60, 120].map((sec) => (
            <button
              key={sec}
              type="button"
              data-testid={`scene-timer-preset-${sec}`}
              onClick={() => handleSetPreset(sec)}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                totalSeconds === sec
                  ? 'bg-[var(--gold)] text-black font-bold'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {sec}s
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

SceneTimerRing.displayName = 'SceneTimerRing';
