import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Command,
  Sword,
  BookOpen,
  Package,
  Hammer,
  Shield,
  Sliders,
  Users,
  User,
  Sparkles,
  Dice5,
  VolumeX,
  Sun,
  X,
  ExternalLink,
} from 'lucide-react';
import { stopAtmosphere, playProceduralSfx } from '../services/soundboardService';
import { toast } from 'sonner';

export interface CommandItem {
  id: string;
  category: 'mestre' | 'herois' | 'jogador' | 'acoes';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  href?: string;
  action?: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setQuery('');
    }
  }, [isOpen]);

  const toggleParchmentTheme = () => {
    const isParchment = document.documentElement.classList.contains('theme-parchment');
    if (isParchment) {
      document.documentElement.classList.remove('theme-parchment');
      document.body.classList.remove('theme-parchment');
      localStorage.setItem('peste_theme_parchment', 'false');
      toast.info('Modo Dark Fantasy ativado');
    } else {
      document.documentElement.classList.add('theme-parchment');
      document.body.classList.add('theme-parchment');
      localStorage.setItem('peste_theme_parchment', 'true');
      toast.success('Modo Pergaminho ativado');
    }
    onClose();
  };

  const handleRollDice = () => {
    playProceduralSfx('dice');
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;
    toast.success(`🎲 Rolagem 2d6: [${d1}] + [${d2}] = ${total}`);
    onClose();
  };

  const handleStopAudio = () => {
    stopAtmosphere();
    toast.info('Áudio silenciado');
    onClose();
  };

  const commands: CommandItem[] = useMemo(
    () => [
      // Mestre
      {
        id: 'mestre-batalha',
        category: 'mestre',
        title: 'Mesa de Batalha do Mestre',
        subtitle: 'Grid tático, iniciativa e gerenciamento de combate',
        icon: <Sword size={16} className="text-red-400" />,
        badge: '/mestre/batalha',
        href: '/mestre/batalha',
      },
      {
        id: 'mestre-bestiario',
        category: 'mestre',
        title: 'Bestiário de Monstros',
        subtitle: 'Catálogo de abominações, táticas e gerador de encontros',
        icon: <Shield size={16} className="text-amber-400" />,
        badge: '/mestre/bestiario',
        href: '/mestre/bestiario',
      },
      {
        id: 'mestre-itens',
        category: 'mestre',
        title: 'Itens, Arsenal & Loja',
        subtitle: 'Economia, catálogo de relíquias e mercador',
        icon: <Package size={16} className="text-yellow-400" />,
        badge: '/mestre/itens',
        href: '/mestre/itens',
      },
      {
        id: 'mestre-oficina',
        category: 'mestre',
        title: 'Oficina & Receitas de Forja',
        subtitle: 'Grid de criação 3x3 e alquimia do mestre',
        icon: <Hammer size={16} className="text-orange-400" />,
        badge: '/mestre/oficina',
        href: '/mestre/oficina',
      },
      {
        id: 'mestre-grimorio',
        category: 'mestre',
        title: 'Grimórios & Árvores do Juramento',
        subtitle: 'Catálogo de feitiços e provações dos heróis',
        icon: <BookOpen size={16} className="text-purple-400" />,
        badge: '/mestre/grimorio',
        href: '/mestre/grimorio',
      },
      {
        id: 'mestre-sistema',
        category: 'mestre',
        title: 'Sistema, Sons & Códice',
        subtitle: 'Mesa acústica, regras oficiais e backup JSON',
        icon: <Sliders size={16} className="text-[var(--gold)]" />,
        badge: '⌘S',
        href: '/mestre/sistema',
      },

      // Heróis
      {
        id: 'hero-kaelis',
        category: 'herois',
        title: 'Ficha: Kaelis Moonfire',
        subtitle: 'Elfo do Voto do Silêncio Arcano',
        icon: <User size={16} className="text-cyan-400" />,
        badge: 'Jurado',
        href: '/jogadores?heroi=kaelis_moonfire',
      },
      {
        id: 'hero-tor',
        category: 'herois',
        title: 'Ficha: Tor Björn',
        subtitle: 'Anão do Juramento de Sangue e Aço',
        icon: <User size={16} className="text-amber-400" />,
        badge: 'Jurado',
        href: '/jogadores?heroi=tor_bjorn',
      },
      {
        id: 'hero-malenia',
        category: 'herois',
        title: 'Ficha: Malenia',
        subtitle: 'Guerreira da Lâmina Escarlate e Aflição',
        icon: <User size={16} className="text-rose-400" />,
        badge: 'Jurada',
        href: '/jogadores?heroi=malenia',
      },

      // Telas do Jogador
      {
        id: 'jogador-mesa',
        category: 'jogador',
        title: 'Visão do Jogador: Mesa Principal',
        subtitle: 'Ficha integrada, dados e status vitais',
        icon: <Users size={16} className="text-blue-400" />,
        badge: '/jogadores',
        href: '/jogadores',
      },
      {
        id: 'jogador-grimorio',
        category: 'jogador',
        title: 'Visão do Jogador: Grimório Arcana',
        subtitle: 'Magias preparadas e catalisadores',
        icon: <BookOpen size={16} className="text-indigo-400" />,
        badge: '/jogadores/grimorio',
        href: '/jogadores/grimorio',
      },
      {
        id: 'jogador-oficina',
        category: 'jogador',
        title: 'Visão do Jogador: Oficina & Forja',
        subtitle: 'Bancada de criação do herói',
        icon: <Hammer size={16} className="text-amber-500" />,
        badge: '/jogadores/oficina',
        href: '/jogadores/oficina',
      },

      // Ações Rápidas
      {
        id: 'action-parchment',
        category: 'acoes',
        title: 'Alternar Modo Pergaminho',
        subtitle: 'Alterna entre visual Dark Fantasy e Sépiado',
        icon: <Sun size={16} className="text-amber-300" />,
        badge: '⌘P',
        action: toggleParchmentTheme,
      },
      {
        id: 'action-roll-dice',
        category: 'acoes',
        title: 'Rolar 2d6 Imediato',
        subtitle: 'Rola dois dados de seis faces com efeito de áudio',
        icon: <Dice5 size={16} className="text-emerald-400" />,
        badge: '2d6',
        action: handleRollDice,
      },
      {
        id: 'action-stop-audio',
        category: 'acoes',
        title: 'Silenciar Toda a Mesa Acústica',
        subtitle: 'Interrompe imediatamente qualquer som ou ambiência',
        icon: <VolumeX size={16} className="text-red-400" />,
        badge: 'Mute',
        action: handleStopAudio,
      },
    ],
    [],
  );

  // Filtragem
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subtitle?.toLowerCase().includes(q) ||
        c.badge?.toLowerCase().includes(q),
    );
  }, [commands, query]);

  const handleSelectCommand = (cmd: CommandItem) => {
    if (cmd.action) {
      cmd.action();
    } else if (cmd.href) {
      window.location.href = cmd.href;
      onClose();
    }
  };

  // Teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? Math.max(0, filteredCommands.length - 1) : prev - 1,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleSelectCommand(filteredCommands[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      data-testid="command-palette-backdrop"
    >
      <div
        className="w-full max-w-2xl bg-neutral-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        data-testid="command-palette-modal"
      >
        {/* Search Header */}
        <div className="relative border-b border-white/10 p-4 flex items-center gap-3">
          <Search size={20} className="text-[var(--gold)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Digite um comando ou tela... (ex: Batalha, Kaelis, Pergaminho, 2d6)"
            data-testid="command-palette-input"
            className="w-full bg-transparent text-sm sm:text-base text-[var(--text-1)] placeholder-white/40 focus:outline-none font-serif"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-white/40 hover:text-white p-1"
            >
              <X size={16} />
            </button>
          ) : (
            <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded border border-white/15 bg-white/5 text-[10px] font-mono text-white/40">
              ESC para fechar
            </span>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[420px] overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-xs font-serif text-white/40">
              Nenhum resultado para "{query}".
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  data-testid={`command-item-${cmd.id}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => handleSelectCommand(cmd)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[var(--gold)]/15 border border-[var(--gold)]/60 text-[var(--text-1)]'
                      : 'hover:bg-white/5 border border-transparent text-white/70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg border shrink-0 ${
                        isSelected
                          ? 'bg-[var(--gold)]/20 border-[var(--gold)]/40 text-[var(--gold)]'
                          : 'bg-white/5 border-white/10 text-white/60'
                      }`}
                    >
                      {cmd.icon}
                    </div>
                    <div className="truncate">
                      <div
                        className={`font-serif text-xs sm:text-sm font-bold ${
                          isSelected ? 'text-[var(--gold)]' : 'text-[var(--text-1)]'
                        }`}
                      >
                        {cmd.title}
                      </div>
                      {cmd.subtitle && (
                        <div className="text-[11px] font-serif text-[var(--text-2)] truncate">
                          {cmd.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {cmd.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ml-2 border ${
                        isSelected
                          ? 'bg-[var(--gold)]/20 text-[var(--gold)] border-[var(--gold)]/40'
                          : 'bg-white/5 text-white/40 border-white/10'
                      }`}
                    >
                      {cmd.badge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-white/10 px-4 py-2 bg-neutral-950/60 flex items-center justify-between text-[11px] font-mono text-white/40">
          <div className="flex items-center gap-2">
            <span>↑↓ Navegar</span>
            <span>•</span>
            <span>↵ Executar</span>
          </div>
          <span>Peste do Juramento · ⌘K</span>
        </div>
      </div>
    </div>
  );
};
