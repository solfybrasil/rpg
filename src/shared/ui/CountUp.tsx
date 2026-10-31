import React, { useEffect, useRef, useState } from 'react';

export interface CountUpProps {
  value: number;
  duration?: number; // ms, default 300
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Animação de contagem numérica fluida (SKILL.md Seção 5)
 * Atualiza números sem quebrar o layout, com tabular-nums.
 */
export const CountUp: React.FC<CountUpProps> = ({
  value,
  duration = 300,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const startValueRef = useRef(value);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = startValueRef.current;
    const diff = value - startValue;

    if (diff === 0) return;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // ease-out rápido
      const ease = 1 - (1 - progress) ** 3;
      const nextVal = Math.round(startValue + diff * ease);
      setDisplayValue(nextVal);
      startValueRef.current = nextVal;

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        startValueRef.current = value;
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value, duration]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {displayValue.toLocaleString('pt-BR')}
      {suffix}
    </span>
  );
};
