import { useEffect, useRef } from 'react';

interface EldenEmbersCanvasProps {
  count?: number;
  color?: string;
}

export function EldenEmbersCanvas({
  count = 24,
  color = '225, 175, 75',
}: EldenEmbersCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number | null = null;
    let isPaused = false;
    let lastTime = 0;
    const targetFps = 30;
    const frameInterval = 1000 / targetFps;

    // Sprite pré-renderizado em canvas offscreen (elimina cálculos pesados por partícula)
    const spriteSize = 32;
    const offscreen = document.createElement('canvas');
    offscreen.width = spriteSize;
    offscreen.height = spriteSize;
    const offCtx = offscreen.getContext('2d');

    if (offCtx) {
      const half = spriteSize / 2;
      const grad = offCtx.createRadialGradient(half, half, 0, half, half, half);
      grad.addColorStop(0, `rgba(${color}, 1)`);
      grad.addColorStop(0.3, `rgba(${color}, 0.65)`);
      grad.addColorStop(0.7, `rgba(${color}, 0.2)`);
      grad.addColorStop(1, `rgba(${color}, 0)`);

      offCtx.fillStyle = grad;
      offCtx.beginPath();
      offCtx.arc(half, half, half, 0, Math.PI * 2);
      offCtx.fill();
    }

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }, 150);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    const handleVisibility = () => {
      isPaused = document.hidden;
      if (!isPaused && animId === null) {
        lastTime = performance.now();
        animId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 8 + 4,
      speedY: Math.random() * 0.4 + 0.2,
      driftFreq: Math.random() * 0.02 + 0.01,
      driftAmp: Math.random() * 0.8 + 0.3,
      pulseSpeed: Math.random() * 0.03 + 0.015,
      phase: Math.random() * Math.PI * 2,
      baseOpacity: Math.random() * 0.4 + 0.2,
    }));

    let time = 0;

    const render = (now: number) => {
      if (isPaused) {
        animId = null;
        return;
      }

      animId = requestAnimationFrame(render);

      const elapsed = now - lastTime;
      if (elapsed < frameInterval) return;
      lastTime = now - (elapsed % frameInterval);

      ctx.clearRect(0, 0, width, height);
      time += 0.04;

      for (const p of particles) {
        p.y -= p.speedY;
        const drift = Math.sin(time * p.driftFreq + p.phase) * p.driftAmp;
        p.x += drift;

        if (p.y < -20) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -20) p.x = width + 10;
        if (p.x > width + 20) p.x = -10;

        const pulse = Math.sin(time * p.pulseSpeed + p.phase);
        const currentOpacity = Math.max(0.05, Math.min(0.8, p.baseOpacity + pulse * 0.2));

        ctx.globalAlpha = currentOpacity;
        ctx.drawImage(offscreen, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
    };

    lastTime = performance.now();
    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [count, color]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      style={{ opacity: 0.65 }}
      aria-hidden="true"
    />
  );
}
