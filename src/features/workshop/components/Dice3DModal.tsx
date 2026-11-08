import React, { useState, useEffect } from 'react';
import { Sparkles, Skull, CheckCircle, AlertTriangle, Flame } from 'lucide-react';
import type { GridRecipeRecord } from '../../../entities/recipe';
import '../../../styles/features/PlayerWorkshop.css';

const FACE_TRANSFORMS: Record<number, string> = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateY(-180deg)',
  3: 'rotateY(90deg)',
  4: 'rotateY(-90deg)',
  5: 'rotateX(-90deg)',
  6: 'rotateX(90deg)',
};

function DieFace({ value }: { value: number }) {
  const renderPips = () => {
    switch (value) {
      case 1:
        return <span className="dice-pip" style={{ gridColumn: '2', gridRow: '2' }} />;
      case 2:
        return (
          <>
            <span className="dice-pip" style={{ alignSelf: 'flex-start' }} />
            <span className="dice-pip" style={{ alignSelf: 'flex-end' }} />
          </>
        );
      case 3:
        return (
          <>
            <span className="dice-pip" style={{ alignSelf: 'flex-start' }} />
            <span className="dice-pip" style={{ alignSelf: 'center' }} />
            <span className="dice-pip" style={{ alignSelf: 'flex-end' }} />
          </>
        );
      case 4:
        return (
          <>
            <span className="dice-pip" />
            <span className="dice-pip" />
            <span className="dice-pip" />
            <span className="dice-pip" />
          </>
        );
      case 5:
        return (
          <>
            <span className="dice-pip" style={{ gridColumn: '1', gridRow: '1' }} />
            <span className="dice-pip" style={{ gridColumn: '3', gridRow: '1' }} />
            <span className="dice-pip" style={{ gridColumn: '2', gridRow: '2' }} />
            <span className="dice-pip" style={{ gridColumn: '1', gridRow: '3' }} />
            <span className="dice-pip" style={{ gridColumn: '3', gridRow: '3' }} />
          </>
        );
      case 6:
        return (
          <>
            <span className="dice-pip" />
            <span className="dice-pip" />
            <span className="dice-pip" />
            <span className="dice-pip" />
            <span className="dice-pip" />
            <span className="dice-pip" />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`dice-face dice-face-${value}`}>
      {renderPips()}
    </div>
  );
}

function CubeDie({ targetValue, isRolling }: { targetValue: number; isRolling: boolean }) {
  const transform = FACE_TRANSFORMS[targetValue] || FACE_TRANSFORMS[1];

  return (
    <div
      className={`dice-cube ${isRolling ? 'rolling' : ''}`}
      style={{
        '--final-transform': transform,
        transform: isRolling ? undefined : transform,
      } as React.CSSProperties}
    >
      {[1, 2, 3, 4, 5, 6].map(val => (
        <DieFace key={val} value={val} />
      ))}
    </div>
  );
}

export interface Dice3DResolveData {
  discovered?: boolean;
  recipe_discovered?: boolean;
  recipe_id?: string;
  created?: Array<{ name: string; qty: number; rarity?: string }>;
  lost?: Array<{ name: string; qty: number }>;
  damage?: number;
}

export interface Dice3DModalProps {
  isOpen: boolean;
  dice?: [number, number] | number[];
  modifier?: number;
  total?: number;
  peso?: number;
  result?: string;
  recipe?: GridRecipeRecord | null;
  playerInspiration?: number;
  isResolving?: boolean;
  resolveData?: Dice3DResolveData | null;
  onReroll?: () => void;
  onBreakOath?: () => void;
  onResolve?: () => void;
  onClose: () => void;
}

export const Dice3DModal: React.FC<Dice3DModalProps> = ({
  isOpen,
  dice = [1, 1],
  modifier = 0,
  total = 2,
  peso = 6,
  result = 'falha',
  recipe = null,
  playerInspiration = 0,
  isResolving = false,
  resolveData = null,
  onReroll,
  onBreakOath,
  onResolve,
  onClose,
}) => {
  const [isRolling, setIsRolling] = useState(true);
  const [showConfirmOath, setShowConfirmOath] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRolling(true);
      setShowConfirmOath(false);
      const timer = setTimeout(() => {
        setIsRolling(false);
      }, 950);
      return () => clearTimeout(timer);
    }
  }, [isOpen, dice]);

  if (!isOpen) return null;

  const d1 = dice[0] || 1;
  const d2 = dice[1] || 1;
  const isPending = !resolveData;
  const isDisaster = result === 'desastre';
  const isFailure = result === 'falha';
  const isSuccess = result === 'sucesso' || result === 'brilhante' || result === 'critico';

  return (
    <div className="dice-modal-overlay">
      <div className="dice-modal-card">
        {/* Cabeçalho */}
        <div style={{ width: '100%', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', paddingBottom: '0.8rem' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'Cinzel, serif', color: '#d4af37', letterSpacing: '0.12em' }}>
            ✦ ROLAGEM NA BANCADA • {recipe?.station?.toUpperCase() || 'OFICINA'} ✦
          </span>
          <h2 style={{ margin: '4px 0 0', fontFamily: 'Cinzel, serif', color: '#fff1d4', fontSize: '1.25rem' }}>
            {recipe?.result_name || 'Criação de Item'}
          </h2>
        </div>

        {/* Arena de Dados 3D */}
        <div className="dice-arena">
          <CubeDie targetValue={d1} isRolling={isRolling} />
          <CubeDie targetValue={d2} isRolling={isRolling} />
        </div>

        {/* Linha de Cálculo */}
        {!isRolling && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
            <div style={{ fontSize: '1.1rem', color: '#ecc05c', fontFamily: 'Cinzel, serif' }}>
              ({d1} + {d2}) {modifier >= 0 ? `+ ${modifier}` : `- ${Math.abs(modifier)}`} = <strong>{total}</strong>
              <span style={{ color: '#a8947c', fontSize: '0.9rem', marginLeft: '8px' }}>
                contra Peso {peso}
              </span>
            </div>

            {/* Badge de Resultado */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
              <span className={`dice-result-pill ${result}`}>
                {result === 'critico' && '✦ CRÍTICO! (DUPLO 6) ✦'}
                {result === 'brilhante' && '★ SUCESSO BRILHANTE! ★'}
                {result === 'sucesso' && '✓ SUCESSO'}
                {result === 'falha' && '✗ FALHA'}
                {result === 'desastre' && '☠ DESASTRE! (DUPLO 1)'}
              </span>
            </div>
          </div>
        )}

        {/* ── SE JÁ RESOLVIDO ── */}
        {!isRolling && resolveData && (
          <div style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid #3d2b1a', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {(resolveData.discovered || resolveData.recipe_discovered) && (
              <div style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 100%)', border: '1px solid #d4af37', color: '#ecc05c', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 800 }}>
                ✦ NOVA RECEITA DESCOBERTA E GRAVADA NO SEU LIVRO! ✦
              </div>
            )}

            {isSuccess && (
              <div style={{ color: '#86efac', fontSize: '0.9rem' }}>
                <CheckCircle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                Item forjado com maestria e guardado na sua mochila de viagem!
                {resolveData.created?.map((c, i) => (
                  <div key={i} style={{ marginTop: '4px', color: '#ffd54f', fontWeight: 700 }}>
                    + {c.qty}x {c.name} {c.rarity ? `(${c.rarity})` : ''}
                  </div>
                ))}
              </div>
            )}

            {isFailure && (
              <div style={{ color: '#fdba74', fontSize: '0.85rem', textAlign: 'left' }}>
                <AlertTriangle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px', color: '#fb923c' }} />
                A criação falhou. Resultado dos materiais:
                {resolveData.lost && resolveData.lost.length > 0 ? (
                  <div style={{ marginTop: '6px', color: '#f87171' }}>
                    <strong>Ingredientes perdidos no processo:</strong>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      {resolveData.lost.map((l, i) => (
                        <li key={i}>{l.qty}x {l.name}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div style={{ marginTop: '4px', color: '#a7f3d0' }}>
                    Sua cautela salvou todos os materiais! Nada foi perdido.
                  </div>
                )}
              </div>
            )}

            {isDisaster && (
              <div style={{ color: '#fca5a5', fontSize: '0.85rem', textAlign: 'left' }}>
                <Skull size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px', color: '#ef4444' }} />
                <strong>Desastre na oficina!</strong>
                <div style={{ marginTop: '4px' }}>
                  Todos os ingredientes foram consumidos no acidente e você sofreu <strong>{resolveData.damage || 1} de dano</strong>.
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="workbench-create-btn"
              style={{ width: '100%', marginTop: '6px' }}
            >
              Fechar & Retornar à Bancada
            </button>
          </div>
        )}

        {/* ── SE PENDENTE (AGUARDANDO AÇÃO EM FALHA/DESASTRE OU SUCESSO) ── */}
        {!isRolling && isPending && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            {isSuccess && (
              <button
                type="button"
                onClick={onResolve}
                disabled={isResolving}
                className="workbench-create-btn"
                style={{ width: '100%' }}
              >
                {isResolving ? 'Forjando...' : '✦ Coletar Item Criado ✦'}
              </button>
            )}

            {(isFailure || isDisaster) && !showConfirmOath && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {/* Usar Inspiração */}
                <button
                  type="button"
                  onClick={onReroll}
                  disabled={playerInspiration <= 0 || isResolving}
                  style={{
                    padding: '0.65rem 1.2rem',
                    background: playerInspiration > 0 ? 'linear-gradient(180deg, #b45309 0%, #78350f 100%)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${playerInspiration > 0 ? '#f59e0b' : '#444'}`,
                    color: playerInspiration > 0 ? '#fef3c7' : '#777',
                    borderRadius: '6px',
                    fontFamily: 'Cinzel, serif',
                    fontWeight: 700,
                    cursor: playerInspiration > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem'
                  }}
                >
                  <Sparkles size={16} />
                  <span>Usar Inspiração (Rerrolar) • {playerInspiration} disp.</span>
                </button>

                {/* Quebrar o Juramento */}
                <button
                  type="button"
                  onClick={() => setShowConfirmOath(true)}
                  disabled={isResolving}
                  style={{
                    padding: '0.65rem 1.2rem',
                    background: 'linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)',
                    border: '1px solid #dc2626',
                    color: '#fecaca',
                    borderRadius: '6px',
                    fontFamily: 'Cinzel, serif',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem'
                  }}
                >
                  <Flame size={16} />
                  <span>Quebrar o Juramento (Converter em Sucesso)</span>
                </button>

                {/* Aceitar o Resultado */}
                <button
                  type="button"
                  onClick={onResolve}
                  disabled={isResolving}
                  style={{
                    padding: '0.65rem 1.2rem',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#d6cbb8',
                    borderRadius: '6px',
                    fontFamily: 'Cinzel, serif',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {isResolving ? 'Aplicando perdas...' : 'Aceitar o Resultado'}
                </button>
              </div>
            )}

            {/* Modal de Confirmação para Quebrar o Juramento */}
            {showConfirmOath && (
              <div style={{ background: 'rgba(20, 5, 5, 0.95)', border: '1.5px solid #dc2626', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', textAlign: 'center' }}>
                <div style={{ color: '#ef4444', fontFamily: 'Cinzel, serif', fontSize: '0.95rem', fontWeight: 800 }}>
                  ⚠️ TEM CERTEZA DE QUE DESEJA QUEBRAR SEU JURAMENTO?
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#fca5a5', lineHeight: 1.4 }}>
                  Você forçará os limites do juramento e transformará a falha em <strong>SUCESSO</strong>, mas seu personagem receberá <strong>+1 de Peste</strong> imediatamente.
                </p>
                <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowConfirmOath(false)}
                    style={{ padding: '0.5rem 1rem', background: '#222', border: '1px solid #555', color: '#ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowConfirmOath(false); onBreakOath && onBreakOath(); }}
                    style={{ padding: '0.5rem 1.2rem', background: 'linear-gradient(180deg, #b91c1c 0%, #7f1d1d 100%)', border: '1px solid #ef4444', color: '#fff', fontWeight: 800, borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Sim, Quebrar Voto (+1 Peste)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default Dice3DModal;
