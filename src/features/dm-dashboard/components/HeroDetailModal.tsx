import {
  AlertTriangle,
  Award,
  BookOpen,
  Camera,
  Check,
  Edit3,
  Heart,
  Loader2,
  Package,
  Plus,
  Save,
  Shield,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { queryKeys, supabase } from '../../../shared/supabase';
import type { HeroDashboardItem, InventoryRow } from '../types';

interface HeroDetailModalProps {
  hero: HeroDashboardItem | null;
  onClose: () => void;
  onRemoveItem: (itemId: string, heroId: string) => Promise<void>;
  onApplyCondition: (heroId: string, conditionName: string) => Promise<void>;
  onRemoveCondition: (heroId: string, conditionName: string) => Promise<void>;
  onSaveHeroDetails: (heroId: string, patch: Record<string, unknown>) => Promise<void>;
}

const COMMON_CONDITIONS = [
  'Exausto',
  'Envenenado',
  'Sangrando',
  'Queimado',
  'Atordoado',
  'Cego',
  'Amedrontado',
  'Imóvel',
  'Inconsciente',
];

export function HeroDetailModal({
  hero,
  onClose,
  onRemoveItem,
  onApplyCondition,
  onRemoveCondition,
  onSaveHeroDetails,
}: HeroDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'sheet' | 'oath'>('sheet');
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estados locais para edição dos dados da ficha
  const [editName, setEditName] = useState('');
  const [editRace, setEditRace] = useState('');
  const [editCaminho, setEditCaminho] = useState('');
  const [editMaxHealth, setEditMaxHealth] = useState(10);
  const [editMaxFocus, setEditMaxFocus] = useState(3);
  const [editDefense, setEditDefense] = useState(8);
  const [editAttributes, setEditAttributes] = useState({
    corpo: 0,
    astucia: 0,
    vontade: 0,
    presenca: 0,
  });
  const [editOath, setEditOath] = useState('');
  const [editOathPower, setEditOathPower] = useState('');
  const [editBackstory, setEditBackstory] = useState('');
  const [customCondName, setCustomCondName] = useState('');

  useEffect(() => {
    if (!hero) return;
    setEditName(hero.name);
    setEditRace(hero.race);
    setEditCaminho(hero.caminho);
    setEditMaxHealth(hero.maxHealth);
    setEditMaxFocus(hero.maxFocus);
    setEditDefense(hero.defense);
    setEditAttributes({ ...hero.attributes });
    setEditOath(hero.oath || '');
    setEditOathPower(hero.oathPower || '');
    setEditBackstory(hero.backstory || '');

    // Busca inventário do herói
    setIsLoadingItems(true);
    supabase
      .from('inventory_items')
      .select('*')
      .eq('character_id', hero.id)
      .then(({ data }) => {
        setItems(data || []);
        setIsLoadingItems(false);
      });
  }, [hero]);

  if (!hero) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveHeroDetails(hero.id, {
        name: editName,
        race: editRace,
        caminho: editCaminho,
        max_health: editMaxHealth,
        max_focus: editMaxFocus,
        defense: editDefense,
        attributes: editAttributes,
        oath: editOath,
        oath_power: editOathPower,
        backstory: editBackstory,
      });
      toast.success('Ficha atualizada com sucesso!');
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar ficha.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCondition = async (cond: string) => {
    if (!cond.trim()) return;
    await onApplyCondition(hero.id, cond.trim());
    setCustomCondName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-[#140e0a] border border-[#8c6941]/60 shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-800 bg-[#1a120d]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-500/50 bg-[#100b08] flex-shrink-0">
              {hero.portraitUrl ? (
                <img src={hero.portraitUrl} alt={hero.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-heading font-bold text-amber-300">
                  {hero.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-amber-100 flex items-center gap-2">
                <span>{hero.name}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    hero.isOnline ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-stone-600'
                  }`}
                />
              </h2>
              <p className="text-xs text-amber-500/80 font-heading">
                {hero.race} • {hero.caminho}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Abas */}
        <div className="flex items-center border-b border-stone-800 bg-black/40 px-4 sm:px-5">
          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            className={`px-4 py-3 font-heading text-xs uppercase tracking-wider font-semibold border-b-2 transition ${
              activeTab === 'sheet'
                ? 'border-amber-500 text-amber-200'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Ficha & Atributos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-3 font-heading text-xs uppercase tracking-wider font-semibold border-b-2 transition ${
              activeTab === 'inventory'
                ? 'border-amber-500 text-amber-200'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Mochila ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('oath')}
            className={`px-4 py-3 font-heading text-xs uppercase tracking-wider font-semibold border-b-2 transition ${
              activeTab === 'oath'
                ? 'border-amber-500 text-amber-200'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Juramento & História
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'sheet' && (
            <div className="space-y-6">
              {/* Atributos Principais */}
              <div>
                <h4 className="text-xs font-heading uppercase tracking-wider text-amber-500/90 mb-3">
                  Atributos Principais
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['corpo', 'astucia', 'vontade', 'presenca'] as const).map((attr) => (
                    <div
                      key={attr}
                      className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 text-center"
                    >
                      <span className="block text-[11px] font-heading uppercase text-stone-400 mb-1">
                        {attr}
                      </span>
                      <input
                        type="number"
                        value={editAttributes[attr]}
                        onChange={(e) =>
                          setEditAttributes({
                            ...editAttributes,
                            [attr]: Number(e.target.value),
                          })
                        }
                        className="w-16 mx-auto text-center font-heading text-lg font-bold text-amber-200 bg-stone-950 border border-stone-700 rounded-md py-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Vitals Máximos & Defesa */}
              <div>
                <h4 className="text-xs font-heading uppercase tracking-wider text-amber-500/90 mb-3">
                  Limites Vitais & Defesa
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 text-center">
                    <span className="block text-[11px] font-heading uppercase text-emerald-400 mb-1">
                      Vida Máxima
                    </span>
                    <input
                      type="number"
                      value={editMaxHealth}
                      onChange={(e) => setEditMaxHealth(Number(e.target.value))}
                      className="w-16 mx-auto text-center font-heading text-lg font-bold text-emerald-300 bg-stone-950 border border-stone-700 rounded-md py-1"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 text-center">
                    <span className="block text-[11px] font-heading uppercase text-sky-400 mb-1">
                      Foco Máximo
                    </span>
                    <input
                      type="number"
                      value={editMaxFocus}
                      onChange={(e) => setEditMaxFocus(Number(e.target.value))}
                      className="w-16 mx-auto text-center font-heading text-lg font-bold text-sky-300 bg-stone-950 border border-stone-700 rounded-md py-1"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 text-center">
                    <span className="block text-[11px] font-heading uppercase text-amber-400 mb-1">
                      Defesa
                    </span>
                    <input
                      type="number"
                      value={editDefense}
                      onChange={(e) => setEditDefense(Number(e.target.value))}
                      className="w-16 mx-auto text-center font-heading text-lg font-bold text-amber-200 bg-stone-950 border border-stone-700 rounded-md py-1"
                    />
                  </div>
                </div>
              </div>

              {/* Condições & Efeitos */}
              <div>
                <h4 className="text-xs font-heading uppercase tracking-wider text-amber-500/90 mb-3">
                  Condições Ativas
                </h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {hero.conditions.length === 0 && (
                    <span className="text-xs text-stone-500 italic">Nenhuma condição ativa.</span>
                  )}
                  {hero.conditions.map((cond) => (
                    <span
                      key={cond}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/50 border border-red-500/50 text-xs font-heading text-red-200"
                    >
                      <span>{cond}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveCondition(hero.id, cond)}
                        className="hover:text-white transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Adicionar Condição Rápida */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-800">
                  {COMMON_CONDITIONS.map((cond) => {
                    const alreadyHas = hero.conditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        disabled={alreadyHas}
                        onClick={() => handleAddCondition(cond)}
                        className={`px-2 py-1 rounded text-[11px] font-heading transition ${
                          alreadyHas
                            ? 'opacity-40 bg-stone-900 text-stone-600'
                            : 'bg-stone-900 border border-stone-700 hover:border-amber-500/60 text-stone-300'
                        }`}
                      >
                        + {cond}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-heading uppercase tracking-wider text-amber-500/90">
                  Itens no Inventário ({items.length})
                </h4>
              </div>

              {isLoadingItems ? (
                <div className="p-8 text-center text-xs text-stone-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                  Carregando mochila...
                </div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 border border-dashed border-stone-800 rounded-xl">
                  A mochila deste herói está vazia no momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-heading text-xs sm:text-sm font-semibold text-amber-100 truncate">
                          {item.name}{' '}
                          {item.quantity && item.quantity > 1 && (
                            <span className="text-amber-400">×{item.quantity}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-400 truncate">
                          {item.category} • {item.rarity || 'comum'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Remover "${item.name}" da mochila?`)) {
                            await onRemoveItem(item.id, hero.id);
                            setItems((prev) => prev.filter((i) => i.id !== item.id));
                          }
                        }}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-stone-800 transition"
                        title="Descartar/Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'oath' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-heading uppercase text-amber-500/90 mb-1">
                  Texto do Juramento Sagrado
                </label>
                <textarea
                  rows={3}
                  value={editOath}
                  onChange={(e) => setEditOath(e.target.value)}
                  className="w-full p-3 rounded-lg bg-stone-900 border border-stone-700 text-stone-200 text-xs font-serif italic focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-heading uppercase text-amber-500/90 mb-1">
                  Poder / Benefício do Juramento
                </label>
                <input
                  type="text"
                  value={editOathPower}
                  onChange={(e) => setEditOathPower(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-200 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-heading uppercase text-amber-500/90 mb-1">
                  História / Passado (Backstory)
                </label>
                <textarea
                  rows={4}
                  value={editBackstory}
                  onChange={(e) => setEditBackstory(e.target.value)}
                  className="w-full p-3 rounded-lg bg-stone-900 border border-stone-700 text-stone-300 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-stone-800 bg-[#1a120d]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-heading text-stone-400 hover:text-white transition"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-lg font-heading font-bold text-xs uppercase tracking-wider text-stone-950 bg-gradient-to-b from-amber-400 to-amber-600 hover:brightness-110 active:scale-95 transition flex items-center gap-2 shadow-lg disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>
    </div>
  );
}
