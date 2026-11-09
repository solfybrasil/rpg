import { Link, useNavigate } from '@tanstack/react-router';
import {
  Award,
  Compass,
  Crosshair,
  Droplets,
  Heart,
  History,
  Shield,
  ShieldCheck,
  Skull,
  Sparkles,
  Sword,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { calcDefesa } from '../../../entities/hero';
import { useHero, useHeroes, useInventory } from '../../../shared/hooks/baseHooks';
import { useSessionStore } from '../../../shared/stores/session';
import '../../../styles/features/PlayerSheet.css';
import { estadoFome } from '../../../shared/lib/fome';
import { LevelUpModal } from './LevelUpModal';

// Resolução de retrato do herói (sempre garante uma imagem de alta qualidade de fantasia sombria)
export function getHeroPortrait(char: any): string {
  if (!char) return 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80';
  const isImg = (val: any) =>
    typeof val === 'string' &&
    (val.startsWith('http') || val.startsWith('data:') || val.startsWith('blob:') || val.startsWith('/'));

  if (isImg(char.portrait_url)) return char.portrait_url;
  if (isImg(char.portraitUrl)) return char.portraitUrl;
  if (isImg(char.avatar_url)) return char.avatar_url;
  if (isImg(char.avatarUrl)) return char.avatarUrl;
  if (isImg(char.image_url)) return char.image_url;
  if (isImg(char.imageUrl)) return char.imageUrl;
  if (isImg(char.avatar_icon)) return char.avatar_icon;
  if (isImg(char.avatarIcon)) return char.avatarIcon;
  if (char.metadata?.portraitUrl && isImg(char.metadata.portraitUrl)) return char.metadata.portraitUrl;
  if (char.metadata?.avatarUrl && isImg(char.metadata.avatarUrl)) return char.metadata.avatarUrl;

  const id = String(char.id || char.name || '').toLowerCase();
  if (id.includes('tor')) {
    return 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&q=80';
  }
  if (id.includes('malenia') || id.includes('guerrei')) {
    return 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&q=80';
  }
  if (id.includes('kaelis') || id.includes('mago') || id.includes('arcano')) {
    return 'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=600&q=80';
  }

  return 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80';
}

// Regras Canônicas de Peste
function getPlagueStage(p: number) {
  if (p <= 0) return { nome: 'Puro', cor: '#a3e6aa', descricao: 'Sua carne é pura e o juramento brilha.' };
  if (p <= 3) return { nome: 'Mancha', cor: '#60a5fa', descricao: 'A sombra toca seu sangue. Olhos febris.' };
  if (p <= 7) return { nome: 'Corrompido', cor: '#f59e0b', descricao: 'Pústulas e veias negras. A mente sussurra.' };
  if (p <= 9) return { nome: 'Mutado', cor: '#ef4444', descricao: 'A carne se deforma em espinhos e garras.' };
  return { nome: 'Perdido', cor: '#991b1b', descricao: 'A alma se partiu. O Jurado tornou-se a própria Peste.' };
}

// Próximo marco de XP por nível (Regras 2.0)
function getProximoXp(nivel: number) {
  const tabela = [0, 5, 12, 22, 35, 52, 73, 98, 128, 163, 205];
  return tabela[nivel] || nivel * 25;
}

// Estados de Saciedade (regra única em shared/lib/fome)
const FOME_VISUAL: Record<string, { cor: string; bg: string }> = {
  saciado: { cor: '#7FA36B', bg: 'rgba(127, 163, 107, 0.15)' },
  alimentado: { cor: '#C9A45C', bg: 'rgba(201, 164, 92, 0.15)' },
  fome: { cor: '#E08A3C', bg: 'rgba(224, 138, 60, 0.15)' },
  faminto: { cor: '#D2493C', bg: 'rgba(163, 41, 31, 0.2)' },
};
function getEstadoFome(s: number) {
  const est = estadoFome(s);
  return { nome: est.nome, efeito: est.efeito, ...FOME_VISUAL[est.chave] };
}

export const PlayerSheetView: React.FC = () => {
  const navigate = useNavigate();
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const heroId = sessionHeroId || 'teste_1';

  // Chamadas de Hooks (SEMPRE no topo, incondicionais)
  const { hero: directHero, isLoading } = useHero(heroId);
  const { heroes } = useHeroes();
  const { items: inventoryItems = [] } = useInventory(heroId);

  const [isLevelUpOpen, setIsLevelUpOpen] = useState(false);
  const [showDefenseBreakdown, setShowDefenseBreakdown] = useState(false);
  const [showXPHistory, setShowXPHistory] = useState(false);

  // Herói unificado
  const hero = directHero || heroes[0] || null;

  const nivel = hero?.level ?? 1;
  const xp = hero?.xp ?? 0;
  const proximoXp = getProximoXp(nivel);

  const attrs = useMemo(() => {
    return (hero?.attributes || {
      corpo: 0,
      vontade: 0,
      astucia: 0,
      presenca: 0,
    }) as Record<string, number>;
  }, [hero?.attributes]);

  const vidaAtual = hero?.health ?? 10;
  const vidaMax = hero?.max_health ?? 10;
  const focoAtual = hero?.focus ?? 3;
  const focoMax = hero?.max_focus ?? 3;
  const inspiracao = hero?.inspiration ?? 0;
  const peste = hero?.plague ?? 0;
  // O campo do banco é `saciedade` (antes lia `satiety`, que não existe, e mostrava sempre 8).
  const saciedade = Math.round(Number(hero?.saciedade ?? 8));

  const isFallen = vidaAtual <= 0;
  const isDanger = vidaAtual <= Math.ceil(vidaMax / 3);

  const plagueStage = useMemo(() => getPlagueStage(peste), [peste]);
  const estadoFome = useMemo(() => getEstadoFome(saciedade), [saciedade]);

  const portrait = useMemo(() => getHeroPortrait(hero), [hero]);

  // Armas equipadas
  const equippedWeapons = useMemo(() => {
    return inventoryItems.filter(
      (it) => it.equip_slot === 'main_hand' || it.equip_slot === 'two_handed' || it.equip_slot === 'off_hand'
    );
  }, [inventoryItems]);

  const attacks = useMemo(() => {
    if (equippedWeapons.length === 0) {
      return [
        {
          id: 'desarmado',
          name: 'Golpe Desarmado',
          slotLabel: 'MÃOS LIVRES',
          totalAttackMod: attrs.corpo || 0,
          attackAttr: 'Corpo',
          damageDice: '1d4',
          damageBonus: 0,
          isRanged: false,
          twoHanded: false,
          special: 'Ataque corpo-a-corpo básico sem arma em punho.',
        },
      ];
    }

    return equippedWeapons.map((w) => {
      const isRanged = Boolean(w.ranged || (w.category && w.category.toLowerCase().includes('dist')));
      const attrKey = isRanged ? 'astucia' : 'corpo';
      const attrName = isRanged ? 'Astúcia' : 'Corpo';
      const attrBonus = attrs[attrKey] || 0;
      const attackMod = attrBonus + (w.damage_bonus || 0);

      return {
        id: w.id,
        name: w.name,
        slotLabel:
          w.equip_slot === 'two_handed'
            ? 'DUAS MÃOS'
            : w.equip_slot === 'main_hand'
              ? 'MÃO PRINCIPAL'
              : 'MÃO SECUNDÁRIA',
        totalAttackMod: attackMod,
        attackAttr: attrName,
        damageDice: w.damage_dice || '1d6',
        damageBonus: w.damage_bonus || 0,
        isRanged,
        twoHanded: Boolean(w.two_handed || w.equip_slot === 'two_handed'),
        special: w.description || w.special || null,
      };
    });
  }, [equippedWeapons, attrs]);

  // Defesa canônica
  const defense = hero?.defense ?? calcDefesa(0, 0);

  // Talentos da constelação
  const treeTalents = useMemo(() => {
    const treeObj = (hero?.oath_tree && typeof hero.oath_tree === 'object' ? hero.oath_tree : {}) as Record<string, any>;
    const nodes = treeObj.unlocked_nodes || [];
    if (!Array.isArray(nodes)) return [];
    return nodes.map((n: any) => {
      if (typeof n === 'string') {
        return { id: n, nm: n, reg: 'Juramento', ds: 'Talento da Constelação Sagrada', cor: '#c9a961' };
      }
      return {
        id: n.id,
        nm: n.name || n.nm || n.id,
        reg: n.archetype || n.reg || 'Juramento',
        ds: n.description || n.ds || 'Bônus ativo da constelação.',
        cor: n.color || n.cor || '#c9a961',
      };
    });
  }, [hero?.oath_tree]);

  // Lista de perícias treinadas
  const skillsList = useMemo(() => {
    if (!hero?.skills) return [];
    return hero.skills.map((s: any) => {
      if (typeof s === 'string') {
        return { name: s, bonus: 1, nivel: 1, maestria: 1 };
      }
      return {
        name: s.name || s.pericia,
        bonus: s.bonus !== undefined ? s.bonus : 1,
        nivel: s.nivel !== undefined ? s.nivel : 1,
        maestria: s.maestria !== undefined ? s.maestria : 1,
      };
    });
  }, [hero?.skills]);

  // Early returns (depois de todos os hooks chamados)
  if (isLoading && !hero) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 rounded-full border-2 border-[#c9a961] border-t-transparent animate-spin" />
          <span className="text-xs uppercase font-['Cinzel',serif] text-[#c9a961] tracking-widest">
            Invocando Ficha do Jurado...
          </span>
        </div>
      </main>
    );
  }

  if (!hero) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-xs text-[#9a917f] font-['Cinzel',serif]">
          Nenhum herói encontrado na mesa.
        </div>
      </main>
    );
  }

  return (
    <div className="confessor-tab-pane active" style={{ width: '100%', boxSizing: 'border-box' }}>
      <div className="game-hud-sheet-container">
        {/* ── ALERTA DRAMÁTICO DE JURADO CAÍDO ── */}
        {isFallen && (
          <div className="player-fallen-banner">
            <div className="player-fallen-icon">
              <Skull size={22} />
            </div>
            <div>
              <h3 className="player-fallen-title">JURADO CAÍDO — AGONIZANDO</h3>
              <p className="player-fallen-sub">
                Sua carne tombou nas sombras e seus batimentos cessaram. Apenas o fôlego do Confessor da Mesa pode reerguer sua promessa.
              </p>
            </div>
          </div>
        )}

        {/* ── TOPO: BANNER DO HERÓI COM CAMINHO & NÍVEL ── */}
        <div
          className="game-hud-header-module"
          style={isFallen ? { border: '1px solid rgba(239, 68, 68, 0.4)', background: 'linear-gradient(180deg, #1f0a0d 0%, #110608 100%)' } : undefined}
        >
          <div className="game-hud-header-top-row">
            <div className="game-hud-avatar-box">
              <img
                src={portrait}
                alt={hero.name}
                className="game-hud-portrait"
                style={isFallen ? { filter: 'grayscale(0.7) contrast(1.1)' } : undefined}
              />
              <span
                className="game-hud-level-badge"
                style={isFallen ? { background: '#991b1b', color: '#ffffff', animation: 'fallenPulse 1.8s infinite ease-in-out' } : undefined}
              >
                {isFallen ? '💀 CAÍDO' : `NÍVEL ${nivel}`}
              </span>
            </div>

            <div className="game-hud-title-info">
              <div className="game-hud-name-row">
                <h2 className="game-hud-name">{hero.name}</h2>
                {hero.race && <span className="game-hud-race-tag">{hero.race}</span>}
                {hero.caminho && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-title, "Cinzel", serif)',
                      color: '#f5e0a0',
                      background: 'rgba(207, 159, 56, 0.18)',
                      border: '1px solid #cf9f38',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      letterSpacing: '0.05em',
                      fontWeight: 700,
                    }}
                  >
                    CAMINHO: {hero.caminho.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="game-hud-title-text">{hero.title || 'Jurado dos Ermos'}</div>

              {/* Barra de XP */}
              <div
                onClick={() => setShowXPHistory(true)}
                title="Clique para ver o histórico de experiência"
                style={{ marginTop: '0.45rem', maxWidth: '320px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#c4b59f', fontFamily: 'var(--font-title, "Cinzel", serif)', marginBottom: '3px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    EXPERIÊNCIA (XP) <History size={11} color="#d4af37" />
                  </span>
                  <span>{xp} / {proximoXp} XP</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#18120e', borderRadius: '3px', overflow: 'hidden', border: '1px solid #3d2814' }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, (xp / proximoXp) * 100))}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #b45309, #f59e0b)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Botão Dourado de Subir de Nível quando Elegível */}
              {xp >= proximoXp && nivel < 10 && (
                <button
                  type="button"
                  onClick={() => setIsLevelUpOpen(true)}
                  style={{
                    marginTop: '0.55rem',
                    padding: '0.45rem 0.85rem',
                    background: 'linear-gradient(180deg, #d4af37 0%, #aa8420 100%)',
                    border: '1px solid #ffe599',
                    borderRadius: '4px',
                    color: '#1a140d',
                    fontFamily: 'Cinzel, serif',
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 0 15px rgba(212,175,55,0.7)',
                    animation: 'pulse 1.8s infinite ease-in-out',
                  }}
                >
                  <Sparkles size={14} />
                  <span>✦ SUBIR DE NÍVEL (NÍVEL {nivel + 1}) ✦</span>
                </button>
              )}

              {hero.oath_type && (
                <div className="game-hud-oath-type-pill" style={{ marginTop: '0.45rem' }}>
                  <span>VOTO: {hero.oath_type.toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>

          <Link
            to="/jogador/mochila"
            className="game-hud-btn-switch"
            title="Ir para a Mochila / Inventário de Pedra"
          >
            🎒 ABRIR MOCHILA
          </Link>
        </div>

        {/* ── PAINEL DE DEFESA, FOCO E INSPIRAÇÃO RÁPIDO (SIMÉTRICO 3 COLUNAS) ── */}
        <div className="game-hud-quick-stats-row">
          {/* DEFESA */}
          <div
            className="game-hud-module game-hud-stat-card"
            style={{ cursor: 'pointer', position: 'relative' }}
            onClick={() => setShowDefenseBreakdown((prev) => !prev)}
            title="Toque para ver o cálculo da Defesa"
          >
            <Shield size={20} style={{ color: '#60a5fa', flexShrink: 0 }} />
            <div className="game-hud-stat-content">
              <div className="game-hud-stat-header">
                <span>DEFESA</span>
                <span style={{ fontSize: '0.5rem', opacity: 0.7 }}>ℹ</span>
              </div>
              <div className="game-hud-stat-value" style={{ color: '#ffffff' }}>
                {defense}
              </div>
            </div>

            {showDefenseBreakdown && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: '105%',
                  left: 0,
                  zIndex: 40,
                  minWidth: '200px',
                  background: '#15100c',
                  border: '1px solid #60a5fa',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.85)',
                  animation: 'fadeIn 0.15s ease-out',
                }}
              >
                <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-title, "Cinzel", serif)', color: '#93c5fd', fontWeight: 700, marginBottom: '4px' }}>
                  CÁLCULO DA DEFESA
                </div>
                <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#f8fafc', background: 'rgba(0,0,0,0.4)', padding: '4px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {defense} = 7 (Base) + Armadura
                </div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '4px' }}>
                  Armadura equipada + bônus de talentos ativos
                </div>
              </div>
            )}
          </div>

          {/* FOCO */}
          <div className="game-hud-module game-hud-stat-card">
            <Zap size={20} style={{ color: '#38bdf8', flexShrink: 0 }} />
            <div className="game-hud-stat-content">
              <div className="game-hud-stat-header" style={{ color: '#7dd3fc' }}>
                FOCO
              </div>
              <div className="game-hud-stat-value" style={{ color: '#38bdf8' }}>
                {focoAtual}<small style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/{focoMax}</small>
              </div>
            </div>
          </div>

          {/* INSPIRAÇÃO (0 a 2 ÍCONES) */}
          <div className="game-hud-module game-hud-stat-card">
            <Sparkles size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <div className="game-hud-stat-content" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                <span className="game-hud-stat-header" style={{ color: '#fde68a', margin: 0 }}>
                  INSPIRAÇÃO
                </span>
                <span style={{ fontSize: '0.72rem', color: '#fde68a', fontWeight: 800 }}>
                  {inspiracao}/2
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px', alignItems: 'center' }}>
                {[1, 2].map((num) => (
                  <span
                    key={num}
                    style={{
                      fontSize: '1.1rem',
                      lineHeight: 1,
                      color: num <= inspiracao ? '#f59e0b' : '#453218',
                      textShadow: num <= inspiracao ? '0 0 8px rgba(245, 158, 11, 0.7)' : 'none',
                    }}
                  >
                    ✦
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── MÓDULOS DE VITAIS EM TEMPO REAL: VIDA & FOCO (SIMÉTRICOS) ── */}
        <div className="game-hud-vitals-dual-row" style={{ marginBottom: '0.85rem' }}>
          {/* VIDA (HP) */}
          <div className="game-hud-module vital-module game-hud-dual-module">
            <div className="game-hud-module-header">
              <div className="game-hud-module-label">
                <Heart size={14} className="vital-icon hp-icon" style={{ flexShrink: 0 }} />
                <span>VIDA</span>
              </div>
              <div className="game-hud-vital-score">
                <span className={`vital-val ${isDanger ? 'danger' : ''}`}>
                  {vidaAtual}
                </span>
                <span className="vital-max">/{vidaMax}</span>
              </div>
            </div>

            {/* BARRA DE PROGRESSO DE VIDA */}
            <div className="game-hud-bar-track">
              <div
                className={`game-hud-bar-fill hp-fill ${isDanger ? 'danger' : ''}`}
                style={{ width: `${Math.min(100, Math.max(0, (vidaAtual / vidaMax) * 100))}%` }}
              />
            </div>

            <div className="game-hud-vital-status-note">
              {isFallen ? (
                <span style={{ color: '#ef4444', fontWeight: 700 }}>💀 Inconsciente / Agonizando</span>
              ) : isDanger ? (
                <span style={{ color: '#f87171', fontWeight: 700 }}>⚠ Ferimentos Graves</span>
              ) : (
                <span>✦ Integridade física preservada</span>
              )}
            </div>
          </div>

          {/* FOCO */}
          <div className="game-hud-module vital-module game-hud-dual-module">
            <div className="game-hud-module-header">
              <div className="game-hud-module-label">
                <Zap size={14} style={{ color: '#38bdf8', flexShrink: 0 }} />
                <span>FOCO</span>
              </div>
              <div className="game-hud-vital-score">
                <span className="vital-val" style={{ color: '#38bdf8' }}>
                  {focoAtual}
                </span>
                <span className="vital-max">/{focoMax}</span>
              </div>
            </div>

            {/* BARRA DE PROGRESSO DE FOCO */}
            <div className="game-hud-bar-track">
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #0369a1 0%, #38bdf8 100%)',
                  boxShadow: '0 0 8px rgba(56, 189, 248, 0.6)',
                  transition: 'width 0.3s ease',
                  width: `${Math.min(100, Math.max(0, (focoAtual / focoMax) * 100))}%`,
                }}
              />
            </div>

            <div className="game-hud-vital-status-note">
              <span>✦ Concentração e canalização mística</span>
            </div>
          </div>
        </div>

        {/* ── SACIEDADE E PESTE (LADO A LADO SIMÉTRICOS) ── */}
        <div className="game-hud-vitals-dual-row" style={{ marginBottom: '0.85rem' }}>
          {/* SACIEDADE */}
          <div
            className="game-hud-module vital-module game-hud-dual-module"
            style={{ border: `1.5px solid ${estadoFome.cor}55` }}
          >
            <div className="game-hud-module-header">
              <div className="game-hud-module-label">
                <Utensils size={14} style={{ color: estadoFome.cor, flexShrink: 0 }} />
                <span>SACIEDADE</span>
              </div>
              <div className="game-hud-vital-score" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontFamily: 'var(--font-title, "Cinzel", serif)',
                    color: estadoFome.cor,
                    background: estadoFome.bg,
                    border: `1px solid ${estadoFome.cor}66`,
                    padding: '1px 5px',
                    borderRadius: '3px',
                    letterSpacing: '0.04em',
                    fontWeight: 800,
                  }}
                >
                  {estadoFome.nome.toUpperCase()}
                </span>
                <span className="vital-val" style={{ color: estadoFome.cor, fontSize: '1.05rem', fontWeight: 800 }}>
                  {saciedade}<small style={{ fontSize: '0.7rem', color: '#6e5942' }}>/10</small>
                </span>
              </div>
            </div>

            {/* BARRA DE 10 GOMOS */}
            <div className="game-hud-pips-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pip) => {
                const isFilled = pip <= saciedade;
                return (
                  <div
                    key={pip}
                    title={`Saciedade ${pip} de 10`}
                    style={{
                      height: '10px',
                      borderRadius: '2px',
                      background: isFilled ? estadoFome.cor : '#14100c',
                      border: isFilled ? `1px solid ${estadoFome.cor}` : '1px solid #2b2014',
                      boxShadow: isFilled ? `0 0 6px ${estadoFome.cor}66` : 'none',
                      transition: 'all 0.3s ease',
                      opacity: isFilled ? 1 : 0.35,
                    }}
                  />
                );
              })}
            </div>

            <div className="game-hud-vital-status-note">
              <span style={{ color: estadoFome.cor, fontWeight: 600 }}>{estadoFome.efeito}</span>
            </div>
          </div>

          {/* PESTE DO JURAMENTO */}
          <div className="game-hud-module vital-module plague-module game-hud-dual-module">
            <div className="game-hud-module-header">
              <div className="game-hud-module-label">
                <Droplets size={14} className="vital-icon plague-icon" style={{ flexShrink: 0 }} />
                <span>PESTE</span>
              </div>
              <div className="game-hud-vital-score" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontFamily: 'var(--font-title, "Cinzel", serif)',
                    color: plagueStage.cor,
                    background: `${plagueStage.cor}22`,
                    border: `1px solid ${plagueStage.cor}66`,
                    padding: '1px 5px',
                    borderRadius: '3px',
                    letterSpacing: '0.04em',
                    fontWeight: 800,
                  }}
                >
                  {plagueStage.nome.toUpperCase()}
                </span>
                <span className={`vital-val plague-val ${peste >= 8 ? 'transform' : peste >= 4 ? 'corrupt' : ''}`} style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                  {peste}<small style={{ fontSize: '0.7rem', color: '#6e5942' }}>/10</small>
                </span>
              </div>
            </div>

            {/* BARRA DE 10 GOMOS */}
            <div className="game-hud-pips-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pip) => {
                const isFilled = pip <= peste;
                const pipClass = pip <= 3 ? 'pip-mancha' : pip <= 7 ? 'pip-corrupt' : 'pip-transform';
                return (
                  <div
                    key={pip}
                    className={`game-hud-pip ${pipClass} ${isFilled ? 'active' : ''}`}
                    title={`Estágio de Peste ${pip}`}
                    style={{ height: '10px' }}
                  />
                );
              })}
            </div>

            <div className="game-hud-vital-status-note">
              <span>✦ {plagueStage.descricao}</span>
            </div>
          </div>
        </div>

        {/* ── ATRIBUTOS EM QUATRO BLOCOS SIMÉTRICOS ── */}
        <div className="game-hud-module attributes-module" style={{ marginBottom: '0.85rem' }}>
          <div className="game-hud-module-label" style={{ marginBottom: '0.6rem' }}>
            <ShieldCheck size={14} style={{ color: '#c9a961' }} />
            <span>ATRIBUTOS</span>
          </div>
          <div className="er-sheet-attributes-grid">
            {Object.entries(attrs).map(([attr, val]) => (
              <div key={attr} className="er-sheet-attribute-box">
                <div className="er-sheet-attribute-label">{attr}</div>
                <div
                  className="er-sheet-attribute-val"
                  style={{
                    color: val > 0 ? '#ffd27a' : val < 0 ? '#fca5a5' : '#f5ede0',
                  }}
                >
                  {val >= 0 ? `+${val}` : val}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PERÍCIAS & DOM DE NASCENÇA (SIMÉTRICOS) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
          {/* PERÍCIAS */}
          <div className="game-hud-module">
            <div className="game-hud-module-label" style={{ marginBottom: '0.55rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={14} style={{ color: '#c9a961' }} />
                <span>PERÍCIAS TREINADAS</span>
              </div>
              <Link
                to="/jogador/arvore"
                style={{
                  fontSize: '0.65rem',
                  color: '#ecc05c',
                  fontFamily: 'var(--font-title, "Cinzel", serif)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(236, 192, 92, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(236, 192, 92, 0.3)',
                  fontWeight: 700,
                }}
              >
                🌳 Árvore do Juramento →
              </Link>
            </div>
            {skillsList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {skillsList.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#1a130e',
                        border: '1px solid #4a3828',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontFamily: 'var(--font-title, "Cinzel", serif)',
                        color: '#f5e0a0',
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{s.name}</span>
                      <span style={{ color: '#4ade80', fontWeight: 800 }}>+{s.bonus}</span>
                      <span style={{ color: '#a8947c', fontSize: '0.68rem' }}>(nível {s.nivel})</span>
                      <span style={{ color: '#ecc05c', fontSize: '0.68rem', fontWeight: 600 }}>· Maestria {s.maestria}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#a8947c', fontStyle: 'italic', marginTop: '3px' }}>
                  ✦ Maestria = quantas vezes por sessão pode rolar de novo 1 dos 2 dados num teste daquela perícia.
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.75rem', color: '#8c7760', fontStyle: 'italic', margin: 0 }}>
                Nenhuma perícia especializada registrada.
              </p>
            )}
          </div>

          {/* DOM DE NASCENÇA */}
          <div className="game-hud-module">
            <div className="game-hud-module-label" style={{ marginBottom: '0.55rem' }}>
              <Compass size={14} style={{ color: '#38bdf8' }} />
              <span>DOM DE NASCENÇA</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#e2e8f0', lineHeight: 1.4, margin: 0 }}>
              {hero.gift || hero.racial_trait || 'Resiliência natural conferida pelos ancestrais de Aldrenor.'}
            </p>
          </div>
        </div>

        {/* ── TALENTOS DA ÁRVORE DO JURAMENTO ── */}
        <div className="game-hud-module" style={{ marginBottom: '0.85rem' }}>
          <div className="game-hud-module-label" style={{ marginBottom: '0.55rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} style={{ color: '#ecc05c' }} />
              <span>TALENTOS DA ÁRVORE ({treeTalents.length})</span>
            </div>
            <Link
              to="/jogador/arvore"
              style={{
                fontSize: '0.65rem',
                color: '#ecc05c',
                fontFamily: 'var(--font-title, "Cinzel", serif)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(236, 192, 92, 0.12)',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid rgba(236, 192, 92, 0.3)',
                fontWeight: 700,
              }}
            >
              Ver Constelação →
            </Link>
          </div>
          {treeTalents.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
              {treeTalents.map((t: any) => (
                <div
                  key={t.id}
                  style={{
                    background: 'linear-gradient(180deg, #18120d 0%, #100b07 100%)',
                    border: `1px solid ${t.cor || '#4a3828'}`,
                    borderLeft: `3px solid ${t.cor || '#ecc05c'}`,
                    padding: '7px 10px',
                    borderRadius: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong style={{ fontSize: '0.78rem', color: '#fef08a', fontFamily: 'var(--font-title, "Cinzel", serif)' }}>
                      {t.nm}
                    </strong>
                    <span style={{ fontSize: '0.62rem', color: t.cor || '#cf9f38', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t.reg}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.70rem', color: '#d6cbb8', lineHeight: 1.3 }}>
                    {t.ds}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', color: '#8c7760', fontStyle: 'italic' }}>
                Nenhum talento extra liberado. Invista Inspiração na Árvore do Juramento.
              </span>
              <Link
                to="/jogador/arvore"
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  background: '#2b2115',
                  border: '1px solid #634d31',
                  borderRadius: '4px',
                  color: '#e5cb93',
                  fontFamily: 'var(--font-title, "Cinzel", serif)',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                ✦ Desbloquear Talentos
              </Link>
            </div>
          )}
        </div>

        {/* ── ARMAS EM PUNHO & ATAQUES DE COMBATE 2.0 ── */}
        <div className="game-hud-module" style={{ marginBottom: '0.85rem' }}>
          <div className="game-hud-module-label" style={{ marginBottom: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sword size={15} style={{ color: '#ef4444' }} />
              <span>ARSENAL & ATAQUES DISPONÍVEIS</span>
            </div>
            <Link to="/jogador/dados" style={{ fontSize: '0.65rem', color: '#ecc05c', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>ROLAR ATAQUE</span> →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '0.75rem' }}>
            {attacks.map((atk) => (
              <div
                key={atk.id}
                style={{
                  background: 'linear-gradient(180deg, #1b130e 0%, #120c08 100%)',
                  border: '1px solid #4a3420',
                  borderRadius: '6px',
                  padding: '0.75rem 0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {atk.isRanged ? <Crosshair size={13} style={{ color: '#38bdf8' }} /> : <Sword size={13} style={{ color: '#f87171' }} />}
                    <strong style={{ fontFamily: 'var(--font-title, "Cinzel", serif)', color: '#fff1d4', fontSize: '0.88rem' }}>
                      {atk.name}
                    </strong>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#cf9f38', fontFamily: 'var(--font-title, "Cinzel", serif)', letterSpacing: '.04em' }}>
                    {atk.slotLabel}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                  <span style={{ fontSize: '0.72rem', background: '#261a12', border: '1px solid #5a3c20', padding: '2px 7px', borderRadius: '4px', color: '#fcd34d' }}>
                    Ataque: <strong>+{atk.totalAttackMod}</strong> ({atk.attackAttr})
                  </span>
                  <span style={{ fontSize: '0.72rem', background: '#261214', border: '1px solid #6b1f24', padding: '2px 7px', borderRadius: '4px', color: '#fca5a5' }}>
                    Dano: <strong>{atk.damageDice}{atk.damageBonus ? ` + ${atk.damageBonus}` : ''}</strong>
                  </span>
                  {atk.twoHanded && (
                    <span style={{ fontSize: '0.62rem', background: '#2e2015', border: '1px solid #8c6a38', padding: '1px 5px', borderRadius: '3px', color: '#fed7aa' }}>
                      2 MÃOS
                    </span>
                  )}
                  {atk.isRanged && (
                    <span style={{ fontSize: '0.68rem', background: '#10222a', border: '1px solid #0369a1', padding: '2px 6px', borderRadius: '4px', color: '#7dd3fc' }}>
                      À Distância
                    </span>
                  )}
                </div>

                {atk.special && (
                  <p style={{ margin: '3px 0 0', fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.3 }}>
                    ✦ {atk.special}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── JURAMENTO EM DESTAQUE COM DIVISORES ORNAMENTAIS ── */}
        <div className="er-sheet-oath-box">
          <div style={{ fontFamily: 'var(--font-title, "Cinzel", serif)', fontSize: '11px', letterSpacing: '0.14em', color: '#c9a961', textTransform: 'uppercase' }}>
            A PALAVRA EMPENHADA
          </div>
          <div className="ornamental-divider">
            <span className="diamond" />
          </div>
          <div className="er-sheet-oath-text">
            "{hero.oath || 'Por minha honra e meu sangue, cumprirei o dever até o fim.'}"
          </div>
          <div className="ornamental-divider">
            <span className="diamond" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px', textAlign: 'left' }}>
            <div style={{ background: '#14100c', padding: '8px 12px', borderRadius: '6px', border: '1px solid #3d2f20' }}>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-title, "Cinzel", serif)', color: '#c9a961' }}>PODER DO VOTO:</span>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#efe3c8' }}>
                {hero.oath_power || 'Canaliza façanhas sobre-humanas enquanto o voto for mantido.'}
              </p>
            </div>
            <div style={{ background: '#14100c', padding: '8px 12px', borderRadius: '6px', border: '1px solid #3d2f20' }}>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-title, "Cinzel", serif)', color: '#c9a961' }}>RELÍQUIA SAGRADA:</span>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#ffd27a' }}>
                {hero.oath_item || 'Selo de bronze do juramento antigo.'}
              </p>
            </div>
          </div>
        </div>

        {/* ── LINHAGEM & LAÇOS (SIMÉTRICOS) ── */}
        <div className="game-hud-lore-grid">
          <div className="game-hud-module lore-module">
            <div className="game-hud-module-label">
              <span>✦ TRAÇO DA LINHAGEM ({hero.race || 'Humano'})</span>
            </div>
            <p className="game-hud-lore-text">
              {hero.racial_trait || 'Firmeza e determinação inabalável diante dos perigos da Peste.'}
            </p>
          </div>
          <div className="game-hud-module lore-module">
            <div className="game-hud-module-label">
              <span>✦ HISTÓRIA & LAÇO DE COMPANHEIRISMO</span>
            </div>
            <p className="game-hud-lore-text italic">
              "{hero.backstory || 'Caminhou sob as névoas em busca de redenção.'}" — <span style={{ color: '#c9a961' }}>{hero.connection || 'Laço com a comitiva.'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── MODAL: HISTÓRICO DE XP ── */}
      {showXPHistory && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#16120e', border: '2px solid #d4af37', borderRadius: '8px', maxWidth: '520px', width: '100%', padding: '1.5rem', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={18} color="#d4af37" />
                <h3 style={{ fontFamily: 'Cinzel, serif', color: '#d4af37', margin: 0, fontSize: '1.2rem' }}>
                  Histórico de Experiência
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowXPHistory(false)}
                style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.4rem' }}>
              <div style={{ textAlign: 'center', padding: '2rem', color: '#8c8273' }}>
                Total acumulado: <strong style={{ color: '#ffd27a' }}>{xp} XP</strong> (Próximo marco de subida: {proximoXp} XP)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SUBIR DE NÍVEL ── */}
      <LevelUpModal
        hero={hero}
        isOpen={isLevelUpOpen}
        onClose={() => setIsLevelUpOpen(false)}
        onConfirm={() => setIsLevelUpOpen(false)}
      />
    </div>
  );
};
