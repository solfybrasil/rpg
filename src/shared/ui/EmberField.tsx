import React, { useEffect, useRef } from 'react';

export interface EmberFieldProps {
  particleCount?: number; // max 40
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  fadeSpeed: number;
  color: string;
}

/**
 * Campo de Brasas Ambiente em Canvas (SKILL.md Seção 5 e 8)
 * - Máximo de 40 partículas
 * - 30 FPS máx.
 * - Pausa quando a aba está oculta ou prefere movimento reduzido
 */
export const EmberField: React.FC<EmberFieldProps> = ({ particleCount = 28, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respeita prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.parentElement?.clientWidth || 300;
    let height = canvas.parentElement?.clientHeight || 200;
    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.parentElement?.clientWidth || 300;
      height = canvas.parentElement?.clientHeight || 200;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);

    const colors = [
      'rgba(236, 211, 149, ', // Ouro claro
      'rgba(224, 138, 60, ', // Brasas alaranjadas
      'rgba(163, 41, 31, ', // Carmim de fogo
    ];

    const safeCount = Math.min(particleCount, 40);
    const particles: Particle[] = [];

    const createParticle = (): Particle => ({
      x: Math.random() * width,
      y: height + Math.random() * 20,
      size: Math.random() * 2.2 + 0.8,
      speedY: Math.random() * 0.9 + 0.4,
      speedX: (Math.random() - 0.5) * 0.6,
      opacity: Math.random() * 0.7 + 0.3,
      fadeSpeed: Math.random() * 0.005 + 0.003,
      color: colors[Math.floor(Math.random() * colors.length)],
    });

    for (let i = 0; i < safeCount; i++) {
      const p = createParticle();
      p.y = Math.random() * height; // distribui inicialmente
      particles.push(p);
    }

    let animationFrameId: number;
    let lastTime = 0;
    const interval = 1000 / 30; // 30 FPS cap

    const loop = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(loop);

      if (document.hidden) return;

      const delta = currentTime - lastTime;
      if (delta < interval) return;
      lastTime = currentTime - (delta % interval);

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.speedY;
        p.x += p.speedX;
        p.opacity -= p.fadeSpeed;

        if (p.opacity <= 0 || p.y < -10) {
          particles[i] = createParticle();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${p.opacity})`;
          ctx.fill();
        }
      }
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [particleCount]);

  return (
    <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 z-0 ${className}`} />
  );
};
