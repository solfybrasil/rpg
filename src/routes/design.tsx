import { createFileRoute } from '@tanstack/react-router';
import {
  AlertTriangle,
  Backpack,
  Check,
  Droplets,
  Flame,
  FlaskConical,
  Heart,
  Scroll,
  Shield,
  Skull,
  Sparkles,
  Sword,
  User,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  AttrSlab,
  Belt,
  BottomNav,
  ConditionPill,
  CountUp,
  DiceResult,
  Divider,
  EmberField,
  EpicMoment,
  EquipDoll,
  type FloatingItem,
  GoldButton,
  InitiativeStrip,
  InventoryGrid,
  ItemCell,
  ItemTooltip,
  Modal,
  MoreSheet,
  Orb,
  Parchment,
  Sheet,
  Skeleton,
  StatSlab,
  StatusBar,
  StoneButton,
  StonePanel,
  TabBar,
  Toast,
  WaxSeal,
} from '../shared/ui';

export const Route = createFileRoute('/design')({
  component: DesignSystemShowcase,
});

function DesignSystemShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('feitiços');

  // Estados dos Orbes e Danos
  const [hp, setHp] = useState(38);
  const [focus, setFocus] = useState(16);
  const [isDamaged, setIsDamaged] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const [showVignette, setShowVignette] = useState(false);
  const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([]);

  // Momentos Épicos
  const [epicMoment, setEpicMoment] = useState<'level_up' | 'plague_surge' | 'fallen_hero' | null>(
    null,
  );
  const [missionCompleted, setMissionCompleted] = useState(false);
  const [showLegendaryHighlight, setShowLegendaryHighlight] = useState(false);
  const [currentDiceRoll, setCurrentDiceRoll] = useState<{
    tone: 'critico' | 'brilhante' | 'sucesso' | 'desastre';
    total: number;
    kept: number[];
  } | null>({
    tone: 'brilhante',
    total: 10,
    kept: [5, 4],
  });

  // Simulações (SKILL.md Seção 9 passo 3)
  const handleSimulateDamage = () => {
    setHp((prev) => Math.max(0, prev - 5));
    setIsDamaged(true);
    setShowVignette(true);
    const id = Date.now().toString();
    setFloatingItems((prev) => [...prev, { id, value: 5, type: 'damage' }]);
    setTimeout(() => setIsDamaged(false), 400);
    setTimeout(() => setShowVignette(false), 320);
  };

  const handleSimulateHeal = () => {
    setHp((prev) => Math.min(45, prev + 4));
    setIsHealing(true);
    const id = Date.now().toString();
    setFloatingItems((prev) => [...prev, { id, value: 4, type: 'heal' }]);
    setTimeout(() => setIsHealing(false), 600);
  };

  const handleSimulateCritical = () => {
    setCurrentDiceRoll({
      tone: 'critico',
      total: 12,
      kept: [6, 6],
    });
    toast.success('Acerto Crítico! +1 Ponto de Inspiração concedido.');
  };

  const handleSimulateDisaster = () => {
    setCurrentDiceRoll({
      tone: 'desastre',
      total: 2,
      kept: [1, 1],
    });
    toast.error('Desastre Rúnico! O fardo do Juramento se intensifica.');
  };

  const handleCompleteMission = () => {
    setMissionCompleted(true);
    toast.success('Missão Concluída! Selo carimbado nos anais.');
  };

  const handleSimulateLegendary = () => {
    setShowLegendaryHighlight(true);
    setTimeout(() => setShowLegendaryHighlight(false), 4000);
    toast.info('Item Lendário descoberto nas sombras!');
  };

  const mockGridItems = [
    { id: '1', name: 'Osso Ancestral', col: 1, row: 1, w: 1, h: 2, rarity: 'comum' as const },
    {
      id: '2',
      name: 'Poção de Sangue',
      col: 2,
      row: 1,
      w: 1,
      h: 1,
      rarity: 'incomum' as const,
      count: 3,
    },
    { id: '3', name: 'Gema do Vazio', col: 3, row: 1, w: 1, h: 1, rarity: 'raro' as const },
    {
      id: '4',
      name: 'Cinzel das Brumas',
      col: 4,
      row: 1,
      w: 2,
      h: 2,
      rarity: 'epico' as const,
    },
    {
      id: '5',
      name: 'Cinzas de Malenia',
      col: 6,
      row: 1,
      w: 2,
      h: 2,
      rarity: 'lendario' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--abyss)] text-[var(--text)] pb-40 font-['EB_Garamond',serif] relative selection:bg-[var(--gold-lo)] selection:text-[var(--gold-hi)]">
      {/* Vinheta de Dano na Tela */}
      {showVignette && <div className="damage-vignette" />}

      {/* Momento Épico Overlay */}
      <EpicMoment
        type={epicMoment}
        level={6}
        heroName="Malenia"
        onClose={() => setEpicMoment(null)}
      />

      {/* Campo de Brasas Ambiente no Topo */}
      <div className="h-32 w-full relative overflow-hidden bg-gradient-to-b from-stone-950 to-transparent">
        <EmberField particleCount={32} />
        <div className="absolute inset-0 flex items-center justify-center flex-col px-4 text-center z-10">
          <p className="font-['Cinzel',serif] text-xs uppercase tracking-[0.22em] text-[var(--gold)]">
            Design System Oficial • SKILL.md
          </p>
          <h1 className="font-['Cinzel',serif] text-2xl md:text-3xl font-bold tracking-[0.12em] text-[var(--gold-hi)] mt-1">
            PEDRA E PERGAMINHO
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 space-y-10">
        {/* =========================================================
            BARRA DE TESTES INTERATIVOS DE ANIMAÇÃO (SKILL.md Seção 9.3)
            ========================================================= */}
        <section className="slab p-4 border border-[var(--gold-lo)]">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[var(--gold)]" />
            <h2 className="font-['Cinzel',serif] text-xs uppercase tracking-[0.16em] text-[var(--gold-hi)] font-bold">
              Simulações Interativas em Tempo Real (SKILL.md Seção 9.3)
            </h2>
          </div>
          <p className="text-xs text-[var(--muted)] mb-4">
            Pressione os botões abaixo para disparar as animações calibradas (--t-instant a
            --t-epic, tremores de dano, partículas de cura, carimbo com ease-heavy e momentos
            épicos):
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSimulateDamage}
              className="px-3 py-1.5 slab hover:border-red-600 text-xs text-red-300 font-['Cinzel',serif] tracking-wider active:scale-95"
            >
              Simular Dano (-5)
            </button>
            <button
              type="button"
              onClick={handleSimulateHeal}
              className="px-3 py-1.5 slab hover:border-green-600 text-xs text-green-300 font-['Cinzel',serif] tracking-wider active:scale-95"
            >
              Simular Cura (+4)
            </button>
            <button
              type="button"
              onClick={() => setEpicMoment('level_up')}
              className="px-3 py-1.5 slab border-[var(--gold)] text-xs text-[var(--gold-hi)] font-['Cinzel',serif] font-bold tracking-wider active:scale-95"
            >
              Subir Nível (Épico)
            </button>
            <button
              type="button"
              onClick={handleCompleteMission}
              className="px-3 py-1.5 slab hover:border-[var(--gold-lo)] text-xs text-stone-200 font-['Cinzel',serif] tracking-wider active:scale-95"
            >
              Concluir Missão (Carimbo)
            </button>
            <button
              type="button"
              onClick={handleSimulateCritical}
              className="px-3 py-1.5 slab hover:border-[var(--ember)] text-xs text-[var(--ember)] font-['Cinzel',serif] font-bold tracking-wider active:scale-95"
            >
              Rolagem Crítica
            </button>
            <button
              type="button"
              onClick={handleSimulateDisaster}
              className="px-3 py-1.5 slab hover:border-red-800 text-xs text-red-400 font-['Cinzel',serif] tracking-wider active:scale-95"
            >
              Rolagem Desastre
            </button>
            <button
              type="button"
              onClick={handleSimulateLegendary}
              className="px-3 py-1.5 slab hover:border-[var(--gold)] text-xs text-[var(--gold-hi)] font-['Cinzel',serif] tracking-wider active:scale-95"
            >
              Novo Item Lendário
            </button>
            <button
              type="button"
              onClick={() => setEpicMoment('plague_surge')}
              className="px-3 py-1.5 slab text-xs text-[var(--plague)] font-['Cinzel',serif] tracking-wider active:scale-95"
            >
              Avanço da Peste
            </button>
            <button
              type="button"
              onClick={() => setEpicMoment('fallen_hero')}
              className="px-3 py-1.5 slab text-xs text-stone-400 font-['Cinzel',serif] tracking-wider active:scale-95"
            >
              Herói Caído
            </button>
          </div>
        </section>

        {/* =========================================================
            1. PALETA DE MATERIAIS & TOKENS CANÔNICOS
            ========================================================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[var(--gold)] font-serif text-sm">◆</span>
            <h2 className="font-['Cinzel',serif] text-sm uppercase tracking-[0.16em] text-[var(--gold-hi)] font-bold">
              1. Materiais & Tokens Canônicos
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {[
              { label: 'Pedra', token: '--stone', hex: '#151311', border: '#2d2823' },
              { label: 'Ferro', token: '--iron', hex: '#3A342D', border: '#4a4239' },
              { label: 'Ouro Velho', token: '--gold', hex: '#C9A45C', border: '#6e5528' },
              { label: 'Pergaminho', token: '--parch', hex: '#D6C9AA', border: '#8c6428' },
              { label: 'Tinta', token: '--ink', hex: '#2A1F15', border: '#5a4632' },
              { label: 'Sangue', token: '--blood', hex: '#A3291F', border: '#7d1a12' },
              { label: 'Foco (Mana)', token: '--mana', hex: '#2C5FB8', border: '#1f4382' },
            ].map((mat) => (
              <div
                key={mat.label}
                className="slab p-3 flex flex-col items-center gap-2 text-center"
              >
                <div
                  className="w-10 h-10 border shadow-md"
                  style={{ backgroundColor: mat.hex, borderColor: mat.border }}
                />
                <span className="font-['Cinzel',serif] text-xs font-bold text-[var(--text)]">
                  {mat.label}
                </span>
                <span className="font-mono text-[10px] text-[var(--muted)]">{mat.hex}</span>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================
            2. HUD DO JOGADOR: STATUS, ORBES & CINTO
            ========================================================= */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[var(--gold)] font-serif text-sm">◆</span>
            <h2 className="font-['Cinzel',serif] text-sm uppercase tracking-[0.16em] text-[var(--gold-hi)] font-bold">
              2. HUD do Jogador: Orbes de Vidro & Cinto de Poções
            </h2>
          </div>

          <div className="max-w-[480px] mx-auto slab p-4 border border-[var(--gold-lo)]">
            <StatusBar heroName="Malenia" level={5} coins={247} />

            {/* Simulação do HUD de 150px */}
            <div className="relative h-[150px] mt-4 recess overflow-hidden">
              <Orb
                variant="hp"
                current={hp}
                max={45}
                isDamaged={isDamaged}
                isHealing={isHealing}
                floatingItems={floatingItems}
                onFloatingComplete={(id) =>
                  setFloatingItems((prev) => prev.filter((i) => i.id !== id))
                }
                onClick={handleSimulateDamage}
              />
              <Belt
                potions={[
                  { id: 'p1', name: 'Poção de Sangue', count: 3 },
                  { id: 'p2', name: 'Elixir de Foco', count: 1 },
                ]}
                onUsePotion={(id) => {
                  toast.success(`Consumível ${id} ativado do cinto!`);
                  handleSimulateHeal();
                }}
              />
              <Orb
                variant="focus"
                current={focus}
                max={25}
                onClick={() => setFocus((prev) => Math.max(0, prev - 2))}
              />
              <div className="absolute bottom-0 left-0 right-0 h-[60px] bg-black/60 border-t border-[var(--iron)] flex items-center justify-around text-[10px] font-['Cinzel',serif] text-[var(--muted)] uppercase">
                <span className="text-[var(--gold-hi)]">Ficha</span>
                <span>Mochila</span>
                <span>Grimório</span>
                <span>Diário</span>
                <button
                  type="button"
                  onClick={() => setMoreSheetOpen(true)}
                  className="hover:text-[var(--gold-hi)]"
                >
                  Mais
                </button>
              </div>
            </div>
            <p className="text-[11px] text-center text-[var(--muted)] italic mt-3">
              Clique no Orbe vermelho para simular dano (-5). Clique no Orbe azul para consumir
              foco.
            </p>
          </div>
        </section>

        {/* =========================================================
            3. TABBAR DE PEDRA COM LOSANGO DESLIZANTE
            ========================================================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[var(--gold)] font-serif text-sm">◆</span>
            <h2 className="font-['Cinzel',serif] text-sm uppercase tracking-[0.16em] text-[var(--gold-hi)] font-bold">
              3. TabBar de Pedra (Transição Fluida com layoutId)
            </h2>
          </div>
          <TabBar
            tabs={[
              { id: 'feitiços', label: 'Feitiços' },
              { id: 'rituais', label: 'Rituais' },
              { id: 'circulos', label: 'Círculos' },
              { id: 'sigilos', label: 'Sigilos' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </section>

        {/* =========================================================
            4. PERGAMINHO COM BORDA RASGADA PROCEDURAL (useTornEdge)
            ========================================================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[var(--gold)] font-serif text-sm">◆</span>
            <h2 className="font-['Cinzel',serif] text-sm uppercase tracking-[0.16em] text-[var(--gold-hi)] font-bold">
              4. Pergaminho com Borda Rasgada (useTornEdge) & Selo de Cera
            </h2>
          </div>
          <Parchment seed={101} className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-['Cinzel',serif] uppercase tracking-[0.2em] text-[var(--ink-soft)] font-bold">
                  Missão Principal • Capítulo III
                </span>
                <h3 className="font-['Cinzel',serif] text-xl font-bold text-[var(--ink)] mt-0.5">
                  A Peste na Cripta dos Jurados
                </h3>
              </div>
              <WaxSeal isStamping={missionCompleted}>
                {missionCompleted ? <Check size={20} /> : <Flame size={20} />}
              </WaxSeal>
            </div>

            <p className="text-sm leading-relaxed text-[var(--ink)]">
              "As cinzas de Corvo Negro ainda sussurram sob os alicerces da torre ocidental. Quando
              o solene sino da meia-noite soar, a porta lacrada de ferro se abrirá aos jurados que
              preservam a promessa imaculada."
            </p>

            <div className="border-t border-[var(--ink-soft)]/20 pt-3">
              <span className="text-xs font-bold text-[var(--ink)] block mb-1">Objetivos:</span>
              <ul className="text-xs space-y-1 text-[var(--ink-soft)]">
                <li
                  className={`flex items-center gap-2 transition-all ${
                    missionCompleted ? 'line-through text-stone-500' : ''
                  }`}
                >
                  <span className="w-1.5 h-1.5 bg-[var(--blood)] rotate-45" />
                  Descobrir o selo perdido da abadia de São Brandão
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[var(--ink-soft)] rotate-45" />
                  Derrotar o espectro portador da Peste Rúnica
                </li>
              </ul>
            </div>
          </Parchment>
        </section>

        {/* =========================================================
            5. INVENTÁRIO (GRADE 8 COLUNAS, SILHUETA & TOOLTIP)
            ========================================================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[var(--gold)] font-serif text-sm">◆</span>
            <h2 className="font-['Cinzel',serif] text-sm uppercase tracking-[0.16em] text-[var(--gold-hi)] font-bold">
              5. Inventário: Grade de 8 Colunas & Boneco de Equipamento
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 slab p-4 flex flex-col items-center">
              <span className="font-['Cinzel',serif] text-xs font-bold uppercase tracking-wider text-[var(--gold-hi)] mb-3">
                Silhueta de Equipamento
              </span>
              <EquipDoll
                equipped={{
                  head: { id: 'e1', name: 'Elmo de Ferro', rarity: 'incomum' },
                  mainHand: { id: 'e2', name: 'Lâmina Rúnica', rarity: 'raro' },
                  armor: { id: 'e3', name: 'Cota de Malha Negra', rarity: 'epico' },
                }}
              />
            </div>

            <div className="md:col-span-8 slab p-4 space-y-4">
              <span className="font-['Cinzel',serif] text-xs font-bold uppercase tracking-wider text-[var(--gold-hi)]">
                Mochila do Jurado (Grade 8 Colunas)
              </span>
              <InventoryGrid items={mockGridItems} />

              <div className="mt-4 pt-4 border-t border-[var(--iron)]">
                <span className="text-xs font-['Cinzel',serif] uppercase text-[var(--muted)] tracking-wider block mb-2">
                  Exemplo de Tooltip de Item (Parchment Unroll):
                </span>
                <ItemTooltip
                  name="Cinzas de Malenia"
                  rarity="lendario"
                  type="Relíquia Sagrada"
                  effect="Ao cair a 0 de Vida, recupera 15 pontos instantaneamente uma vez por vigília."
                  weight={0.5}
                  value={1800}
                />
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            6. ATRIBUTOS, ESTATÍSTICAS & ROLAGENS
            ========================================================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[var(--gold)] font-serif text-sm">◆</span>
            <h2 className="font-['Cinzel',serif] text-sm uppercase tracking-[0.16em] text-[var(--gold-hi)] font-bold">
              6. Estatísticas, Atributos & Rolagem 2d6
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatSlab label="Armadura" value="14" />
            <StatSlab label="Iniciativa" value="+3" />
            <StatSlab label="Movimento" value="6 qd" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <AttrSlab name="Corpo" value={14} modifier={+2} />
            <AttrSlab name="Vontade" value={16} modifier={+3} />
            <AttrSlab name="Astúcia" value={10} modifier={0} />
            <AttrSlab name="Presença" value={8} modifier={-1} />
          </div>

          <div className="mt-4">
            {currentDiceRoll && (
              <DiceResult
                tone={currentDiceRoll.tone}
                total={currentDiceRoll.total}
                peso={8}
                keptDice={currentDiceRoll.kept}
                modifier={1}
                label="Teste de Vontade contra a Podridão"
              />
            )}
          </div>
        </section>

        {/* =========================================================
            7. BOTÕES & CONTROLES (OURO MACIÇO & PEDRA)
            ========================================================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[var(--gold)] font-serif text-sm">◆</span>
            <h2 className="font-['Cinzel',serif] text-sm uppercase tracking-[0.16em] text-[var(--gold-hi)] font-bold">
              7. Botões & Ações Táticas
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <GoldButton onClick={() => toast.success('Turno Finalizado!')}>
              Finalizar Turno
            </GoldButton>
            <StoneButton
              title="Golpe Pesado"
              subtitle="Custo: 2 Foco • Dano 2d6+2"
              icon={<Sword />}
              onClick={() => toast.info('Ação Golpe Pesado executada')}
            />
            <StoneButton
              title="Escudo de Fé"
              subtitle="Reação • +4 Defesa"
              icon={<Shield />}
              onClick={() => toast.info('Ação Escudo de Fé executada')}
            />
          </div>
        </section>

        {/* =========================================================
            8. ESQUELETO DE CARREGAMENTO (SEM SPINNER GENÉRICO)
            ========================================================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[var(--gold)] font-serif text-sm">◆</span>
            <h2 className="font-['Cinzel',serif] text-sm uppercase tracking-[0.16em] text-[var(--gold-hi)] font-bold">
              8. Esqueletos de Carregamento (SKILL.md Seção 5 e 11)
            </h2>
          </div>
          <div className="space-y-2 max-w-md">
            <Skeleton variant="parchment" height={24} width="70%" />
            <Skeleton variant="parchment" height={16} width="100%" />
            <Skeleton variant="parchment" height={16} width="85%" />
          </div>
        </section>

        {/* =========================================================
            9. AVISOS & TOASTS
            ========================================================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[var(--gold)] font-serif text-sm">◆</span>
            <h2 className="font-['Cinzel',serif] text-sm uppercase tracking-[0.16em] text-[var(--gold-hi)] font-bold">
              9. Avisos Temáticos (Toast de Pedra com Filete)
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
            <Toast
              title="Malenia Subiu de Nível"
              description="A consagração no Nível 5 desbloqueou um novo Dom do Voto."
              type="gold"
            />
            <Toast
              title="Ataque Sofrido (-5 Vida)"
              description="Lâmina infectada causou dano perfurante e corrupção."
              type="damage"
            />
          </div>
        </section>
      </div>

      {/* Menu 'Mais' do Jogador */}
      <MoreSheet
        isOpen={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        items={[
          { label: 'Oficina', icon: <Flame size={20} />, to: '/jogador/oficina' },
          { label: 'Receitas', icon: <Scroll size={20} />, to: '/jogador/receitas' },
          { label: 'Árvore', icon: <Sparkles size={20} />, to: '/jogador/arvore' },
          { label: 'Missivas', icon: <Shield size={20} />, to: '/jogador/missivas' },
        ]}
      />
    </div>
  );
}
