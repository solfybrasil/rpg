import { createFileRoute } from '@tanstack/react-router';
import {
  Backpack,
  Droplets,
  Flame,
  FlaskConical,
  Heart,
  Scroll,
  Shield,
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
  DiceResult,
  Divider,
  EquipDoll,
  GoldButton,
  InitiativeStrip,
  InventoryGrid,
  ItemCell,
  ItemTooltip,
  Modal,
  Orb,
  Parchment,
  Sheet,
  StatSlab,
  StatusBar,
  StoneButton,
  StonePanel,
  TabBar,
  WaxSeal,
} from '../shared/ui';

export const Route = createFileRoute('/design')({
  component: DesignSystemShowcase,
});

function DesignSystemShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('feitiços');
  const [hp, setHp] = useState(34);
  const [focus, setFocus] = useState(18);

  const mockGridItems = [
    { id: '1', name: 'Osso Ancestral', col: 1, row: 1, w: 1, h: 2, rarity: 'comum' as const },
    {
      id: '2',
      name: 'Poção de Sangue',
      col: 2,
      row: 1,
      w: 1,
      h: 1,
      rarity: 'comum' as const,
      quantity: 3,
    },
    {
      id: '3',
      name: 'Poção Rara de Foco',
      col: 3,
      row: 1,
      w: 1,
      h: 1,
      rarity: 'raro' as const,
      quantity: 2,
    },
    { id: '4', name: 'Pergaminho de Miasma', col: 4, row: 1, w: 2, h: 2, rarity: 'epico' as const },
    { id: '5', name: 'Gema do Voto', col: 7, row: 1, w: 1, h: 1, rarity: 'lendario' as const },
  ];

  const mockCombatTokens = [
    { id: 't1', name: 'Malenia', hpPercent: 81, type: 'ally' as const, isCurrentTurn: true },
    { id: 't2', name: 'Lobo Cinzento', hpPercent: 40, type: 'foe' as const },
    { id: 't3', name: 'Tor Björn', hpPercent: 90, type: 'ally' as const },
    { id: 't4', name: 'Kaelis', hpPercent: 65, type: 'ally' as const },
  ];

  return (
    <div className="min-h-screen bg-[var(--abyss)] text-[var(--text)] p-4 sm:p-8 max-w-4xl mx-auto space-y-12">
      {/* Header Oficial */}
      <header className="border-b border-[var(--iron)] pb-6">
        <div className="font-['Cinzel',serif] text-xs uppercase tracking-[0.32em] text-[var(--gold)]">
          Peste do Juramento · Design System Oficial
        </div>
        <h1 className="font-['Cinzel',serif] text-3xl sm:text-4xl font-bold text-[var(--gold-hi)] tracking-wider mt-1">
          Pedra e Pergaminho
        </h1>
        <p className="font-['EB_Garamond',serif] italic text-base text-[var(--muted)] mt-2">
          Moldura de pedra negra, superfícies de leitura em pergaminho rasgado, acentos em ouro
          velho e orbes de vidro com líquidos animados.
        </p>
      </header>

      {/* 1. StatusBar & Identidade */}
      <section className="space-y-3">
        <h2 className="font-['Cinzel',serif] text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
          1. StatusBar (52px no topo)
        </h2>
        <StatusBar heroName="Malenia" level={5} coinsBronze={24700} />
      </section>

      {/* 2. Placas de Pedra e Pergaminho */}
      <section className="space-y-4">
        <h2 className="font-['Cinzel',serif] text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
          2. StonePanel & Parchment (Borda Rasgada)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StonePanel className="p-4 space-y-2">
            <span className="font-['Cinzel',serif] text-xs text-[var(--gold)] uppercase tracking-wider block">
              StonePanel (.slab)
            </span>
            <p className="font-['EB_Garamond',serif] text-sm text-[var(--text)]">
              Placa de pedra escura com textura de ruído SVG, bordas chanfradas e sombras profundas.
              Usada para abas, botões e molduras estruturais.
            </p>
          </StonePanel>

          <StonePanel variant="active" className="p-4 space-y-2">
            <span className="font-['Cinzel',serif] text-xs text-[var(--gold-hi)] uppercase tracking-wider block">
              StonePanel Ativo (.slab.on)
            </span>
            <p className="font-['EB_Garamond',serif] text-sm text-[var(--text)]">
              Variante selecionada com borda dourada e losango ornamentado a 45 graus no topo.
            </p>
          </StonePanel>
        </div>

        {/* Parchment com borda rasgada */}
        <Parchment seed={12} className="space-y-2">
          <div className="flex items-center justify-between border-b border-[var(--ink)]/20 pb-1">
            <span className="font-['Cinzel',serif] font-bold text-sm text-[var(--ink)] tracking-wider uppercase">
              Pergaminho Rasgado (.parch.torn)
            </span>
            <WaxSeal>
              <Flame size={20} />
            </WaxSeal>
          </div>
          <p className="font-['EB_Garamond',serif] text-base text-[var(--ink)] leading-snug">
            “A névoa guarda o que o juramento esqueceu. Toda palavra jurada é uma dívida com o
            próprio corpo.”
          </p>
          <div className="font-['EB_Garamond',serif] italic text-xs text-[var(--ink-soft)]">
            Hook useTornEdge calcula o polígono de corte uma única vez com ResizeObserver.
          </div>
        </Parchment>
      </section>

      {/* 3. Atributos, Vitais e Estatísticas */}
      <section className="space-y-4">
        <h2 className="font-['Cinzel',serif] text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
          3. StatSlab, AttrSlab & ConditionPill
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <StatSlab label="Armadura" value={14} />
          <StatSlab label="Iniciativa" value="+3" />
          <StatSlab label="Movimento" value={6} unit="qd" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AttrSlab name="Corpo" value={14} modifier={2} />
          <AttrSlab name="Vontade" value={16} modifier={3} highlight />
          <AttrSlab name="Astúcia" value={12} modifier={1} />
          <AttrSlab name="Presença" value={8} modifier={-1} />
        </div>

        <div className="flex flex-wrap gap-2">
          <ConditionPill type="bad" label="Envenenada · 2 turnos" />
          <ConditionPill type="good" label="Bênção da Brasa" />
          <ConditionPill type="bad" label="Peste Estágio 2" />
        </div>
      </section>

      {/* 4. Orbes de Vidro e Cinto */}
      <section className="space-y-4">
        <h2 className="font-['Cinzel',serif] text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
          4. Orbes de Vidro & Cinto de Poções
        </h2>
        <div className="h-[150px] relative w-full bg-[var(--stone)] border border-[var(--iron)] overflow-hidden">
          <Belt
            items={[
              { id: 'p1', name: 'Poção Carmim', quantity: 3, rarity: 'comum' },
              { id: 'p2', name: 'Elixir de Foco', quantity: 2, rarity: 'raro' },
              { id: 'p3', name: 'Erva de Cura', quantity: 4, rarity: 'comum' },
              { id: 'p4', name: 'Pergaminho Épico', quantity: 1, rarity: 'epico' },
            ]}
          />
          <Orb
            variant="hp"
            current={hp}
            max={40}
            onClick={() => setHp((prev) => (prev > 10 ? prev - 5 : 40))}
          />
          <Orb
            variant="focus"
            current={focus}
            max={30}
            onClick={() => setFocus((prev) => (prev > 5 ? prev - 4 : 30))}
          />
        </div>
        <p className="text-xs font-serif text-[var(--muted)] text-center">
          (Clique nos orbes para testar o nível de líquido animado em 400ms)
        </p>
      </section>

      {/* 5. Mochila, Grade e Boneco de Equipamento */}
      <section className="space-y-4">
        <h2 className="font-['Cinzel',serif] text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
          5. Mochila: EquipDoll, InventoryGrid & ItemTooltip
        </h2>
        <EquipDoll
          equipped={{
            weap: { name: 'Foice da Névoa', rarity: 'epico', icon: <Sword size={24} /> },
            amulet: { name: 'Amuleto Espectral', rarity: 'raro', icon: <Sparkles size={20} /> },
            off: { name: 'Frasco de Fogo', rarity: 'raro', icon: <FlaskConical size={20} /> },
          }}
        />

        <TabBar
          tabs={[
            { id: 'itens', label: 'Itens' },
            { id: 'materiais', label: 'Materiais' },
            { id: 'reliquias', label: 'Relíquias' },
          ]}
          activeTab="itens"
          onChange={() => {}}
        />

        <InventoryGrid items={mockGridItems} selectedId="4" />

        <ItemTooltip
          name="Foice da Névoa"
          rarity="Épico"
          effect="Dano 1d10 + INT. Ao acertar, o alvo perde 1 quadrado de movimento no próximo turno."
          weightKg={4}
          valueBronze={18000}
          hands="Duas mãos"
        />
      </section>

      {/* 6. Combate, Iniciativa e Botão de Ouro Maciço */}
      <section className="space-y-4">
        <h2 className="font-['Cinzel',serif] text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
          6. Combate: Fita de Iniciativa, Ações & Botão de Ouro Maciço
        </h2>
        <InitiativeStrip tokens={mockCombatTokens} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StoneButton
            icon={<Sword size={22} />}
            title="Atacar com Arma"
            subtitle="Foice da Névoa · 1d10 + 3"
            onClick={() => toast.success('Ataque desferido contra o Lobo')}
          />
          <StoneButton
            icon={<FlaskConical size={22} />}
            title="Usar Item do Cinto"
            subtitle="3 Poções de Sangue restantes"
            onClick={() => toast.info('Consumível utilizado')}
          />
        </div>

        <Divider />

        <GoldButton onClick={() => toast.success('Turno encerrado!')}>
          Encerrar Turno (Ação Única Dourada)
        </GoldButton>
      </section>

      {/* 7. Toast & Feedback */}
      <section className="space-y-3">
        <h2 className="font-['Cinzel',serif] text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
          7. Modais & Notificações
        </h2>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="slab px-4 py-2 font-['Cinzel',serif] text-xs text-[var(--gold-hi)] uppercase tracking-wider cursor-pointer"
          >
            Abrir Modal de Pedra
          </button>
          <button
            type="button"
            onClick={() =>
              toast('Aviso da Mesa: O Confessor iniciou um descanso.', { duration: 3000 })
            }
            className="slab px-4 py-2 font-['Cinzel',serif] text-xs text-[var(--text)] uppercase tracking-wider cursor-pointer"
          >
            Testar Toast
          </button>
        </div>
      </section>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Santuário Oculto">
        <p className="font-['EB_Garamond',serif] text-sm text-[var(--text)] leading-relaxed">
          As pedras antigas sussurram lamentos esquecidos. Apenas juramentos de ferro sustentam a
          alma perante a névoa.
        </p>
      </Modal>
    </div>
  );
}
