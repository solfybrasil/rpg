import React, { useState, useEffect } from 'react';
import {
  Volume2,
  BookOpen,
  Settings,
  FileCode,
  Command,
  Shield,
  Sparkles,
} from 'lucide-react';
import { SoundboardTab } from './SoundboardTab';
import { CodexTab } from './CodexTab';
import { SettingsTab } from './SettingsTab';
import { PlayerJsonTab } from './PlayerJsonTab';
import { CommandPaletteModal } from './CommandPaletteModal';

export type DMSystemSubTab = 'soundboard' | 'codice' | 'configuracoes' | 'json';

export const DMSystemHubView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DMSystemSubTab>('soundboard');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Global Shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-1)] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-serif uppercase tracking-widest text-[var(--gold-dim)]">
            <Shield size={14} />
            Módulo do Mestre · Sistema & Utilitários
          </div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[var(--text-1)] mt-1">
            Sons, Códice & Ajustes
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-2)] max-w-2xl mt-1 leading-relaxed">
            Mesa de sons ambiente e SFX procedural, leitor editorial do códice de regras, configurações com modo Pergaminho, exportação JSON das fichas e Command Palette.
          </p>
        </div>

        {/* Command Palette Trigger Button */}
        <button
          type="button"
          data-testid="open-command-palette-btn"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 font-serif text-xs transition-all cursor-pointer self-start md:self-auto shadow-sm active:scale-95"
        >
          <Command size={14} className="text-[var(--gold)]" />
          <span>Paleta de Comandos</span>
          <span className="ml-1 px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-[var(--gold)] font-bold">
            ⌘K
          </span>
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1 overflow-x-auto scrollbar-none">
        <button
          type="button"
          data-testid="dm-tab-soundboard"
          onClick={() => setActiveTab('soundboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-serif text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'soundboard'
              ? 'border-[var(--gold)] text-[var(--gold)] bg-[var(--gold)]/10 shadow-sm'
              : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Volume2 size={16} />
          Mesa de Sons
        </button>

        <button
          type="button"
          data-testid="dm-tab-codice"
          onClick={() => setActiveTab('codice')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-serif text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'codice'
              ? 'border-[var(--gold)] text-[var(--gold)] bg-[var(--gold)]/10 shadow-sm'
              : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen size={16} />
          Códice de Regras
        </button>

        <button
          type="button"
          data-testid="dm-tab-configuracoes"
          onClick={() => setActiveTab('configuracoes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-serif text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'configuracoes'
              ? 'border-[var(--gold)] text-[var(--gold)] bg-[var(--gold)]/10 shadow-sm'
              : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings size={16} />
          Ajustes & Sistema
        </button>

        <button
          type="button"
          data-testid="dm-tab-json"
          onClick={() => setActiveTab('json')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-serif text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
            activeTab === 'json'
              ? 'border-[var(--gold)] text-[var(--gold)] bg-[var(--gold)]/10 shadow-sm'
              : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileCode size={16} />
          JSON dos Jogadores
        </button>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === 'soundboard' && <SoundboardTab />}
        {activeTab === 'codice' && <CodexTab />}
        {activeTab === 'configuracoes' && <SettingsTab />}
        {activeTab === 'json' && <PlayerJsonTab />}
      </div>

      {/* Global Command Palette Modal */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
};
