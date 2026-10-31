import React, { useState, useMemo, useEffect } from 'react';
import {
  Dices,
  Sparkles,
  Award,
  History,
  Shield,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useHero, useGameState } from '../../../shared/hooks/baseHooks';
import { useSessionStore } from '../../../shared/stores/session';
import { Stepper, DiceResult } from '../../../shared/ui';
import type { RollMode, DiceRollRecord, RollCalculation } from '../types';
import { rollDiceSet, evaluateRoll } from '../engine/diceEngine';
import { recordAndBroadcastRoll, fetchDiceRollsFromDB } from '../api';

const ATTR_LIST = [
  { id: 'corpo', label: 'Corpo' },
  { id: 'vontade', label: 'Vontade' },
  { id: 'astucia', label: 'Astúcia' },
  { id: 'presenca', label: 'Presença' },
] as const;

export const PlayerDiceView: React.FC = () => {
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const heroId = sessionHeroId || 'teste_1';
  const { hero, updateHeroAsync } = useHero(heroId);
  const { data: gameState } = useGameState();

  const effectivePeso = gameState?.current_peso ?? 8;

  // Seleções do teste
  const [selectedAttr, setSelectedAttr] = useState<string>('corpo');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [extraModifier, setExtraModifier] = useState<number>(0);
  const [rollMode, setRollMode] = useState<RollMode>('normal');

  // Estado dos dados grandes
  const [diceValues, setDiceValues] = useState<number[]>([4, 5]);
  const [keptDice, setKeptDice] = useState<number[]>([4, 5]);
  const [isRolling, setIsRolling] = useState(false);
  const [lastCalc, setLastCalc] = useState<RollCalculation | null>(null);
  const [history, setHistory] = useState<DiceRollRecord[]>([]);

  // Atributos do herói
  const charAttrs = useMemo(() => {
    const raw = (hero?.attributes as any) || {};
    return {
      corpo: Number(raw.corpo ?? 0),
      vontade: Number(raw.vontade ?? raw.mente ?? 0),
      astucia: Number(raw.astucia ?? raw.destreza ?? 0),
      presenca: Number(raw.presenca ?? 0),
    };
  }, [hero]);

  // Perícias do herói
  const heroSkills = useMemo(() => {
    const raw = (hero?.skills as any[]) || [];
    return raw.map((sk) => (typeof sk === 'string' ? { name: sk, bonus: 1 } : sk));
  }, [hero]);

  // Modificador total calculado
  const attrBonus = charAttrs[selectedAttr as keyof typeof charAttrs] || 0;
  const skillBonus = selectedSkill
    ? heroSkills.find((s) => s.name?.toLowerCase() === selectedSkill.toLowerCase())?.bonus || 1
    : 0;
  const totalModifier = attrBonus + skillBonus + extraModifier;

  // Carrega histórico inicial
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const records = await fetchDiceRollsFromDB('MESA', 12);
      if (isMounted) setHistory(records as unknown as DiceRollRecord[]);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Executa rolagem
  const handleRoll = async () => {
    if (isRolling) return;
    setIsRolling(true);

    // Efeito de animação rápida
    let frames = 0;
    const interval = setInterval(() => {
      frames++;
      const tempDice = rollDiceSet(rollMode);
      setDiceValues(tempDice);
      if (frames > 8) {
        clearInterval(interval);
        finalizeRoll();
      }
    }, 70);
  };

  const finalizeRoll = async () => {
    const rolledDice = rollDiceSet(rollMode);
    setDiceValues(rolledDice);

    const label = selectedSkill
      ? `${selectedSkill} (${selectedAttr})`
      : `Teste de ${selectedAttr.toUpperCase()}`;

    const calc = evaluateRoll({
      dice: rolledDice,
      modifier: totalModifier,
      peso: effectivePeso,
      mode: rollMode,
      label,
    });

    setKeptDice(calc.kept);
    setLastCalc(calc);
    setIsRolling(false);

    // Se for duplo 6, concede +1 inspiração se possível
    if (calc.tone === 'critico') {
      toast.success('Rolagem Crítica! (Duplo 6) — +1 Inspiração concedida!');
      if (hero && typeof hero.inspiration === 'number') {
        updateHeroAsync({ inspiration: hero.inspiration + 1 }).catch(() => {});
      }
    } else if (calc.tone === 'desastre') {
      toast.error('Desastre Rúnico! (Duplo 1)');
    }

    // Registra e emite broadcast para /mesa
    const record = await recordAndBroadcastRoll({
      sessionCode: 'MESA',
      playerId: heroId,
      playerName: hero?.name || 'Jurado',
      label,
      calc,
    });

    setHistory((prev) => [record, ...prev.slice(0, 19)]);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="font-serif text-xl md:text-2xl font-bold text-[#f5b65b] tracking-wide flex items-center gap-2">
            <Dices className="w-5 h-5" /> Dados Rúnicos do Jurado
          </h1>
          <p className="font-serif text-xs md:text-sm text-white/50 italic">
            2d6 + Atributo + Perícia contra o Peso da Sessão. Transmissão contínua para a mesa.
          </p>
        </div>

        {/* Peso Atual */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono">
          <span className="text-[#a8947c] uppercase tracking-wider font-serif">Peso da Mesa:</span>
          <span className="text-base font-bold text-[#f5b65b]">{effectivePeso}</span>
        </div>
      </div>

      {/* ── ÁREA CENTRAL DOS DADOS GRANDES ── */}
      <div className="flex flex-col items-center justify-center p-8 md:p-12 rounded-3xl bg-gradient-to-b from-[#18181c] to-[#0c0c0e] border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute inset-0 bg-radial-gradient from-[#f5b65b]/10 via-transparent to-transparent pointer-events-none" />

        {/* 2 ou 3 Dados Grandes no Centro */}
        <div className="flex items-center justify-center gap-4 md:gap-6 my-4 z-10">
          {diceValues.map((val, idx) => {
            const isKept =
              rollMode === 'normal' ||
              (keptDice.length === 2 &&
                (val === keptDice[0] || val === keptDice[1]));

            return (
              <div
                key={idx}
                data-testid={`dice-face-${idx}`}
                className={`
                  w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center font-mono font-bold text-3xl md:text-4xl select-none transition-all duration-300
                  ${
                    isRolling
                      ? 'animate-spin scale-105 bg-[#f5b65b]/20 border-2 border-[#f5b65b] text-[#f5b65b]'
                      : isKept
                      ? 'bg-gradient-to-br from-[#2a241e] via-[#1a1612] to-[#100d0a] border-2 border-[#f5b65b] text-[#ffd59a] shadow-xl shadow-[#f5b65b]/20 scale-100'
                      : 'bg-black/40 border border-white/10 text-white/30 scale-90 opacity-60'
                  }
                `}
              >
                {val}
              </div>
            );
          })}
        </div>

        {/* Informação do Modo (Vantagem/Desvantagem) */}
        {rollMode !== 'normal' && (
          <div className="text-xs font-serif italic text-white/50 mb-2 z-10">
            {rollMode === 'vantagem'
              ? 'Rolando 3d6 (mantendo os 2 maiores)'
              : 'Rolando 3d6 (mantendo os 2 menores)'}
          </div>
        )}

        {/* Botão Rolar Dourado no Centro */}
        <div className="mt-4 z-10 w-full max-w-xs">
          <button
            type="button"
            data-testid="roll-dice-button"
            onClick={handleRoll}
            disabled={isRolling}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-b from-[#ca8a04] via-[#b45309] to-[#854d0e] text-[#f5e8c8] font-serif text-sm md:text-base font-bold tracking-widest uppercase border border-[#f5b65b] hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-[#ca8a04]/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Dices className="w-5 h-5" />
            <span>{isRolling ? 'Rolando os Dados...' : 'Rolar Dados'}</span>
          </button>
        </div>
      </div>

      {/* ── RESULTADO DO TESTE (DiceResult) ── */}
      {lastCalc && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <DiceResult
            data-testid="dice-result-card"
            tone={lastCalc.tone}
            total={lastCalc.total}
            peso={lastCalc.peso}
            label={lastCalc.label}
            keptDice={lastCalc.kept}
            modifier={lastCalc.modifier}
          />
        </div>
      )}

      {/* ── PAINEL DE MODIFICADORES COM STEPPER & SELETORES ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        {/* Atributo */}
        <div className="space-y-2">
          <label className="text-[11px] font-serif uppercase tracking-wider text-[#a8947c]">
            Atributo Chave
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {ATTR_LIST.map((at) => {
              const val = charAttrs[at.id];
              const isSelected = selectedAttr === at.id;
              return (
                <button
                  key={at.id}
                  type="button"
                  onClick={() => setSelectedAttr(at.id)}
                  className={`
                    p-2 rounded-xl text-xs font-serif flex items-center justify-between transition-all
                    ${
                      isSelected
                        ? 'bg-[#f5b65b]/20 text-[#f5b65b] border border-[#f5b65b]/40 font-bold'
                        : 'bg-white/[0.02] text-white/60 border border-white/[0.04] hover:bg-white/[0.06]'
                    }
                  `}
                >
                  <span>{at.label}</span>
                  <span className="font-mono text-xs">{val >= 0 ? `+${val}` : val}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modo de Rolagem */}
        <div className="space-y-2">
          <label className="text-[11px] font-serif uppercase tracking-wider text-[#a8947c]">
            Modo da Rolagem
          </label>
          <div className="flex flex-col gap-1.5">
            {(
              [
                { id: 'normal', label: 'Normal (2d6)' },
                { id: 'vantagem', label: 'Vantagem (3d6 maior)' },
                { id: 'desvantagem', label: 'Desvantagem (3d6 menor)' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setRollMode(m.id)}
                className={`
                  p-2 rounded-xl text-xs font-serif text-left transition-all
                  ${
                    rollMode === m.id
                      ? 'bg-[#f5b65b]/20 text-[#f5b65b] border border-[#f5b65b]/40 font-bold'
                      : 'bg-white/[0.02] text-white/60 border border-white/[0.04] hover:bg-white/[0.06]'
                  }
                `}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modificador Extra com Stepper */}
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-black/20 border border-white/[0.04] space-y-2">
          <Stepper
            value={extraModifier}
            onChange={setExtraModifier}
            min={-10}
            max={10}
            label="Modificador Avulso"
          />
          <div className="text-xs font-mono text-[#f5b65b] font-semibold mt-1">
            Total do Bônus: {totalModifier >= 0 ? `+${totalModifier}` : totalModifier}
          </div>
        </div>
      </div>

      {/* ── HISTÓRICO RECENTE ── */}
      {history.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-serif uppercase tracking-wider text-[#a8947c]">
            <History className="w-3.5 h-3.5" />
            <span>Últimas Rolagens da Mesa</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {history.slice(0, 6).map((h) => (
              <div
                key={h.id}
                className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-serif font-semibold text-white/80 truncate">
                    {h.player_name || 'Jurado'}: {h.label}
                  </div>
                  <div className="font-mono text-[10px] text-white/40 mt-0.5">
                    [{h.kept?.join('+') || '?'}] {h.modifier ? `+${h.modifier}` : ''}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`font-mono font-bold text-sm ${
                      h.result === 'critico'
                        ? 'text-[#f5b65b]'
                        : h.result === 'desastre'
                        ? 'text-[#ff453a]'
                        : h.total >= h.peso
                        ? 'text-[#30d158]'
                        : 'text-[#ff453a]'
                    }`}
                  >
                    {h.total}
                  </span>
                  <div className="text-[9px] uppercase font-serif text-white/40">
                    {h.result}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
