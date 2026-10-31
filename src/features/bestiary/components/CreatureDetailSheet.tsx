import {
  AlertTriangle,
  Archive,
  ChevronRight,
  Copy,
  Dices,
  Edit,
  Eye,
  Film,
  Flame,
  Gift,
  Heart,
  LayoutGrid,
  Shield,
  Skull,
  Sparkles,
  Sword,
  Utensils,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Badge, Button, Sheet } from '../../../shared/ui/index.ts';
import type { Creature, CreatureAttack } from '../api/types.ts';

interface CreatureDetailSheetProps {
  creature: Creature | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendToTable: (creature: Creature) => void;
  onSendToBattle: (creature: Creature) => void;
  onOpenMedia: (creature: Creature) => void;
  onEdit: (creature: Creature) => void;
  onArchive: (creature: Creature) => void;
}

export const CreatureDetailSheet: React.FC<CreatureDetailSheetProps> = ({
  creature,
  open,
  onOpenChange,
  onSendToTable,
  onSendToBattle,
  onOpenMedia,
  onEdit,
  onArchive,
}) => {
  const [rollResult, setRollResult] = useState<{
    attackName: string;
    attackRoll: number;
    attackTotal: number;
    damageDice: string;
    damageRoll: number;
    isCrit: boolean;
  } | null>(null);

  if (!creature) return null;

  const handleRollAttack = (atk: CreatureAttack) => {
    // 2d6 + bonus
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const roll = d1 + d2;
    const isCrit = d1 === 6 && d2 === 6;
    const bonus = Number(creature.attack_bonus || 0);
    const attackTotal = roll + bonus;

    // Roll damage dice (e.g. "1d8", "2d6", "1d10+2")
    let damageRoll = 4;
    try {
      const match = (atk.dano || creature.damage_dice || '1d6').match(/(\d+)d(\d+)(?:\+(\d+))?/i);
      if (match) {
        const count = parseInt(match[1], 10);
        const sides = parseInt(match[2], 10);
        const mod = match[3] ? parseInt(match[3], 10) : 0;
        let sum = mod;
        for (let i = 0; i < count; i++) {
          sum += Math.floor(Math.random() * sides) + 1;
        }
        damageRoll = isCrit ? sum * 2 : sum;
      }
    } catch (_) {}

    setRollResult({
      attackName: atk.nome,
      attackRoll: roll,
      attackTotal,
      damageDice: atk.dano || creature.damage_dice || '1d6',
      damageRoll,
      isCrit,
    });

    toast.info(
      `Rolagem: ${atk.nome} — Acerto ${attackTotal} (Dados: ${roll} + ${bonus}), Dano: ${damageRoll}`,
    );
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      className="p-0 bg-[#0d0d10] border-l border-white/10 sm:max-w-2xl lg:max-w-3xl"
    >
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Poster Image / Hero Banner at Top */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-black/80 shrink-0 border-b border-white/10">
          {creature.poster_url || creature.image_url ? (
            <img
              src={creature.poster_url || creature.image_url || ''}
              alt={creature.name}
              className="h-full w-full object-cover object-center filter brightness-90 contrast-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-t from-[#121215] to-[#1a1a20]">
              <span className="text-6xl">{creature.icon || '🐺'}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d10] via-black/40 to-transparent" />

          {/* Top Badges overlay */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <Badge variant="accent">Ameaça {creature.threat}/10</Badge>
            <Badge variant="comum">{creature.tier || 'Soldado'}</Badge>
            {creature.plague && <Badge variant="danger">Contaminado pela Peste</Badge>}
            {creature.unique && <Badge variant="artefato">Único / Lendário</Badge>}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Title Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="font-cinzel text-2xl sm:text-3xl font-bold tracking-tight text-[#f5b65b]">
                {creature.name}
              </h2>
              <p className="font-serif text-sm text-white/60 mt-1">
                {creature.species || creature.category} · {creature.size || 'Médio'} ·{' '}
                {creature.region || 'Região Desconhecida'}
              </p>
            </div>

            {/* Main Golden CTA & Action Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Golden Colocar na Mesa Button */}
              <Button
                data-testid="detail-send-table-btn"
                variant="primary"
                onClick={() => onSendToTable(creature)}
                className="bg-[#f5b65b] text-black hover:bg-[#ecc05c] font-cinzel font-bold text-xs shadow-lg shadow-[#f5b65b]/20 flex items-center gap-1.5"
              >
                <LayoutGrid className="h-4 w-4" />
                <span>Colocar na mesa</span>
              </Button>

              {/* Colocar na Batalha */}
              <Button
                data-testid="detail-send-battle-btn"
                variant="secondary"
                onClick={() => onSendToBattle(creature)}
                className="font-cinzel text-xs flex items-center gap-1.5"
              >
                <Sword className="h-4 w-4 text-[#ff4d4f]" />
                <span>Colocar na batalha</span>
              </Button>

              {/* 🎞 Mídia de Batalha (Film Lucide) */}
              <Button
                data-testid="detail-open-media-btn"
                variant="outline"
                onClick={() => onOpenMedia(creature)}
                title="Configurar vídeo idle, croma e âncora dos pés"
                className="text-xs flex items-center gap-1 text-[#f5b65b] border-[#f5b65b]/30 hover:bg-[#f5b65b]/10"
              >
                <Film className="h-4 w-4" />
                <span className="hidden sm:inline">Mídia</span>
              </Button>

              {/* Edit */}
              <Button
                data-testid="detail-edit-btn"
                variant="outline"
                size="sm"
                onClick={() => onEdit(creature)}
                title="Editar estatísticas da criatura"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>

              {/* Archive */}
              <Button
                data-testid="detail-archive-btn"
                variant="outline"
                size="sm"
                onClick={() => onArchive(creature)}
                title="Arquivar criatura do catálogo"
                className="text-[#ff4d4f]/80 hover:text-[#ff4d4f] hover:border-[#ff4d4f]/40"
              >
                <Archive className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Description Quote */}
          {creature.description && (
            <blockquote className="rounded-xl border-l-2 border-[#f5b65b]/50 bg-white/[0.02] p-3 text-xs italic font-serif text-white/70 leading-relaxed">
              "{creature.description}"
            </blockquote>
          )}

          {/* Attributes in Blocks */}
          <div className="space-y-2">
            <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-white/50">
              Estatísticas & Atributos de Enfrentamento
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* HP */}
              <div className="rounded-xl border border-white/10 bg-[#16161a] p-3 text-center">
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-serif font-bold">
                  Vida Máxima
                </span>
                <div className="font-mono text-xl sm:text-2xl font-bold text-[#ff4d4f] tabular-nums mt-0.5">
                  {creature.max_hp} <span className="text-xs text-white/40">PV</span>
                </div>
              </div>

              {/* DEFENSE */}
              <div className="rounded-xl border border-white/10 bg-[#16161a] p-3 text-center">
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-serif font-bold">
                  Defesa
                </span>
                <div className="font-mono text-xl sm:text-2xl font-bold text-[#ebe6d6] tabular-nums mt-0.5">
                  {creature.defense}
                </div>
              </div>

              {/* ATTACK & DAMAGE */}
              <div className="rounded-xl border border-white/10 bg-[#16161a] p-3 text-center">
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-serif font-bold">
                  Ataque / Dano
                </span>
                <div className="font-mono text-lg sm:text-xl font-bold text-[#f5b65b] tabular-nums mt-0.5">
                  +{creature.attack_bonus}{' '}
                  <span className="text-xs text-white/60">({creature.damage_dice})</span>
                </div>
              </div>

              {/* EXTRAÇÃO / HARVEST */}
              <div className="rounded-xl border border-white/10 bg-[#16161a] p-3 text-center">
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-serif font-bold">
                  Extração
                </span>
                <div className="font-mono text-sm sm:text-base font-bold text-[#e0a96d] tabular-nums mt-1">
                  {creature.harvest_skill || 'Sobrevivência'}
                </div>
                <span className="text-[10px] text-white/40 font-mono">
                  Peso {creature.harvest_peso || 1}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Roll Feedback Card (if rolled) */}
          {rollResult && (
            <div className="rounded-xl border border-[#f5b65b]/40 bg-[#f5b65b]/5 p-3 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-3">
                <Dices className="h-5 w-5 text-[#f5b65b]" />
                <div>
                  <div className="font-cinzel text-xs font-bold text-[#f5b65b]">
                    {rollResult.attackName} {rollResult.isCrit && '★ CRÍTICO!'}
                  </div>
                  <div className="text-[11px] font-mono text-white/70">
                    Acerto: <b>{rollResult.attackTotal}</b> (Dados: {rollResult.attackRoll} + Bônus) · Dano: <b className="text-[#ff4d4f]">{rollResult.damageRoll}</b> ({rollResult.damageDice})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRollResult(null)}
                className="text-white/40 hover:text-white text-xs p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Attack List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                <Sword className="h-3.5 w-3.5 text-[#ff4d4f]" />
                Ataques & Ações de Combate ({(creature.ataques || []).length})
              </h3>
            </div>

            <div className="space-y-2.5">
              {(creature.ataques && creature.ataques.length > 0
                ? creature.ataques
                : [
                    {
                      nome: 'Ataque Selvagem',
                      dano: creature.damage_dice || '1d6',
                      tipo: 'físico',
                      acerto: creature.attack_bonus || 0,
                    },
                  ]
              ).map((atk, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-[#16161a] p-3.5 space-y-2 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-cinzel text-sm font-bold text-[#ebe6d6]">
                        ⚔️ {atk.nome}
                      </span>
                      <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] font-mono text-white/60">
                        Acerto: +{atk.acerto ?? creature.attack_bonus ?? 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-2 py-0.5 font-mono text-xs font-semibold text-[#ff8a82]">
                        {atk.dano || creature.damage_dice} ({atk.tipo || 'físico'})
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRollAttack(atk)}
                        className="h-7 px-2 font-mono text-xs flex items-center gap-1 text-[#f5b65b]"
                        title="Rolar ataque e dano"
                      >
                        <Dices className="h-3 w-3" />
                        <span>Rolar</span>
                      </Button>
                    </div>
                  </div>

                  {atk.desc && (
                    <p className="text-xs italic font-serif text-white/60">{atk.desc}</p>
                  )}

                  {/* Effects on Hit */}
                  {atk.efeitos && atk.efeitos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {atk.efeitos.map((ef, eIdx) => (
                        <span
                          key={eIdx}
                          className="inline-flex items-center gap-1 rounded bg-[#f5b65b]/10 border border-[#f5b65b]/20 px-2 py-0.5 text-[10px] font-serif text-[#f5b65b]"
                        >
                          <span>⚠️ {ef.condicao}</span>
                          <span className="text-white/40">({ef.chance}%)</span>
                          {ef.pilhas && <span>· {ef.pilhas}p</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Traits, Abilities & Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Special Abilities */}
            <div className="rounded-xl border border-white/10 bg-[#16161a] p-4 space-y-2">
              <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-[#f5b65b]" />
                Habilidades Especiais
              </h4>
              {Array.isArray(creature.abilities) && creature.abilities.length > 0 ? (
                <ul className="space-y-1.5 text-xs font-serif text-white/70 list-disc list-inside">
                  {creature.abilities.map((ab: any, aIdx: number) => (
                    <li key={aIdx} className="leading-relaxed">
                      {typeof ab === 'string' ? ab : ab.name ? `${ab.name}: ${ab.description || ''}` : JSON.stringify(ab)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs italic text-white/40 font-serif">
                  Nenhuma habilidade sobrenatural registrada.
                </p>
              )}
            </div>

            {/* Weakness & Lair */}
            <div className="rounded-xl border border-white/10 bg-[#16161a] p-4 space-y-2">
              <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-[#ff4d4f]" />
                Fraqueza Conhecida
              </h4>
              <p className="text-xs font-semibold text-[#ff8a82] font-serif">
                {creature.weakness || 'Nenhuma fraqueza evidente.'}
              </p>

              {creature.lair && (
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-white/40 font-serif font-bold">
                    Guarida / Habitat
                  </span>
                  <p className="text-xs italic text-white/60 font-serif">{creature.lair}</p>
                </div>
              )}
            </div>
          </div>

          {/* Loot / Harvest items */}
          <div className="rounded-xl border border-white/10 bg-[#16161a] p-4 space-y-3">
            <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
              <Gift className="h-3.5 w-3.5 text-[#f5b65b]" />
              Espólios Extraíveis ({creature.harvest_skill || 'Sobrevivência'})
            </h4>
            {Array.isArray(creature.loot) && creature.loot.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {creature.loot.map((it: any, lIdx: number) => (
                  <div
                    key={lIdx}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-xs font-serif text-[#ebe6d6]"
                  >
                    <span className="font-semibold">{it.name || it.nome}</span>
                    <span className="text-white/40 text-[11px] font-mono">
                      ({it.qty || it.qtd || 1}x · {it.chance || 100}%)
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-white/40 font-serif">
                Partes comuns: couro, carne e ossos padrão.
              </p>
            )}
          </div>

          {/* Cooking & Consumption */}
          {(creature.edible || creature.cooking || creature.eat_effect) && (
            <div className="rounded-xl border border-white/10 bg-[#16161a] p-4 space-y-2">
              <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                <Utensils className="h-3.5 w-3.5 text-[#5be584]" />
                Culinária dos Ermos
              </h4>
              {creature.cooking && (
                <p className="text-xs text-white/70 font-serif">
                  <b className="text-white">Preparo:</b> {creature.cooking}
                </p>
              )}
              {creature.eat_effect && (
                <p className="text-xs text-[#5be584] font-serif">
                  <b className="text-white">Efeito ao consumir:</b> {creature.eat_effect}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
};
