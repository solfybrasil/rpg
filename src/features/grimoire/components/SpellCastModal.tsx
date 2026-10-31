import React, { useState, useEffect } from 'react';
import {
  X,
  Flame,
  Dice5,
  Sparkles,
  AlertTriangle,
  Skull,
  Droplets,
  ShieldAlert,
  CheckCircle2,
  Plus,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  rolarSurtoMagico,
  verificarRiscoPeste,
  TABELA_SURTO_MAGICO,
} from '../../../entities/spell';
import type { Spell, MagicSurgeResult, CastDiceResult } from '../types';
import { magiaConjurarRPC } from '../api';

interface SpellCastModalProps {
  magia: Spell | null;
  hero: {
    id: string;
    name: string;
    focus: number;
    max_focus?: number;
    hp_current?: number;
    plague?: number;
    attributes?: Record<string, number>;
    conditions?: Array<string | { id?: string; nome?: string }>;
    inspiration?: number;
  };
  onClose: () => void;
  onSuccess?: () => void;
  updateHeroAsync?: (patch: Record<string, unknown>) => Promise<unknown>;
}

export const SpellCastModal: React.FC<SpellCastModalProps> = ({
  magia,
  hero,
  onClose,
  onSuccess,
  updateHeroAsync,
}) => {
  const [ampliarNivel, setAmpliarNivel] = useState(0);
  const [desesperadaOption, setDesesperadaOption] = useState<'vida' | 'peste' | null>(null);
  const [diceResult, setDiceResult] = useState<CastDiceResult | null>(null);
  const [surgeTriggered, setSurgeTriggered] = useState<MagicSurgeResult | null>(null);
  const [plagueRiskResult, setPlagueRiskResult] = useState<{ ganhaPeste: boolean; textoLog: string | null } | null>(null);
  const [isConjuring, setIsConjuring] = useState(false);
  const [castSuccess, setCastSuccess] = useState(false);
  const [curaAmount, setCuraAmount] = useState('');
  const [curaApplied, setCuraApplied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!magia) return null;

  // Check Silence condition
  const conditions = hero.conditions || [];
  const isSilenced = conditions.some((c) => {
    const id = typeof c === 'string' ? c.toLowerCase() : (c?.id || c?.nome || '').toLowerCase();
    return id.includes('silenc');
  });

  const heroVontade = Number(hero.attributes?.vontade ?? hero.attributes?.VON ?? 0);
  const focusAtual = Number(hero.focus ?? 0);
  const custoBase = Number(magia.custo_foco ?? magia.circulo ?? 0);
  const custoTotal = custoBase + ampliarNivel;
  const faltaFoco = focusAtual < custoTotal;
  const isPesteFonte = magia.fonte === 'Peste' || (magia.escola as string)?.toLowerCase().includes('peste');

  // Interactive dice roll
  const handleRollDice = () => {
    if (isSilenced) return;

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const somaDados = d1 + d2;
    const total = somaDados + heroVontade;
    const isCritico = d1 === 6 && d2 === 6;
    const isDesastre = d1 === 1 && d2 === 1;

    let surge: MagicSurgeResult | null = null;
    if (isDesastre) {
      surge = rolarSurtoMagico(Number(magia.circulo ?? 0)) as MagicSurgeResult;
      setSurgeTriggered(surge);
    } else {
      setSurgeTriggered(null);
    }

    // Check plague risk if applicable
    if (isPesteFonte) {
      const risk = verificarRiscoPeste(magia.risco || { peste: true, texto: '1 a 3' });
      setPlagueRiskResult(risk);
    }

    setDiceResult({
      d1,
      d2,
      somaDados,
      mod: heroVontade,
      total,
      isCritico,
      isDesastre,
      surto: surge,
    });
  };

  // Confirm casting
  const handleConfirmCast = async () => {
    if (isSilenced) return;
    if (faltaFoco && !desesperadaOption) {
      toast.error('Selecione uma opção de Conjuração Desesperada para cobrir o foco em falta.');
      return;
    }

    setIsConjuring(true);
    try {
      // 1. Call RPC if available
      try {
        await magiaConjurarRPC({
          characterId: hero.id,
          magiaId: String(magia.id),
          ampliar: ampliarNivel,
          desesperada: desesperadaOption,
        });
      } catch (rpcErr) {
        // Fallback: update local character vitals directly
        if (updateHeroAsync) {
          const newFocus = Math.max(0, focusAtual - custoTotal);
          let newHp = Number(hero.hp_current ?? 10);
          let newPlague = Number(hero.plague ?? 0);

          if (desesperadaOption === 'vida') {
            newHp = Math.max(0, newHp - 2);
          } else if (desesperadaOption === 'peste') {
            newPlague += 1;
          }

          if (plagueRiskResult?.ganhaPeste) {
            newPlague += 1;
          }

          if (surgeTriggered?.danoExtra) {
            newHp = Math.max(0, newHp - surgeTriggered.danoExtra);
          }

          await updateHeroAsync({
            focus: newFocus,
            hp_current: newHp,
            plague: newPlague,
          });
        }
      }

      setCastSuccess(true);
      toast.success(`✦ ${magia.nome} manifestada com sucesso!`);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(`Falha ao manifestar feitiço: ${err instanceof Error ? err.message : 'Erro'}`);
    } finally {
      setIsConjuring(false);
    }
  };

  // Healing application
  const handleApplyCure = async () => {
    const qtd = Number(curaAmount);
    if (!qtd || qtd <= 0 || !updateHeroAsync) return;
    try {
      const currentHp = Number(hero.hp_current ?? 10);
      await updateHeroAsync({
        hp_current: currentHp + qtd,
      });
      setCuraApplied(true);
      toast.success(`+${qtd} de Vida recuperada na ficha!`);
    } catch (err) {
      toast.error('Erro ao atualizar vida.');
    }
  };

  const isHealingSpell =
    (magia.resumo || '').toLowerCase().includes('cura') ||
    (magia.descricao || '').toLowerCase().includes('cura') ||
    (magia.efeito_sucesso || '').toLowerCase().includes('cura');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md rounded-xl bg-[var(--surface)] border p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto transition-all ${
          surgeTriggered
            ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)] bg-purple-950/20'
            : 'border-[var(--border)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div>
            <h3 className="font-cinzel font-bold text-base text-[var(--text-1)]">
              Manifestar {magia.nome}
            </h3>
            <span className="text-xs text-[var(--text-3)] font-cinzel">
              Círculo {magia.circulo} • {magia.fonte || magia.escola || 'Arcana'} ({magia.escola})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Silence Warning */}
        {isSilenced && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 flex items-start gap-2 text-xs">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-cinzel font-bold block">Silenciado!</span>
              <span>
                Você está sob a condição Silenciado. Suas cordas vocais e canais arcanos estão trancados; conjurações verbais são impossíveis.
              </span>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="p-3 rounded bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--text-2)]">
          <span className="text-[10px] uppercase font-cinzel text-[var(--gold-dim)] block mb-1">
            Efeito Primordial
          </span>
          {magia.resumo || magia.descricao}
        </div>

        {/* 2d6 Mystical Roll */}
        <div className="p-3 rounded bg-[var(--card)] border border-[var(--border)] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-cinzel text-[var(--text-2)] font-semibold">
              Teste de Conjuração (2d6 + Vontade)
            </span>
            <button
              type="button"
              onClick={handleRollDice}
              disabled={isSilenced || isConjuring}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--surface)] border border-[var(--gold-dim)] hover:border-[var(--gold)] text-[var(--gold)] text-xs font-cinzel transition-colors disabled:opacity-50"
            >
              <Dice5 size={14} />
              <span>Rolar Dados</span>
            </button>
          </div>

          {diceResult ? (
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-black/60 border border-[var(--border)] font-mono text-xs text-[var(--text-1)]">
                  [{diceResult.d1}] + [{diceResult.d2}] + Vontade ({diceResult.mod >= 0 ? `+${diceResult.mod}` : diceResult.mod}) ={' '}
                  <strong className="text-[var(--gold-bright)]">{diceResult.total}</strong>
                </span>
                {diceResult.isCritico && (
                  <span className="text-xs font-cinzel font-bold text-emerald-400">
                    ✓ Crítico! (+1 Inspiração)
                  </span>
                )}
                {diceResult.isDesastre && (
                  <span className="text-xs font-cinzel font-bold text-rose-400">
                    ⚠ Desastre Místico!
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-[11px] text-[var(--text-3)]">
              Modificador de Vontade do herói: <strong className="text-[var(--text-2)]">+{heroVontade}</strong>
            </span>
          )}
        </div>

        {/* Surto Mágico Alert (Violet effect) */}
        {surgeTriggered && (
          <div className="p-3.5 rounded-lg bg-purple-950/40 border border-purple-500 text-purple-200 flex flex-col gap-1 text-xs animate-pulse shadow-md">
            <div className="flex items-center gap-1.5 font-cinzel font-bold text-purple-300">
              <Sparkles size={14} className="text-purple-400" />
              <span>SURTO MÁGICO: {surgeTriggered.nome}</span>
            </div>
            <p className="text-purple-200/90 leading-relaxed">
              {surgeTriggered.descricao}
            </p>
            {surgeTriggered.danoExtra && surgeTriggered.danoExtra > 0 && (
              <span className="text-rose-400 font-semibold mt-1">
                Sofreu {surgeTriggered.danoExtra} de dano direto pela implosão arcana!
              </span>
            )}
          </div>
        )}

        {/* Plague Risk Notice */}
        {isPesteFonte && (
          <div className="p-3 rounded bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 flex items-start gap-2">
            <Skull size={14} className="shrink-0 mt-0.5 text-amber-400" />
            <div>
              <span className="font-cinzel font-semibold block">Magia da Peste</span>
              {plagueRiskResult ? (
                <span>{plagueRiskResult.textoLog}</span>
              ) : (
                <span className="text-[var(--text-3)]">
                  Esta fórmula arrisca infecção pelo contágio (+1 Peste).
                </span>
              )}
            </div>
          </div>
        )}

        {/* Power Amplification */}
        {magia.ampliar && (
          <div className="p-3 rounded bg-[var(--card)] border border-[var(--border)] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-cinzel text-[var(--text-2)]">Ampliar Poder (+1 Foco/nível)</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAmpliarNivel((prev) => Math.max(0, prev - 1))}
                  disabled={ampliarNivel <= 0}
                  className="p-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] disabled:opacity-40"
                >
                  <Minus size={12} />
                </button>
                <span className="font-mono font-bold w-5 text-center text-xs text-[var(--text-1)]">
                  {ampliarNivel}
                </span>
                <button
                  type="button"
                  onClick={() => setAmpliarNivel((prev) => prev + 1)}
                  className="p-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)]"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-3)]">{magia.ampliar}</p>
          </div>
        )}

        {/* Focus vs Cost calculation */}
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex justify-between items-center px-1 text-[var(--text-3)]">
            <span>Custo Total de Foco: <strong className="text-[var(--text-1)]">{custoTotal}</strong></span>
            <span>
              Foco Atual:{' '}
              <strong className={faltaFoco ? 'text-rose-400' : 'text-sky-400'}>
                {focusAtual}
              </strong>
            </span>
          </div>

          {/* Desperate Casting Options */}
          {faltaFoco && (
            <div className="p-3 rounded bg-rose-950/20 border border-rose-800/50 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-rose-400 font-cinzel font-semibold">
                <AlertTriangle size={14} />
                <span>Foco Insuficiente ({custoTotal - focusAtual} ponto em falta)</span>
              </div>
              <p className="text-[11px] text-[var(--text-3)]">
                Recorra à Conjuração Desesperada para manifestar a magia:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setDesesperadaOption((prev) => (prev === 'vida' ? null : 'vida'))
                  }
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded border text-xs font-cinzel transition-colors ${
                    desesperadaOption === 'vida'
                      ? 'bg-rose-900/60 border-rose-500 text-rose-200'
                      : 'bg-black/40 border-rose-950 text-rose-400 hover:border-rose-800'
                  }`}
                >
                  <Droplets size={12} />
                  <span>Queimar Vida (-2 PV)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDesesperadaOption((prev) => (prev === 'peste' ? null : 'peste'))
                  }
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded border text-xs font-cinzel transition-colors ${
                    desesperadaOption === 'peste'
                      ? 'bg-amber-900/60 border-amber-500 text-amber-200'
                      : 'bg-black/40 border-amber-950 text-amber-400 hover:border-amber-800'
                  }`}
                >
                  <Skull size={12} />
                  <span>Assumir Peste (+1)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Post-cast resolution / Healing */}
        {castSuccess ? (
          <div className="p-3 rounded bg-emerald-950/30 border border-emerald-800/50 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-emerald-400 font-cinzel font-semibold text-xs">
              <CheckCircle2 size={16} />
              <span>Manifestação Concluída com Sucesso!</span>
            </div>

            {isHealingSpell && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  placeholder="PV curados..."
                  value={curaAmount}
                  onChange={(e) => setCuraAmount(e.target.value)}
                  disabled={curaApplied}
                  className="w-24 px-2 py-1 text-xs rounded bg-black/60 border border-[var(--border)] text-[var(--text-1)] outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleApplyCure}
                  disabled={curaApplied || !curaAmount}
                  className="px-3 py-1 rounded bg-[var(--gold)] text-black font-cinzel font-semibold text-xs hover:bg-[var(--gold-bright)] transition-colors disabled:opacity-50"
                >
                  {curaApplied ? '✓ Vida Aplicada' : 'Curar Ficha'}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full py-1.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] font-cinzel text-xs transition-colors"
            >
              Fechar Painel
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={isSilenced || isConjuring || (faltaFoco && !desesperadaOption)}
            onClick={handleConfirmCast}
            className="w-full py-2.5 rounded bg-[var(--gold)] hover:bg-[var(--gold-bright)] text-black font-cinzel font-bold text-xs uppercase tracking-wider transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Flame size={16} className="fill-black" />
            <span>{isConjuring ? 'Manifestando Trama...' : 'Confirmar Conjuração'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
