import { createFileRoute } from '@tanstack/react-router';
import { Sparkles, Store } from 'lucide-react';
import React, { useState } from 'react';
import { formatCoinsString } from '../entities/item';
import {
  Badge,
  Button,
  Card,
  CoinsBadge,
  DiceResult,
  Empty,
  Modal,
  Sheet,
  Stepper,
  Switch,
} from '../shared/ui';

export const Route = createFileRoute('/design')({
  component: DesignSystemShowcase,
});

function DesignSystemShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [stepperVal, setStepperVal] = useState(2);
  const [switchForge, setSwitchForge] = useState(true);
  const [switchAlchemy, setSwitchAlchemy] = useState(false);

  return (
    <div className="min-h-screen bg-[#08080a] text-[#f5f5f7] p-8 max-w-5xl mx-auto space-y-10">
      <header className="border-b border-white/10 pb-6">
        <h1 className="font-serif text-3xl font-bold text-[#f5b65b] tracking-wider uppercase">
          Design System · Peste do Juramento
        </h1>
        <p className="text-sm font-serif italic text-white/60 mt-1">
          Dark Fantasy Minimalista — Tokens, componentes fundamentais e superfícies.
        </p>
      </header>

      {/* Badges Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-serif font-bold text-white/80 uppercase tracking-widest">
          Raridades & Badges
        </h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="comum">Comum</Badge>
          <Badge variant="incomum">Incomum</Badge>
          <Badge variant="raro">Raro</Badge>
          <Badge variant="lendario">Lendário</Badge>
          <Badge variant="artefato">Artefato</Badge>
          <Badge variant="accent">Destaque</Badge>
          <Badge variant="success">Sucesso</Badge>
          <Badge variant="warning">Atenção</Badge>
          <Badge variant="danger">Perigo</Badge>
        </div>
      </section>

      {/* Moedas & Stepper Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-serif font-bold text-white/80 uppercase tracking-widest">
          Economia & Controles Numéricos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl p-4 bg-white/[0.04] border border-white/[0.08] space-y-3">
            <h3 className="text-xs font-serif uppercase tracking-wider text-[#a8947c]">
              CoinsBadge (2.500b = 50p = 1o)
            </h3>
            <div className="flex flex-wrap gap-4 items-center">
              <CoinsBadge coinsBronze={125} size="sm" />
              <CoinsBadge coinsBronze={2650} size="md" />
              <CoinsBadge coinsBronze={15230} size="lg" />
            </div>
          </div>

          <div className="rounded-2xl p-4 bg-white/[0.04] border border-white/[0.08] flex flex-col items-center justify-center space-y-2">
            <h3 className="text-xs font-serif uppercase tracking-wider text-[#a8947c]">
              Stepper Interativo
            </h3>
            <Stepper
              value={stepperVal}
              onChange={setStepperVal}
              min={-5}
              max={10}
              label="Modificador de Teste"
            />
          </div>
        </div>
      </section>

      {/* Switch Toggles Section (Prompt 17) */}
      <section className="space-y-4">
        <h2 className="text-sm font-serif font-bold text-white/80 uppercase tracking-widest">
          Alternadores & Chaves de Estado (Switch)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl p-4 bg-white/[0.04] border border-white/[0.08]">
            <Switch
              size="lg"
              variant="gold"
              checked={switchForge}
              onCheckedChange={setSwitchForge}
              label="Forja Aberta (Mestre)"
              description="Controle de acesso da bancada de forja para os jurados"
            />
          </div>
          <div className="rounded-2xl p-4 bg-white/[0.04] border border-white/[0.08]">
            <Switch
              size="lg"
              variant="emerald"
              checked={switchAlchemy}
              onCheckedChange={setSwitchAlchemy}
              label="Alquimia Aberta (Mestre)"
              description="Controle de acesso ao caldeirão e mesa de destilação"
            />
          </div>
        </div>
      </section>

      {/* DiceResult Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-serif font-bold text-white/80 uppercase tracking-widest">
          Resultados de Dados (DiceResult)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <DiceResult
            tone="critico"
            total={15}
            peso={8}
            label="Crítico! (+1 Inspiração)"
            keptDice={[6, 6]}
            modifier={3}
          />
          <DiceResult
            tone="sucesso"
            total={11}
            peso={8}
            label="Sucesso"
            keptDice={[4, 5]}
            modifier={2}
          />
          <DiceResult
            tone="falha"
            total={6}
            peso={8}
            label="Falha"
            keptDice={[2, 3]}
            modifier={1}
          />
          <DiceResult
            tone="desastre"
            total={2}
            peso={8}
            label="Desastre Rúnico!"
            keptDice={[1, 1]}
            modifier={0}
          />
        </div>
      </section>

      {/* Empty State Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-serif font-bold text-white/80 uppercase tracking-widest">
          Estados Vazios (Empty)
        </h2>
        <Empty
          icon={<Store className="w-8 h-8 text-[#ff453a]" />}
          title="As portas estão trancadas."
          description="Exemplo de estado de mercado fechado pelo Confessor da Mesa."
        />
      </section>

      {/* Buttons Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-serif font-bold text-white/80 uppercase tracking-widest">
          Botões
        </h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary" leftIcon={<Sparkles className="w-4 h-4" />}>
            Ação Primária (Dourado)
          </Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="danger">Perigo / Descartar</Button>
          <Button variant="ghost">Fantasma</Button>
        </div>
      </section>

      {/* Cards & Surfaces */}
      <section className="space-y-4">
        <h2 className="text-sm font-serif font-bold text-white/80 uppercase tracking-widest">
          Cards e Superfícies
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <h3 className="font-serif font-bold text-sm text-[#f5b65b]">Card Padrão</h3>
            <p className="text-xs text-white/70 font-serif leading-relaxed mt-1">
              Superfície escura com borda sutil, usada para módulos secundários e listagens.
            </p>
            <div className="mt-3 text-xs text-[#f5b65b] font-mono">
              Saldo: {formatCoinsString(12500)}
            </div>
          </Card>
          <Card>
            <h3 className="font-serif font-bold text-sm text-[#f5b65b]">
              Interações Modais & Gavetas
            </h3>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
                Abrir Modal
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setSheetOpen(true)}>
                Abrir Sheet Lateral
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Interactive Samples */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Modal do Design System"
        description="Exemplo de diálogo centralizado para confirmações e transferências."
      >
        <p className="text-sm text-white/80 font-serif py-4">
          Este modal segue o padrão Dark Fantasy com fundo escuro e borda fina.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Fechar
          </Button>
        </div>
      </Modal>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        side="right"
        title="Ficha Lateral (Sheet)"
        description="Gaveta lateral ampla para fichas detalhadas de criaturas e heróis."
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-white/80 font-serif leading-relaxed">
            Painel deslizante de alta densidade com layout Dark Fantasy. Perfeito para visualização
            de estatísticas sem perder o contexto do catálogo.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Fechar Gaveta
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
