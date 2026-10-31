import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import {
  Sparkles,
  Dice5,
  Trash2,
  Clock,
  Swords,
  Shield,
  Volume2,
  Radio,
  RotateCcw,
} from 'lucide-react';
import { DiceBroadcastPayload, DiceResultTone } from '../types';
import {
  subscribeToMesa,
  emitMesaDiceRoll,
  emitMesaClearTable,
  calculateDiceOutcome,
} from '../services/mesaRealtime';
import { SceneTimerRing } from './SceneTimerRing';

// Lazy loading exclusivo para isolar o Three.js nesta rota
const DiceCanvas3D = lazy(() => import('./DiceCanvas3D'));

export const MesaView: React.FC = () => {
  const [activeRoll, setActiveRoll] = useState<DiceBroadcastPayload | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);

  // Escuta broadcast em tempo real
  useEffect(() => {
    const unsubscribe = subscribeToMesa(
      (newRoll) => {
        setIsRolling(true);
        setActiveRoll(newRoll);
        setTimeout(() => setIsRolling(false), 1250);
      },
      () => {
        setActiveRoll(null);
        setIsRolling(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Rolar teste diretamente na mesa
  const handleRollTest = useCallback(() => {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const dice = [d1, d2];
    const modifier = 2;
    const peso = 8;
    const calc = calculateDiceOutcome(dice, modifier, peso);

    const testRoll: DiceBroadcastPayload = {
      id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roller_name: 'Tor Björn',
      character_id: 'tor_bjorn',
      label: 'Golpe de Machado & Fúria Anã',
      dice,
      kept: dice,
      modifier,
      total: calc.total,
      peso,
      result: calc.result,
      created_at: new Date().toISOString(),
    };

    setIsRolling(true);
    setActiveRoll(testRoll);
    emitMesaDiceRoll(testRoll);
    setTimeout(() => setIsRolling(false), 1250);
  }, []);

  // Limpar a mesa
  const handleClearTable = useCallback(() => {
    setActiveRoll(null);
    setIsRolling(false);
    emitMesaClearTable();
  }, []);

  // Cores semânticas conforme o tom do resultado
  const outcomeStyles: Record<
    DiceResultTone,
    { border: string; bg: string; text: string; label: string }
  > = {
    critico: {
      border: 'border-[var(--gold)] shadow-[0_0_50px_rgba(245,182,91,0.35)]',
      bg: 'bg-gradient-to-b from-[var(--gold)]/20 via-black/60 to-black/90',
      text: 'text-[var(--gold-bright)]',
      label: 'CRÍTICO! (+1 Inspiração)',
    },
    brilhante: {
      border: 'border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.3)]',
      bg: 'bg-gradient-to-b from-emerald-500/20 via-black/60 to-black/90',
      text: 'text-emerald-300',
      label: 'SUCESSO BRILHANTE',
    },
    sucesso: {
      border: 'border-emerald-500/70 shadow-[0_0_30px_rgba(16,185,129,0.2)]',
      bg: 'bg-gradient-to-b from-emerald-600/15 via-black/60 to-black/90',
      text: 'text-emerald-400',
      label: 'SUCESSO',
    },
    falha: {
      border: 'border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.2)]',
      bg: 'bg-gradient-to-b from-red-600/15 via-black/60 to-black/90',
      text: 'text-red-400',
      label: 'FALHA',
    },
    desastre: {
      border: 'border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.4)]',
      bg: 'bg-gradient-to-b from-red-700/25 via-black/70 to-black/95',
      text: 'text-red-300',
      label: 'DESASTRE RÚNICO! (Duplo 1)',
    },
  };

  const currentOutcome = activeRoll ? outcomeStyles[activeRoll.result] : null;

  return (
    <div
      className="min-h-screen w-full bg-[var(--bg)] text-[var(--text-1)] flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden relative"
      data-testid="mesa-tv-view"
    >
      {/* 1. Header: Sessão ao Vivo (Esquerda) e Timer de Cena (Direita) */}
      <header className="flex items-start justify-between gap-6 z-10">
        <div>
          <div className="flex items-center gap-3 text-2xl font-serif uppercase tracking-widest text-[var(--gold-dim)]">
            <Radio size={26} className="text-[var(--gold)] animate-pulse" />
            <span>Sessão ao Vivo · Mesa Sagrada</span>
          </div>
          <h1 className="font-['Cinzel',serif] font-bold text-3xl sm:text-4xl text-[var(--text-1)] mt-1">
            Transmissão de Rolagens & Tempo
          </h1>
        </div>

        {/* Timer de cena isolado com anel fino dourado */}
        <div className="shrink-0">
          <SceneTimerRing defaultSeconds={60} />
        </div>
      </header>

      {/* 2. Centro: Dados 3D e Resultado Gigante em Cinzel 96 */}
      <main className="flex-1 flex flex-col items-center justify-center my-4 z-10 w-full max-w-5xl mx-auto">
        {/* Dados 3D (Three.js lazy) */}
        <div className="w-full max-w-2xl h-64 sm:h-72 md:h-80 flex items-center justify-center">
          <Suspense
            fallback={
              <div className="text-2xl font-serif text-white/30 animate-pulse flex items-center gap-3">
                <Dice5 size={32} />
                <span>Carregando Dados Místicos...</span>
              </div>
            }
          >
            <DiceCanvas3D
              dice={activeRoll ? activeRoll.dice : [4, 5]}
              isRolling={isRolling}
            />
          </Suspense>
        </div>

        {/* Display do Resultado ou Estado de Espera */}
        {activeRoll && currentOutcome ? (
          <div
            data-testid="mesa-active-roll-container"
            className={`w-full p-8 rounded-3xl border ${currentOutcome.border} ${currentOutcome.bg} backdrop-blur-xl flex flex-col items-center text-center transition-all duration-500 animate-in fade-in zoom-in-95`}
          >
            {/* Nome de quem rolou (Mínimo 24px) */}
            <div
              data-testid="mesa-roller-name"
              className="text-2xl sm:text-3xl font-serif uppercase tracking-widest text-[var(--gold)] font-bold mb-2 drop-shadow-md"
            >
              {activeRoll.roller_name}
            </div>

            {/* Rótulo da rolagem */}
            {activeRoll.label && (
              <div className="text-2xl font-serif text-white/70 italic mb-4">
                "{activeRoll.label}"
              </div>
            )}

            {/* Total Gigante em Cinzel 96 */}
            <div
              data-testid="mesa-giant-result-number"
              style={{ fontFamily: 'var(--font-title, "Cinzel", serif)' }}
              className={`text-[96px] leading-none font-bold ${currentOutcome.text} my-2 drop-shadow-[0_0_35px_rgba(245,182,91,0.45)]`}
            >
              {activeRoll.total}
            </div>

            {/* Fórmula e Decomposição (Mínimo 24px) */}
            <div
              data-testid="mesa-roll-formula"
              className="text-2xl font-mono text-white/80 my-2 tracking-wide"
            >
              Dados: [{activeRoll.dice.join(' + ')}]{' '}
              {activeRoll.modifier !== 0 && (
                <span>
                  {activeRoll.modifier > 0 ? `+ ${activeRoll.modifier}` : `- ${Math.abs(activeRoll.modifier)}`}
                </span>
              )}{' '}
              ={' '}
              <span className="font-bold text-[var(--gold)]">{activeRoll.total}</span>{' '}
              <span className="text-white/40 text-xl font-serif">
                (vs Peso {activeRoll.peso})
              </span>
            </div>

            {/* Badge com o Tom do Resultado (Mínimo 24px) */}
            <div
              data-testid="mesa-outcome-badge"
              className={`mt-4 px-8 py-3 rounded-2xl border font-serif font-bold text-2xl tracking-widest uppercase ${currentOutcome.border} ${currentOutcome.text} bg-black/60`}
            >
              {currentOutcome.label}
            </div>
          </div>
        ) : (
          /* Estado de Espera: Mesa Limpa */
          <div
            data-testid="mesa-empty-state"
            className="p-10 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md text-center space-y-3 max-w-xl"
          >
            <div className="text-3xl font-serif text-[var(--gold)] flex items-center justify-center gap-3">
              <Sparkles size={32} />
              <span>Aguardando Invocação dos Dados</span>
              <Sparkles size={32} />
            </div>
            <p className="text-2xl font-serif text-white/60 leading-relaxed">
              A mesa sagrada está aberta. Qualquer teste rolado pelos Jurados ou pelo Mestre se manifestará aqui ao vivo.
            </p>
          </div>
        )}
      </main>

      {/* 3. Footer: Ações Rápidas (Rolar Teste & Limpar Mesa) */}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 z-10">
        <div className="flex items-center gap-3">
          {/* Botão Rolar 2d6 Teste */}
          <button
            type="button"
            data-testid="mesa-roll-test-btn"
            onClick={handleRollTest}
            className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-[var(--gold)] hover:bg-[var(--gold-bright)] text-black font-serif text-2xl font-bold transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <Dice5 size={26} />
            <span>Rolar 2d6 Teste</span>
          </button>

          {/* Botão Limpar Mesa */}
          <button
            type="button"
            data-testid="mesa-clear-table-btn"
            onClick={handleClearTable}
            className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 font-serif text-2xl font-bold transition-all cursor-pointer active:scale-95"
          >
            <Trash2 size={24} />
            <span>Limpar Mesa</span>
          </button>
        </div>

        {/* Status Informativo */}
        <div className="text-xl font-serif text-white/40 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-ping" />
          <span>Realtime Sincronizado</span>
        </div>
      </footer>
    </div>
  );
};
