import React, { useState, useEffect } from 'react';
import { BookOpen, Command, FileCode, Settings, Volume2 } from 'lucide-react';
import { DMPageHeader, DMTabs, DM_PAGE_CLASS } from '../../../shared/ui/DMPage';
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
    <div className={DM_PAGE_CLASS}>
      <DMPageHeader
        title="Sistema"
        subtitle="Sons, regras, ajustes e exportação das fichas."
        actions={
          <button
            type="button"
            data-testid="open-command-palette-btn"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-2 h-8 px-3 border border-[var(--iron)] bg-[var(--stone)] text-xs text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
          >
            <Command size={14} className="text-[var(--gold)]" />
            Comandos
            <kbd className="text-[10px] text-[var(--gold)]">Ctrl K</kbd>
          </button>
        }
      />

      <DMTabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'soundboard', label: 'Sons', icon: Volume2, testId: 'dm-tab-soundboard' },
          { id: 'codice', label: 'Códice', icon: BookOpen, testId: 'dm-tab-codice' },
          { id: 'configuracoes', label: 'Ajustes', icon: Settings, testId: 'dm-tab-configuracoes' },
          { id: 'json', label: 'JSON das fichas', icon: FileCode, testId: 'dm-tab-json' },
        ]}
      />

      <div>
        {activeTab === 'soundboard' && <SoundboardTab />}
        {activeTab === 'codice' && <CodexTab />}
        {activeTab === 'configuracoes' && <SettingsTab />}
        {activeTab === 'json' && <PlayerJsonTab />}
      </div>

      {isCommandPaletteOpen && (
        <CommandPaletteModal isOpen onClose={() => setIsCommandPaletteOpen(false)} />
      )}
    </div>
  );
};
