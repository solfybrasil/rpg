import { createFileRoute } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { formatCoinsString } from '../entities/item';
import { Badge, Button, Card, Modal, Sheet } from '../shared/ui';

export const Route = createFileRoute('/design')({
  component: DesignSystemShowcase,
});

function DesignSystemShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

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
          <Card title="Card Padrão" subtitle="Superfície 1">
            <p className="text-xs text-white/70 font-serif leading-relaxed">
              Superfície escura com borda sutil, usada para módulos secundários e listagens.
            </p>
            <div className="mt-3 text-xs text-[#f5b65b] font-mono">
              Saldo: {formatCoinsString(12500)}
            </div>
          </Card>
          <Card title="Interações Modais" subtitle="Radix Dialog & Sheet">
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
                Abrir Modal
              </Button>
              <Button size="sm" variant="primary" onClick={() => setSheetOpen(true)}>
                Abrir Sheet
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
        title="Sheet do Design System"
        description="Gaveta inferior para celular e painel lateral para tablet/desktop."
      >
        <div className="space-y-4 py-2">
          <Badge variant="artefato">Item Sagrado</Badge>
          <p className="text-sm text-white/80 font-serif leading-relaxed">
            Gaveta expansível para inspecionar itens, ler histórico e executar ações rápidas sem
            perder o contexto da grade.
          </p>
        </div>
      </Sheet>
    </div>
  );
}
