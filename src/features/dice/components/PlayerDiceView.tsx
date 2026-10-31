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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--iron)]/60 pb-4">
        <div>
          <h1 className="font-['Cinzel',serif] text-xl md:text-2xl font-bold text-[var(--gold-hi)] tracking-wide flex items-center gap-2">
            <Dices className="w-5 h-5 text-[var(--gold)]" /> Dados Rúnicos do Jurado
          </h1>
          <p className="font-serif text-xs md:text-sm text-[var(--muted)] italic">
            2d6 + Atributo + Perícia contra o Peso da Sessão. Transmissão contínua para a mesa.
          </p>
        </div>

        {/* Peso Atual */}
        <div className="flex items-center gap-2 px-3 py-1.5 slab border border-[var(--iron)] text-xs font-mono">
          <span className="text-[var(--gold-hi)] uppercase tracking-wider font-['Cinzel',serif]">Peso da Mesa:</span>
          <span className="text-base font-bold text-[var(--gold-hi)]">{effectivePeso}</span>
        </div>
      </div>

      {/* ── ÁREA CENTRAL DOS DADOS GRANDES ── */}
      <div className="flex flex-col items-center justify-center p-8 md:p-12 slab border border-[var(--iron)] shadow-2xl relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute inset-0 bg-radial-gradient from-[var(--gold)]/10 via-transparent to-transparent pointer-events-none" />

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
                  w-20 h-20 md:w-24 md:h-24 flex items-center justify-center font-mono font-bold text-3xl md:text-4xl select-none transition-all duration-300
                  ${
                    isRolling
                      ? 'animate-spin scale-105 recess border-2 border-[var(--gold)] text-[var(--gold)]'
                      : isKept
                      ? 'slab border-2 border-[var(--gold)] text-[var(--gold-hi)] shadow-xl shadow-[var(--gold)]/20 scale-100'
                      : 'recess border border-black text-white/30 scale-90 opacity-60'
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
          <div className="text-xs font-serif italic text-[var(--muted)] mb-2 z-10">
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
            className="w-full end-turn text-stone-950 font-['Cinzel',serif] text-sm md:text-base font-bold tracking-widest uppercase hover:brightness-110 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Dices className="w-5 h-5 inline mr-1" />
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 slab border border-[var(--iron)]">
        {/* Atributo */}
        <div className="space-y-2">
          <label className="text-[11px] font-['Cinzel',serif] uppercase tracking-wider text-[var(--gold-hi)] font-bold">
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
                    p-2 text-xs font-['Cinzel',serif] flex items-center justify-between transition-all cursor-pointer
                    ${
                      isSelected
                        ? 'bg-[var(--gold)] text-black border border-[var(--gold-hi)] font-bold shadow-md'
                        : 'recess text-[var(--muted)] border border-black hover:text-[var(--text)]'
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
          <label className="text-[11px] font-['Cinzel',serif] uppercase tracking-wider text-[var(--gold-hi)] font-bold">
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
                  p-2 text-xs font-['Cinzel',serif] text-left transition-all cursor-pointer
                  ${
                    rollMode === m.id
                      ? 'bg-[var(--gold)] text-black border border-[var(--gold-hi)] font-bold shadow-md'
                      : 'recess text-[var(--muted)] border border-black hover:text-[var(--text)]'
                  }
                `}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modificador Extra com Stepper */}
        <div className="flex flex-col items-center justify-center p-3 recess border border-black space-y-2">
          <Stepper
            value={extraModifier}
            onChange={setExtraModifier}
            min={-10}
            max={10}
            label="Modificador Avulso"
          />
          <div className="text-xs font-mono text-[var(--gold-hi)] font-semibold mt-1">
            Total do Bônus: {totalModifier >= 0 ? `+${totalModifier}` : totalModifier}
          </div>
        </div>
      </div>

      {/* ── HISTÓRICO RECENTE ── */}
      {history.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-['Cinzel',serif] uppercase tracking-wider text-[var(--gold-hi)] font-bold">
            <History className="w-3.5 h-3.5" />
            <span>Últimas Rolagens da Mesa</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {history.slice(0, 6).map((h) => (
              <div
                key={h.id}
                className="p-2.5 slab border border-[var(--iron)]/60 flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-['Cinzel',serif] font-semibold text-[var(--gold-hi)] truncate">
                    {h.player_name || 'Jurado'}: {h.label}
                  </div>
                  <div className="font-mono text-[10px] text-[var(--muted)] mt-0.5">
                    [{h.kept?.join('+') || '?'}] {h.modifier ? `+${h.modifier}` : ''}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`font-mono font-bold text-sm ${
                      h.result === 'critico'
                        ? 'text-[var(--gold-hi)]'
                        : h.result === 'desastre'
                        ? 'text-[var(--blood)]'
                        : h.total >= h.peso
                        ? 'text-[var(--gold)]'
                        : 'text-[var(--blood)]'
                    }`}
                  >
                    {h.total}
                  </span>
                  <div className="text-[9px] uppercase font-['Cinzel',serif] text-[var(--muted)]">
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
