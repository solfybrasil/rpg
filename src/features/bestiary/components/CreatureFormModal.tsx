import { Loader2, Plus, Sparkles, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Button, Modal } from '../../../shared/ui/index.ts';
import type { Creature } from '../api/types.ts';
import {
  BESTIARY_CATEGORIES,
  BESTIARY_REGIONS,
  BESTIARY_TIERS,
} from '../data/constants.ts';

interface CreatureFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creature: Creature | null;
  onSave: (creatureData: Partial<Creature>) => Promise<void>;
}

export const CreatureFormModal: React.FC<CreatureFormModalProps> = ({
  open,
  onOpenChange,
  creature,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [category, setCategory] = useState<string>('Fera');
  const [tier, setTier] = useState<string>('Soldado');
  const [region, setRegion] = useState<string>('Charnecas Esquecidas');
  const [threat, setThreat] = useState(3);
  const [maxHp, setMaxHp] = useState(20);
  const [defense, setDefense] = useState(12);
  const [attackBonus, setAttackBonus] = useState(2);
  const [damageDice, setDamageDice] = useState('1d8');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [weakness, setWeakness] = useState('');
  const [lair, setLair] = useState('');
  const [edible, setEdible] = useState(false);
  const [plague, setPlague] = useState(false);
  const [unique, setUnique] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (creature) {
      setName(creature.name || '');
      setSpecies(creature.species || '');
      setCategory(creature.category || 'Fera');
      setTier(creature.tier || 'Soldado');
      setRegion(creature.region || 'Charnecas Esquecidas');
      setThreat(Number(creature.threat || 3));
      setMaxHp(Number(creature.max_hp || 20));
      setDefense(Number(creature.defense || 12));
      setAttackBonus(Number(creature.attack_bonus || 2));
      setDamageDice(creature.damage_dice || '1d8');
      setImageUrl(creature.image_url || '');
      setDescription(creature.description || '');
      setWeakness(creature.weakness || '');
      setLair(creature.lair || '');
      setEdible(!!creature.edible);
      setPlague(!!creature.plague);
      setUnique(!!creature.unique);
    } else {
      setName('');
      setSpecies('');
      setCategory('Fera');
      setTier('Soldado');
      setRegion('Charnecas Esquecidas');
      setThreat(3);
      setMaxHp(20);
      setDefense(12);
      setAttackBonus(2);
      setDamageDice('1d8');
      setImageUrl('');
      setDescription('');
      setWeakness('');
      setLair('');
      setEdible(false);
      setPlague(false);
      setUnique(false);
    }
  }, [creature, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        ...(creature ? { id: creature.id } : {}),
        name: name.trim(),
        species: species.trim() || null,
        category,
        tier,
        region,
        threat: Number(threat),
        max_hp: Number(maxHp),
        defense: Number(defense),
        attack_bonus: Number(attackBonus),
        damage_dice: damageDice.trim() || '1d6',
        image_url: imageUrl.trim() || null,
        description: description.trim() || null,
        weakness: weakness.trim() || null,
        lair: lair.trim() || null,
        edible,
        plague,
        unique,
      });
      onOpenChange(false);
    } catch (_) {
      // Error handled by caller
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={creature ? `Editar Fera · ${creature.name}` : 'Registrar Nova Fera no Bestiário'}
      description="Preencha os dados e atributos da criatura para catálogo e combate."
      className="max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Name and Species */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-serif text-white/70 mb-1">Nome da Criatura *</label>
            <input
              type="text"
              required
              data-testid="creature-form-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Urso da Bruma"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-serif text-white/70 mb-1">Espécie / Raça</label>
            <input
              type="text"
              data-testid="creature-form-species"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              placeholder="Ex: Urso Silvestre"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            />
          </div>
        </div>

        {/* Category, Tier, Region */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-serif text-white/70 mb-1">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#16161a] px-2.5 py-1.5 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            >
              {BESTIARY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-serif text-white/70 mb-1">Patamar (Tier)</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#16161a] px-2.5 py-1.5 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            >
              {BESTIARY_TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-serif text-white/70 mb-1">Região</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#16161a] px-2.5 py-1.5 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            >
              {BESTIARY_REGIONS.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats: Threat, HP, Defense, Attack, Damage */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-serif text-white/70 mb-1">Ameaça (1-10)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={threat}
              onChange={(e) => setThreat(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[#f5b65b] font-mono font-bold focus:border-[#f5b65b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-serif text-white/70 mb-1">Vida Máxima</label>
            <input
              type="number"
              min={1}
              value={maxHp}
              onChange={(e) => setMaxHp(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[#ff4d4f] font-mono font-bold focus:border-[#f5b65b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-serif text-white/70 mb-1">Defesa</label>
            <input
              type="number"
              min={1}
              value={defense}
              onChange={(e) => setDefense(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[#ebe6d6] font-mono font-bold focus:border-[#f5b65b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-serif text-white/70 mb-1">Ataque (+)</label>
            <input
              type="number"
              value={attackBonus}
              onChange={(e) => setAttackBonus(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[#f5b65b] font-mono font-bold focus:border-[#f5b65b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-serif text-white/70 mb-1">Dano</label>
            <input
              type="text"
              value={damageDice}
              onChange={(e) => setDamageDice(e.target.value)}
              placeholder="1d8"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[#ebe6d6] font-mono focus:border-[#f5b65b] focus:outline-none"
            />
          </div>
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-xs font-serif text-white/70 mb-1">URL da Imagem / Pôster</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://exemplo.com/imagem.png"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-serif text-white/70 mb-1">Descrição & Ecologia</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes comportamentais e lenda local sobre a fera..."
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[#ebe6d6] font-serif focus:border-[#f5b65b] focus:outline-none"
          />
        </div>

        {/* Weakness & Lair */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-serif text-white/70 mb-1">Fraqueza Conhecida</label>
            <input
              type="text"
              value={weakness}
              onChange={(e) => setWeakness(e.target.value)}
              placeholder="Ex: Fogo alquímico, prata pura"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-serif text-white/70 mb-1">Guarida / Toca</label>
            <input
              type="text"
              value={lair}
              onChange={(e) => setLair(e.target.value)}
              placeholder="Ex: Cavernas submersas"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            />
          </div>
        </div>

        {/* Flags Checkboxes */}
        <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-white/10">
          <label className="flex items-center gap-2 text-xs font-serif text-white/80 cursor-pointer">
            <input
              type="checkbox"
              checked={plague}
              onChange={(e) => setPlague(e.target.checked)}
              className="rounded border-white/20 bg-black/40 text-[#ff4d4f] focus:ring-0"
            />
            <span>Contaminado pela Peste (🩸)</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-serif text-white/80 cursor-pointer">
            <input
              type="checkbox"
              checked={edible}
              onChange={(e) => setEdible(e.target.checked)}
              className="rounded border-white/20 bg-black/40 text-[#5be584] focus:ring-0"
            />
            <span>Comestível (🍖)</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-serif text-white/80 cursor-pointer">
            <input
              type="checkbox"
              checked={unique}
              onChange={(e) => setUnique(e.target.checked)}
              className="rounded border-white/20 bg-black/40 text-[#f5b65b] focus:ring-0"
            />
            <span>Criatura Única / Lendária (⚜)</span>
          </label>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 font-cinzel text-xs font-semibold"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{creature ? 'Salvar Alterações' : 'Criar Criatura'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
