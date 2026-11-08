import { BookOpen, Check, Edit3, X } from 'lucide-react';
import React, { useState } from 'react';
import { GoldButton } from '../../../shared/ui/GoldButton';
import { Parchment } from '../../../shared/ui/Parchment';
import { StoneButton } from '../../../shared/ui/StoneButton';
import { StonePanel } from '../../../shared/ui/StonePanel';

export interface BioData {
  backstory: string;
  connection: string;
  ideal: string;
  defeito: string;
}

interface BiographyCardProps {
  backstory?: string | null;
  connection?: string | null;
  ideal?: string | null;
  defeito?: string | null;
  onSave: (data: BioData) => Promise<void> | void;
  isSaving?: boolean;
}

export const BiographyCard: React.FC<BiographyCardProps> = ({
  backstory,
  connection,
  ideal,
  defeito,
  onSave,
  isSaving = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  // Form local state
  const [formData, setFormData] = useState<BioData>({
    backstory: backstory || '',
    connection: connection || '',
    ideal: ideal || '',
    defeito: defeito || '',
  });

  const handleOpenEdit = () => {
    setFormData({
      backstory: backstory || '',
      connection: connection || '',
      ideal: ideal || '',
      defeito: defeito || '',
    });
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
    setIsEditing(false);
  };

  return (
    <Parchment seed={92} className="flex flex-col gap-3 p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--ink-soft)]/20 pb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[var(--gold-lo)]" />
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--ink)] font-['Cinzel',serif] m-0">
            Identidade & Vínculos Solenes
          </h2>
        </div>

        <button
          type="button"
          onClick={handleOpenEdit}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-['Cinzel',serif] uppercase tracking-wider text-[var(--ink)] border border-[var(--ink-soft)]/40 hover:bg-black/5 transition-colors"
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>Editar</span>
        </button>
      </div>

      {/* Grid of 4 Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Antecedente */}
        <div className="flex flex-col p-3 border border-[var(--ink-soft)]/20 bg-black/5">
          <span className="text-[10px] font-['Cinzel',serif] font-bold text-[var(--ink-soft)] uppercase tracking-wider mb-1">
            Antecedente (História):
          </span>
          <p className="text-xs text-[var(--ink)] font-['EB_Garamond',serif] italic m-0 leading-relaxed">
            {backstory || 'Nenhum antecedente registrado.'}
          </p>
        </div>

        {/* Vínculo */}
        <div className="flex flex-col p-3 border border-[var(--ink-soft)]/20 bg-black/5">
          <span className="text-[10px] font-['Cinzel',serif] font-bold text-[var(--ink-soft)] uppercase tracking-wider mb-1">
            Vínculo com a Companhia:
          </span>
          <p className="text-xs text-[var(--ink)] font-['EB_Garamond',serif] m-0 leading-relaxed">
            {connection || 'Nenhum vínculo registrado.'}
          </p>
        </div>

        {/* Ideal */}
        <div className="flex flex-col p-3 border border-[var(--ink-soft)]/20 bg-black/5">
          <span className="text-[10px] font-['Cinzel',serif] font-bold text-[var(--ink-soft)] uppercase tracking-wider mb-1">
            Ideal / Convicção:
          </span>
          <p className="text-xs text-[var(--ink)] font-['EB_Garamond',serif] m-0 leading-relaxed">
            {ideal || 'Fidelidade absoluta ao juramento sagrado.'}
          </p>
        </div>

        {/* Defeito */}
        <div className="flex flex-col p-3 border border-[var(--ink-soft)]/20 bg-black/5">
          <span className="text-[10px] font-['Cinzel',serif] font-bold text-[var(--ink-soft)] uppercase tracking-wider mb-1">
            Defeito / Fardo:
          </span>
          <p className="text-xs text-[var(--ink)] font-['EB_Garamond',serif] m-0 leading-relaxed">
            {defeito || 'A carne definha perante a dúvida e a fraqueza moral.'}
          </p>
        </div>
      </div>

      {/* Edit Modal / Drawer */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <StonePanel className="w-full max-w-lg p-5 border border-[var(--gold-lo)] shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--iron)] pb-3">
              <h3 className="text-sm font-bold font-['Cinzel',serif] text-[var(--gold-hi)] uppercase tracking-wider m-0">
                Editar Biografia do Jurado
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 text-[var(--muted)] hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block text-[var(--gold)] font-bold mb-1 font-['Cinzel',serif] uppercase tracking-wider text-[10px]">
                  Antecedente:
                </label>
                <textarea
                  rows={3}
                  value={formData.backstory}
                  onChange={(e) => setFormData({ ...formData, backstory: e.target.value })}
                  placeholder="De onde você veio? Que votos foram quebrados antes deste?"
                  className="w-full p-2.5 bg-[var(--stone-2)] border border-[var(--iron)] text-[var(--text)] focus:border-[var(--gold)] focus:outline-none resize-none font-['EB_Garamond',serif] text-sm"
                />
              </div>

              <div>
                <label className="block text-[var(--gold)] font-bold mb-1 font-['Cinzel',serif] uppercase tracking-wider text-[10px]">
                  Vínculo com a Companhia:
                </label>
                <textarea
                  rows={2}
                  value={formData.connection}
                  onChange={(e) => setFormData({ ...formData, connection: e.target.value })}
                  placeholder="Por quem você daria a vida sem hesitar?"
                  className="w-full p-2.5 bg-[var(--stone-2)] border border-[var(--iron)] text-[var(--text)] focus:border-[var(--gold)] focus:outline-none resize-none font-['EB_Garamond',serif] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--gold)] font-bold mb-1 font-['Cinzel',serif] uppercase tracking-wider text-[10px]">
                    Ideal:
                  </label>
                  <input
                    type="text"
                    value={formData.ideal}
                    onChange={(e) => setFormData({ ...formData, ideal: e.target.value })}
                    placeholder="Sua bússola moral..."
                    className="w-full p-2.5 bg-[var(--stone-2)] border border-[var(--iron)] text-[var(--text)] focus:border-[var(--gold)] focus:outline-none font-['EB_Garamond',serif] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[var(--gold)] font-bold mb-1 font-['Cinzel',serif] uppercase tracking-wider text-[10px]">
                    Defeito / Fardo:
                  </label>
                  <input
                    type="text"
                    value={formData.defeito}
                    onChange={(e) => setFormData({ ...formData, defeito: e.target.value })}
                    placeholder="Sua vulnerabilidade secreta..."
                    className="w-full p-2.5 bg-[var(--stone-2)] border border-[var(--iron)] text-[var(--text)] focus:border-[var(--gold)] focus:outline-none font-['EB_Garamond',serif] text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--iron)]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-[var(--iron)] text-[var(--muted)] font-['Cinzel',serif] uppercase text-xs hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="end-turn px-5 py-2 text-xs font-bold font-['Cinzel',serif] text-[var(--abyss)] uppercase"
                >
                  {isSaving ? 'Gravando...' : 'Salvar no Registro'}
                </button>
              </div>
            </form>
          </StonePanel>
        </div>
      )}
    </Parchment>
  );
};
