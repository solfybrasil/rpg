import { useEffect, useRef } from 'react';

export function SanctuaryEyeCanvas({ className = '' }: { className?: string }) {
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

    const width = (canvas.width = 160);
    const height = (canvas.height = 90);
    const cx = width / 2;
    const cy = height / 2;

    const handleVisibility = () => {
      isPaused = document.hidden;
      if (!isPaused && animId === null) {
        lastTime = performance.now();
        animId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let t = 0;

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
      t += 0.035;

      const breathe = Math.sin(t) * 0.15;
      const eyeWidth = 54 + breathe * 4;
      const eyeHeight = 24 + breathe * 2;

      // Glow sutil ao redor do olho
      const glowGrad = ctx.createRadialGradient(cx, cy, 6, cx, cy, 48);
      glowGrad.addColorStop(0, 'rgba(230, 80, 20, 0.45)');
      glowGrad.addColorStop(0.5, 'rgba(180, 50, 10, 0.15)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // Contorno da fenda ocular (olho de réptil / entidade cósmica)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - eyeWidth, cy);
      ctx.quadraticCurveTo(cx, cy - eyeHeight, cx + eyeWidth, cy);
      ctx.quadraticCurveTo(cx, cy + eyeHeight, cx - eyeWidth, cy);
      ctx.closePath();
      ctx.clip();

      // Esclera vermelha profunda
      const scleraGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, eyeWidth);
      scleraGrad.addColorStop(0, '#5a130a');
      scleraGrad.addColorStop(0.7, '#2a0604');
      scleraGrad.addColorStop(1, '#110202');
      ctx.fillStyle = scleraGrad;
      ctx.fill();

      // Íris dourada flamejante
      const irisRadius = 16 + Math.sin(t * 1.5) * 1.2;
      const irisGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, irisRadius);
      irisGrad.addColorStop(0, '#fef08a');
      irisGrad.addColorStop(0.4, '#eab308');
      irisGrad.addColorStop(0.8, '#b45309');
      irisGrad.addColorStop(1, '#78350f');

      ctx.beginPath();
      ctx.arc(cx, cy, irisRadius, 0, Math.PI * 2);
      ctx.fillStyle = irisGrad;
      ctx.fill();

      // Pupila vertical em fenda que dilata sutilmente
      const pupilWidth = 3.5 + Math.cos(t * 1.2) * 0.8;
      const pupilHeight = irisRadius * 1.1;

      ctx.fillStyle = '#050201';
      ctx.beginPath();
      ctx.ellipse(cx, cy, pupilWidth, pupilHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      // Brilho especular sutil
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(cx - 3, cy - 4, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Bordas douradas desgastadas do olho
      ctx.beginPath();
      ctx.moveTo(cx - eyeWidth, cy);
      ctx.quadraticCurveTo(cx, cy - eyeHeight, cx + eyeWidth, cy);
      ctx.quadraticCurveTo(cx, cy + eyeHeight, cx - eyeWidth, cy);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(201, 169, 97, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    };

    lastTime = performance.now();
    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none select-none ${className}`}
      width={160}
      height={90}
      aria-hidden="true"
    />
  );
}
