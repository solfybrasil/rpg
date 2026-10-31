import React, { useState, useEffect } from 'react';
import {
  Moon,
  Sun,
  Flame,
  Volume2,
  Vibrate,
  Database,
  Download,
  Upload,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Switch } from '../../../shared/ui/Switch';
import { Modal } from '../../../shared/ui/Modal';
import {
  generateFullGameStateBackup,
  useRestoreBackupMutation,
} from '../api/useDMSystem';
import { toast } from 'sonner';

export const SettingsTab: React.FC = () => {
  // 1. Estados locais de configurações com persistência
  const [isParchment, setIsParchment] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      document.documentElement.classList.contains('theme-parchment') ||
      localStorage.getItem('peste_theme_parchment') === 'true'
    );
  });

  const [reduceMotion, setReduceMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('peste_reduce_motion') === 'true';
  });

  const [ambientParticles, setAmbientParticles] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('peste_particles') !== 'false';
  });

  const [diceAudio, setDiceAudio] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('peste_dice_audio') !== 'false';
  });

  const [tactileFeedback, setTactileFeedback] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('peste_tactile_feedback') !== 'false';
  });

  // Modal de Restauração
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreJsonText, setRestoreJsonText] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const restoreMutation = useRestoreBackupMutation();

  // Alternar Modo Pergaminho
  const handleToggleParchment = (checked: boolean) => {
    setIsParchment(checked);
    if (checked) {
      document.documentElement.classList.add('theme-parchment');
      document.body.classList.add('theme-parchment');
      localStorage.setItem('peste_theme_parchment', 'true');
      toast.success('Modo Pergaminho ativado');
    } else {
      document.documentElement.classList.remove('theme-parchment');
      document.body.classList.remove('theme-parchment');
      localStorage.setItem('peste_theme_parchment', 'false');
      toast.info('Modo Dark Fantasy ativado');
    }
  };

  const handleToggleReduceMotion = (checked: boolean) => {
    setReduceMotion(checked);
    localStorage.setItem('peste_reduce_motion', String(checked));
    if (checked) {
      document.documentElement.classList.add('motion-reduce');
    } else {
      document.documentElement.classList.remove('motion-reduce');
    }
  };

  const handleToggleParticles = (checked: boolean) => {
    setAmbientParticles(checked);
    localStorage.setItem('peste_particles', String(checked));
  };

  const handleToggleDiceAudio = (checked: boolean) => {
    setDiceAudio(checked);
    localStorage.setItem('peste_dice_audio', String(checked));
  };

  const handleToggleTactile = (checked: boolean) => {
    setTactileFeedback(checked);
    localStorage.setItem('peste_tactile_feedback', String(checked));
  };

  // Exportar Backup
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const backup = await generateFullGameStateBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split('T')[0];
      const a = document.createElement('a');
      a.href = url;
      a.download = `peste_backup_completo_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup completo do jogo exportado com sucesso!');
    } catch (err: any) {
      toast.error(`Erro ao gerar backup: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Restaurar Backup
  const handleConfirmRestore = async () => {
    if (!restoreJsonText.trim()) {
      toast.error('Cole o conteúdo do arquivo JSON de backup.');
      return;
    }
    try {
      await restoreMutation.mutateAsync(restoreJsonText);
      setIsRestoreModalOpen(false);
      setRestoreJsonText('');
    } catch {
      // Erro tratado na mutation
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" data-testid="settings-tab">
      {/* 1. Aparência */}
      <div className="space-y-2">
        <h3 className="px-2 text-xs font-serif uppercase tracking-widest text-[var(--gold-dim)] font-bold">
          Aparência & Interface
        </h3>
        <div className="bg-neutral-900/80 rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5 shadow-md">
          {/* Modo Pergaminho */}
          <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  isParchment
                    ? 'bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/40'
                    : 'bg-white/5 text-white/50 border-white/10'
                }`}
              >
                {isParchment ? <Sun size={18} /> : <Moon size={18} />}
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-[var(--text-1)]">
                  Modo Pergaminho
                </h4>
                <p className="text-xs text-[var(--text-2)] font-serif">
                  Aplica paleta sépia quente simulando manuscritos e velino medieval
                </p>
              </div>
            </div>
            <Switch
              checked={isParchment}
              onCheckedChange={handleToggleParchment}
              data-testid="parchment-mode-switch"
            />
          </div>

          {/* Reduzir Animações */}
          <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/5 text-white/50 border border-white/10">
                <RotateCcw size={18} />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-[var(--text-1)]">
                  Reduzir Animações
                </h4>
                <p className="text-xs text-[var(--text-2)] font-serif">
                  Minimiza transições contínuas e efeitos de movimento
                </p>
              </div>
            </div>
            <Switch
              checked={reduceMotion}
              onCheckedChange={handleToggleReduceMotion}
              data-testid="reduce-motion-switch"
            />
          </div>

          {/* Brasas e Partículas */}
          <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Flame size={18} />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-[var(--text-1)]">
                  Brasas & Efeitos de Fundo
                </h4>
                <p className="text-xs text-[var(--text-2)] font-serif">
                  Renderiza partículas sutis de cinzas e fumaça na tela
                </p>
              </div>
            </div>
            <Switch
              checked={ambientParticles}
              onCheckedChange={handleToggleParticles}
              data-testid="particles-switch"
            />
          </div>
        </div>
      </div>

      {/* 2. Áudio & Sensações */}
      <div className="space-y-2">
        <h3 className="px-2 text-xs font-serif uppercase tracking-widest text-[var(--gold-dim)] font-bold">
          Áudio & Feedback
        </h3>
        <div className="bg-neutral-900/80 rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5 shadow-md">
          {/* Sons de Dados */}
          <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20">
                <Volume2 size={18} />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-[var(--text-1)]">
                  Sons de Rolagem de Dados
                </h4>
                <p className="text-xs text-[var(--text-2)] font-serif">
                  Dispara clique mecânico ao rolar dados 2d6
                </p>
              </div>
            </div>
            <Switch
              checked={diceAudio}
              onCheckedChange={handleToggleDiceAudio}
              data-testid="dice-audio-switch"
            />
          </div>

          {/* Feedback Tátil */}
          <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/5 text-white/50 border border-white/10">
                <Vibrate size={18} />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-[var(--text-1)]">
                  Feedback Tátil em Dispositivos Móveis
                </h4>
                <p className="text-xs text-[var(--text-2)] font-serif">
                  Vibração breve ao acionar botões e habilidades críticas
                </p>
              </div>
            </div>
            <Switch
              checked={tactileFeedback}
              onCheckedChange={handleToggleTactile}
              data-testid="tactile-feedback-switch"
            />
          </div>
        </div>
      </div>

      {/* 3. Backup & Restauração */}
      <div className="space-y-2">
        <h3 className="px-2 text-xs font-serif uppercase tracking-widest text-[var(--gold-dim)] font-bold">
          Backup & Banco de Dados
        </h3>
        <div className="bg-neutral-900/80 rounded-2xl border border-white/10 p-5 space-y-4 shadow-md">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
              <Database size={20} />
            </div>
            <div>
              <h4 className="font-serif font-bold text-sm text-[var(--text-1)]">
                Gerenciador de Estado da Campanha
              </h4>
              <p className="text-xs text-[var(--text-2)] font-serif mt-0.5 leading-relaxed">
                Exporte todo o estado do jogo (personagens, itens, receitas, estado da mesa) em um arquivo JSON padronizado para segurança ou restaure uma cópia prévia.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={isExporting}
              data-testid="export-backup-btn"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--gold)]/15 hover:bg-[var(--gold)]/25 text-[var(--gold)] border border-[var(--gold)]/30 font-serif text-xs font-bold transition-all cursor-pointer active:scale-[0.98]"
            >
              <Download size={15} />
              {isExporting ? 'Exportando...' : 'Exportar Backup Completo (JSON)'}
            </button>

            <button
              type="button"
              onClick={() => setIsRestoreModalOpen(true)}
              data-testid="open-restore-modal-btn"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 font-serif text-xs font-bold transition-all cursor-pointer active:scale-[0.98]"
            >
              <Upload size={15} />
              Restaurar Backup do Estado
            </button>
          </div>
        </div>
      </div>

      {/* 4. Conexão & Sobre */}
      <div className="bg-neutral-900/40 rounded-2xl border border-white/5 p-4 flex items-center justify-between text-xs text-white/50 font-serif">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>Supabase Online: ermkaldfvvjgnhgnvcqo</span>
        </div>
        <span className="font-mono text-[11px] text-white/40">Engine v2.0 (Prompt 20)</span>
      </div>

      {/* Modal de Restauração */}
      <Modal
        open={isRestoreModalOpen}
        onOpenChange={setIsRestoreModalOpen}
        title="Restaurar Estado da Campanha"
      >
        <div className="space-y-4 p-4 text-[var(--text-1)]">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs font-serif text-amber-200/90 leading-relaxed">
              A restauração sobrescreverá o estado das entidades contidas no backup. Certifique-se de que o arquivo JSON foi gerado pelo sistema oficial.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-serif uppercase tracking-wider text-white/60">
              Conteúdo do Arquivo JSON de Backup
            </label>
            <textarea
              rows={8}
              value={restoreJsonText}
              onChange={(e) => setRestoreJsonText(e.target.value)}
              placeholder='Cole aqui o JSON exportado previamente (ex: { "version": "2.0", "data": { ... } })...'
              data-testid="restore-json-textarea"
              className="w-full p-3 bg-black/60 border border-white/10 rounded-xl font-mono text-xs text-[var(--text-1)] placeholder-white/30 focus:outline-none focus:border-[var(--gold)]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsRestoreModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-serif text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmRestore}
              disabled={restoreMutation.isPending}
              data-testid="confirm-restore-btn"
              className="px-5 py-2 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-bright)] text-black font-serif text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
            >
              {restoreMutation.isPending ? 'Restaurando...' : 'Confirmar e Restaurar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
