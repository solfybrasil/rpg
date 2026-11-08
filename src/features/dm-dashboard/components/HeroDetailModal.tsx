import { Loader2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fromBronze, toBronze } from '../../../entities/item';
import { supabase } from '../../../shared/supabase';
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

type TabKey = 'sheet' | 'skills' | 'inventory' | 'oath' | 'conditions';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'sheet', label: 'Identidade & Atributos', icon: '♙' },
  { key: 'skills', label: 'Perícias & Testes D20', icon: '⚔' },
  { key: 'inventory', label: 'Mochila & Carga', icon: '♧' },
  { key: 'oath', label: 'Juramento & Lore', icon: '▤' },
  { key: 'conditions', label: 'Condições & Aflitos', icon: '⚠' },
];

export function HeroDetailModal({
  hero,
  onClose,
  onRemoveItem,
  onApplyCondition,
  onRemoveCondition,
  onSaveHeroDetails,
}: HeroDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('sheet');
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Identidade
  const [editName, setEditName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editRace, setEditRace] = useState('');
  const [editCaminho, setEditCaminho] = useState('');
  const [editLevel, setEditLevel] = useState(1);
  const [editXp, setEditXp] = useState(0);

  // 2. Atributos Principais
  const [editAttributes, setEditAttributes] = useState({
    corpo: 0,
    astucia: 0,
    vontade: 0,
    presenca: 0,
  });

  // 3. Vitais e Limites
  const [editHealth, setEditHealth] = useState(10);
  const [editMaxHealth, setEditMaxHealth] = useState(10);
  const [editFocus, setEditFocus] = useState(3);
  const [editMaxFocus, setEditMaxFocus] = useState(3);
  const [editPlague, setEditPlague] = useState(0);
  const [editSaciedade, setEditSaciedade] = useState(8);
  const [editInspiration, setEditInspiration] = useState(0);
  const [editDefense, setEditDefense] = useState(8);
  const [editExausto, setEditExausto] = useState(false);

  // 4. Moedas (Ouro, Prata, Bronze)
  const [editGold, setEditGold] = useState(0);
  const [editSilver, setEditSilver] = useState(0);
  const [editBronze, setEditBronze] = useState(0);

  // 5. Perícias & Rolagens
  const [editSkills, setEditSkills] = useState<Array<{ name: string; bonus: number; nivel?: number }>>([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillBonus, setNewSkillBonus] = useState(1);
  const [skillRolls, setSkillRolls] = useState<Record<string, { roll: number; raw: number; isCrit: boolean; isFumble: boolean }>>({});

  // 6. Juramento e Lore
  const [editOathType, setEditOathType] = useState('');
  const [editOath, setEditOath] = useState('');
  const [editOathPower, setEditOathPower] = useState('');
  const [editOathItem, setEditOathItem] = useState('');
  const [editGift, setEditGift] = useState('');
  const [editBackstory, setEditBackstory] = useState('');

  // 7. Condição Customizada
  const [customCondName, setCustomCondName] = useState('');

  useEffect(() => {
    if (!hero) return;

    setEditName(hero.name || '');
    setEditTitle(hero.epithet || '');
    setEditRace(hero.race || '');
    setEditCaminho(hero.caminho || '');
    setEditLevel(Number(hero.raw.level ?? 1));
    setEditXp(Number(hero.raw.xp ?? 0));

    setEditAttributes({ ...hero.attributes });

    setEditHealth(hero.health);
    setEditMaxHealth(hero.maxHealth);
    setEditFocus(hero.focus);
    setEditMaxFocus(hero.maxFocus);
    setEditPlague(hero.plague);
    setEditSaciedade(hero.saciedade);
    setEditInspiration(hero.inspiration);
    setEditDefense(hero.defense);
    setEditExausto(hero.exausto);

    const coins = fromBronze(hero.coinsBronze);
    setEditGold(coins.gold);
    setEditSilver(coins.silver);
    setEditBronze(coins.bronze);

    setEditSkills(hero.skills || []);

    setEditOathType(hero.oathType || '');
    setEditOath(hero.oath || '');
    setEditOathPower(hero.oathPower || '');
    setEditOathItem(hero.oathItem || '');
    setEditGift(hero.gift || '');
    setEditBackstory(hero.backstory || '');

    setSkillRolls({});

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

  const rollSkill = (skillName: string, bonus: number) => {
    const raw = Math.floor(Math.random() * 20) + 1;
    const total = raw + bonus;
    setSkillRolls((prev) => ({
      ...prev,
      [skillName]: {
        roll: total,
        raw,
        isCrit: raw === 20,
        isFumble: raw === 1,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const totalCoinsBronze = toBronze({
        gold: editGold,
        silver: editSilver,
        bronze: editBronze,
      });

      await onSaveHeroDetails(hero.id, {
        name: editName.trim() || hero.name,
        title: editTitle.trim() || null,
        race: editRace.trim() || hero.race,
        caminho: editCaminho.trim() || hero.caminho,
        level: editLevel,
        xp: editXp,
        attributes: editAttributes,
        health: editHealth,
        max_health: editMaxHealth,
        focus: editFocus,
        max_focus: editMaxFocus,
        plague: editPlague,
        saciedade: editSaciedade,
        inspiration: editInspiration,
        defense: editDefense,
        exausto: editExausto,
        coins_bronze: totalCoinsBronze,
        skills: editSkills,
        oath_type: editOathType.trim() || hero.oathType,
        oath: editOath.trim() || hero.oath,
        oath_power: editOathPower.trim() || null,
        oath_item: editOathItem.trim() || null,
        gift: editGift.trim() || null,
        backstory: editBackstory.trim() || null,
      });

      toast.success(`Ficha de ${editName} atualizada!`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar ficha do herói.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCondition = async (cond: string) => {
    if (!cond.trim()) return;
    await onApplyCondition(hero.id, cond.trim());
    setCustomCondName('');
    toast.success(`Condição "${cond.trim()}" aplicada.`);
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    setEditSkills((prev) => [...prev, { name: newSkillName.trim(), bonus: newSkillBonus }]);
    setNewSkillName('');
    setNewSkillBonus(1);
    toast.success(`Perícia "${newSkillName.trim()}" vinculada.`);
  };

  const handleRemoveSkill = (name: string) => {
    setEditSkills((prev) => prev.filter((s) => s.name !== name));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(8, 6, 4, 0.92)',
        backdropFilter: 'blur(10px)',
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '1200px',
          height: '88vh',
          display: 'grid',
          gridTemplateColumns: '360px 1fr',
          overflow: 'hidden',
          borderRadius: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── COLUNA ESQUERDA: DOSSIÊ & VITAIS FIXOS DO JURADO ── */}
        <div
          style={{
            background: 'linear-gradient(180deg, #18130f 0%, #100d0a 100%)',
            borderRight: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '24px 20px',
            gap: 16,
          }}
        >
          {/* Topo do Dossiê */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div className="portrait" style={{ width: 68, height: 76, fontSize: 32 }}>
              {hero.portraitUrl ? <img src={hero.portraitUrl} alt={hero.name} /> : '♙'}
            </div>
            <div>
              <div className="eyebrow">Dossiê do Confessor</div>
              <h2 style={{ fontSize: 18, color: 'var(--gold-light)', margin: '3px 0 2px' }}>{editName}</h2>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                {editCaminho} · {editRace}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>
                Nível <strong>{editLevel}</strong> ({editXp} XP)
              </div>
            </div>
          </div>

          {/* Voto do Juramento */}
          <div style={{ padding: '10px 12px', background: '#120e0b', border: '1px solid var(--line-soft)', borderRadius: 2 }}>
            <span style={{ font: '500 10px Cinzel, serif', color: 'var(--gold)', letterSpacing: '0.14em', display: 'block', marginBottom: 4 }}>
              ◈ VOTO DO JURAMENTO
            </span>
            <p style={{ margin: 0, fontStyle: 'italic', fontSize: 13, color: '#c4b59f', lineHeight: 1.4 }}>
              "{editOath || 'Nenhum voto selado ainda.'}"
            </p>
          </div>

          {/* Medidores Vitais com Steppers Táteis Imediatos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="eyebrow">Status Vitais & Condição</div>

            {/* Vida */}
            <div style={{ padding: '8px 10px', background: '#130f0c', border: '1px solid var(--line-soft)', borderRadius: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--text)', font: '500 11px Cinzel, serif' }}>VIDA (HP)</span>
                <span style={{ color: editHealth <= 3 ? '#ff453a' : '#30d158', fontWeight: 700 }}>
                  {editHealth} / {editMaxHealth}
                </span>
              </div>
              <div className="bar" style={{ height: 6, marginBottom: 6 }}>
                <i style={{
                  width: `${Math.min(100, Math.round((editHealth / editMaxHealth) * 100))}%`,
                  background: editHealth <= 3 ? 'linear-gradient(90deg, #5a1414, #a82222)' : 'linear-gradient(90deg, #642a24, #a84c3c)',
                }} />
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" className="stepper-btn" onClick={() => setEditHealth((h) => Math.max(0, h - 1))}>-1</button>
                <button type="button" className="stepper-btn" onClick={() => setEditHealth((h) => Math.min(editMaxHealth, h + 1))}>+1</button>
                <button type="button" className="stepper-btn" onClick={() => setEditHealth((h) => Math.min(editMaxHealth, h + 5))}>+5</button>
                <span style={{ flex: 1 }} />
                <button type="button" className="stepper-btn" title="Ajustar Máximo" onClick={() => setEditMaxHealth((m) => Math.max(1, m + 1))}>+Max</button>
              </div>
            </div>

            {/* Foco */}
            <div style={{ padding: '8px 10px', background: '#130f0c', border: '1px solid var(--line-soft)', borderRadius: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--text)', font: '500 11px Cinzel, serif' }}>FOCO</span>
                <span style={{ color: '#64d2ff', fontWeight: 700 }}>
                  {editFocus} / {editMaxFocus}
                </span>
              </div>
              <div className="bar blue" style={{ height: 6, marginBottom: 6 }}>
                <i style={{ width: `${Math.min(100, Math.round((editFocus / editMaxFocus) * 100))}%` }} />
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" className="stepper-btn" onClick={() => setEditFocus((f) => Math.max(0, f - 1))}>-1</button>
                <button type="button" className="stepper-btn" onClick={() => setEditFocus((f) => Math.min(editMaxFocus, f + 1))}>+1</button>
              </div>
            </div>

            {/* Peste */}
            <div style={{ padding: '8px 10px', background: '#130f0c', border: '1px solid var(--line-soft)', borderRadius: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--text)', font: '500 11px Cinzel, serif' }}>PESTE (CORRUPÇÃO)</span>
                <span style={{ color: '#bf5af2', fontWeight: 700 }}>{editPlague} / 10</span>
              </div>
              <div className="bar" style={{ height: 6, marginBottom: 6 }}>
                <i style={{ width: `${Math.min(100, editPlague * 10)}%`, background: 'linear-gradient(90deg, #4a1d6e, #8b3dbc)' }} />
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" className="stepper-btn" onClick={() => setEditPlague((p) => Math.max(0, p - 1))}>-1</button>
                <button type="button" className="stepper-btn" onClick={() => setEditPlague((p) => Math.min(10, p + 1))}>+1</button>
              </div>
            </div>

            {/* Saciedade */}
            <div style={{ padding: '8px 10px', background: '#130f0c', border: '1px solid var(--line-soft)', borderRadius: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--text)', font: '500 11px Cinzel, serif' }}>SACIEDADE</span>
                <span style={{ color: '#c5a36a', fontWeight: 700 }}>{editSaciedade} / 10</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" className="stepper-btn" onClick={() => setEditSaciedade((s) => Math.max(0, s - 1))}>-1</button>
                <button type="button" className="stepper-btn" onClick={() => setEditSaciedade((s) => Math.min(10, s + 1))}>+1</button>
              </div>
            </div>
          </div>

          {/* Moedas */}
          <div style={{ padding: '10px 12px', background: '#120e0b', border: '1px solid var(--line-soft)', borderRadius: 2 }}>
            <span style={{ font: '500 10px Cinzel, serif', color: 'var(--gold)', letterSpacing: '0.14em', display: 'block', marginBottom: 6 }}>
              BOLSA DE MOEDAS
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
              <div>
                <span style={{ fontSize: 11, color: '#ffd700', display: 'block' }}>OURO</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 2 }}>
                  <button type="button" className="stepper-btn" onClick={() => setEditGold((g) => Math.max(0, g - 1))}>-</button>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{editGold}</span>
                  <button type="button" className="stepper-btn" onClick={() => setEditGold((g) => g + 1)}>+</button>
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: '#e0d8d0', display: 'block' }}>PRATA</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 2 }}>
                  <button type="button" className="stepper-btn" onClick={() => setEditSilver((s) => Math.max(0, s - 1))}>-</button>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{editSilver}</span>
                  <button type="button" className="stepper-btn" onClick={() => setEditSilver((s) => s + 1)}>+</button>
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: '#cd7f32', display: 'block' }}>BRONZE</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 2 }}>
                  <button type="button" className="stepper-btn" onClick={() => setEditBronze((b) => Math.max(0, b - 5))}>-</button>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{editBronze}</span>
                  <button type="button" className="stepper-btn" onClick={() => setEditBronze((b) => b + 5)}>+</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── COLUNA DIREITA: ABAS DE EDIÇÃO & ROLAGENS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Barra de Sub-abas */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid var(--line)',
            background: '#15110d',
          }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    background: activeTab === t.key ? 'linear-gradient(#372a1b99, #17120f99)' : 'transparent',
                    border: `1px solid ${activeTab === t.key ? '#725936' : 'transparent'}`,
                    color: activeTab === t.key ? '#f0d6a3' : '#b7a78d',
                    padding: '8px 12px',
                    font: '500 11px Cinzel, serif',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {/* Conteúdo da Aba */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {/* ── ABA 1: IDENTIDADE & ATRIBUTOS ── */}
            {activeTab === 'sheet' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Identidade do Jurado</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Nome</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', background: '#120e0b', border: '1px solid var(--line-soft)', color: 'var(--text)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Título / Epíteto</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', background: '#120e0b', border: '1px solid var(--line-soft)', color: 'var(--text)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Raça</label>
                      <input
                        type="text"
                        value={editRace}
                        onChange={(e) => setEditRace(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', background: '#120e0b', border: '1px solid var(--line-soft)', color: 'var(--text)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Caminho</label>
                      <input
                        type="text"
                        value={editCaminho}
                        onChange={(e) => setEditCaminho(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', background: '#120e0b', border: '1px solid var(--line-soft)', color: 'var(--text)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Atributos Primordiais com Modificadores */}
                <div>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Atributos Primordiais</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {Object.entries(editAttributes).map(([attr, val]) => (
                      <div
                        key={attr}
                        style={{
                          background: '#120e0b',
                          border: '1px solid var(--line-soft)',
                          borderRadius: 2,
                          padding: 12,
                          textAlign: 'center',
                        }}
                      >
                        <span style={{ font: '500 11px Cinzel, serif', color: 'var(--gold)', textTransform: 'uppercase', display: 'block' }}>
                          {attr}
                        </span>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold-light)', margin: '6px 0' }}>
                          {val >= 0 ? `+${val}` : val}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => setEditAttributes((prev) => ({ ...prev, [attr]: val - 1 }))}
                          >−</button>
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => setEditAttributes((prev) => ({ ...prev, [attr]: val + 1 }))}
                          >＋</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA 2: PERÍCIAS & TESTES D20 ── */}
            {activeTab === 'skills' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="eyebrow">Perícias Sob Juramento & Rolador D20</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                    Clique no botão de rolar para executar o teste na hora
                  </div>
                </div>

                {/* Grid de Perícias com D20 Instantâneo */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {editSkills.map((skill) => {
                    const last = skillRolls[skill.name];
                    return (
                      <div
                        key={skill.name}
                        className="quick-action"
                        style={{ justifyContent: 'space-between', padding: '10px 14px' }}
                      >
                        <div>
                          <strong style={{ fontSize: 15, color: 'var(--text)' }}>{skill.name}</strong>
                          <span style={{ fontSize: 12, color: 'var(--gold)', display: 'block' }}>
                            Modificador: +{skill.bonus}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {last && (
                            <span style={{
                              font: '700 14px Cinzel, serif',
                              color: last.isCrit ? '#30d158' : last.isFumble ? '#ff453a' : 'var(--gold-light)',
                            }}>
                              🎲 {last.roll} {last.isCrit ? '(CRÍTICO!)' : last.isFumble ? '(FALHA!)' : ''}
                            </span>
                          )}
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '6px 10px', fontSize: 10 }}
                            onClick={() => rollSkill(skill.name, skill.bonus)}
                          >
                            Rolar D20
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill.name)}
                            style={{ background: 'transparent', border: 'none', color: '#ff453a', cursor: 'pointer', fontSize: 13 }}
                            title="Remover Perícia"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Adicionar Perícia */}
                <div style={{ display: 'flex', gap: 10, marginTop: 8, padding: 12, background: '#120e0b', border: '1px solid var(--line-soft)', borderRadius: 2 }}>
                  <input
                    type="text"
                    placeholder="Nome da perícia (ex: Atletismo, Medicina, Ocultismo)..."
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    style={{ flex: 1, padding: '7px 10px', background: '#16120e', border: '1px solid var(--line-soft)', color: 'var(--text)' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Bônus:</span>
                    <button type="button" className="stepper-btn" onClick={() => setNewSkillBonus((b) => Math.max(0, b - 1))}>-</button>
                    <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>+{newSkillBonus}</span>
                    <button type="button" className="stepper-btn" onClick={() => setNewSkillBonus((b) => b + 1)}>+</button>
                  </div>
                  <button type="button" className="btn secondary" onClick={handleAddSkill}>
                    ＋ Adicionar
                  </button>
                </div>
              </div>
            )}

            {/* ── ABA 3: MOCHILA & CARGA ── */}
            {activeTab === 'inventory' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="eyebrow">Mochila do Jurado ({items.length} itens guardados)</div>

                {isLoadingItems ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--gold)' }}>
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                ) : items.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic' }}>
                    A mochila está vazia. Use a ação "Conceder Dádiva" para colocar armas ou relíquias aqui.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="quick-action"
                        style={{ justifyContent: 'space-between', padding: '10px 14px' }}
                      >
                        <div>
                          <strong style={{ fontSize: 15, color: 'var(--text)' }}>
                            {item.custom_name || item.item_name || 'Item Desconhecido'}
                          </strong>
                          <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', display: 'block' }}>
                            {item.category || 'Geral'} · Quantidade: {item.quantity || 1}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn secondary"
                          style={{ color: '#ff453a', borderColor: '#5a2222' }}
                          onClick={async () => {
                            await onRemoveItem(item.id, hero.id);
                            setItems((prev) => prev.filter((i) => i.id !== item.id));
                            toast.success('Item removido.');
                          }}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── ABA 4: JURAMENTO & LORE ── */}
            {activeTab === 'oath' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>Texto do Juramento Sagrado</div>
                  <textarea
                    rows={3}
                    value={editOath}
                    onChange={(e) => setEditOath(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#120e0b', border: '1px solid var(--line-soft)', color: 'var(--text)', fontStyle: 'italic' }}
                  />
                </div>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>Poder Desperto do Voto</div>
                  <input
                    type="text"
                    value={editOathPower}
                    onChange={(e) => setEditOathPower(e.target.value)}
                    placeholder="Descrição do poder único..."
                    style={{ width: '100%', padding: '8px 10px', background: '#120e0b', border: '1px solid var(--line-soft)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>História / Notas Secretas do Mestre</div>
                  <textarea
                    rows={4}
                    value={editBackstory}
                    onChange={(e) => setEditBackstory(e.target.value)}
                    placeholder="Anotações de campanha, passados sombrios ou revelações..."
                    style={{ width: '100%', padding: '10px', background: '#120e0b', border: '1px solid var(--line-soft)', color: 'var(--text)' }}
                  />
                </div>
              </div>
            )}

            {/* ── ABA 5: CONDIÇÕES & AFLITOS ── */}
            {activeTab === 'conditions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="eyebrow">Condições Comuns (Clique para Aplicar)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {COMMON_CONDITIONS.map((cond) => {
                    const has = hero.conditions?.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={async () => {
                          if (has) {
                            await onRemoveCondition(hero.id, cond);
                            toast.success(`Condição "${cond}" removida.`);
                          } else {
                            await handleAddCondition(cond);
                          }
                        }}
                        className={`btn ${has ? '' : 'secondary'}`}
                        style={{
                          borderColor: has ? '#8d302b' : undefined,
                          background: has ? '#3d1614' : undefined,
                          color: has ? '#ff8a82' : undefined,
                        }}
                      >
                        {has ? '✓ ' : '＋ '} {cond}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input
                    type="text"
                    placeholder="Condição customizada (ex: Maldição da Cinza)..."
                    value={customCondName}
                    onChange={(e) => setCustomCondName(e.target.value)}
                    style={{ flex: 1, padding: '8px 10px', background: '#120e0b', border: '1px solid var(--line-soft)', color: 'var(--text)' }}
                  />
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => handleAddCondition(customCondName)}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Rodapé de Ações */}
          <div style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--line)',
            background: '#120e0b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <button type="button" className="btn secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn" disabled={isSaving} onClick={handleSave}>
              {isSaving ? 'Gravando nos Tomos...' : 'Salvar Alterações na Ficha →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
