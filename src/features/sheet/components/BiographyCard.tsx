import { BookOpen, Edit3 } from 'lucide-react';
import React, { useState } from 'react';
import { GoldButton } from '../../../shared/ui/GoldButton';
import { Modal } from '../../../shared/ui/Modal';
import { Parchment } from '../../../shared/ui/Parchment';
import { StoneButton } from '../../../shared/ui/StoneButton';

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
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-['Cinzel',serif] uppercase tracking-wider text-[var(--ink)] border border-[var(--ink-soft)]/40 hover:bg-black/5 transition-colors cursor-pointer"
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

      {/* Edit Modal usando Modal canônico e Parchment unroll */}
      <Modal
        open={isEditing}
        onOpenChange={setIsEditing}
        title="Editar Biografia do Jurado"
        description="As memórias e os laços aqui inscritos sustentam a alma contra a Peste."
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
          <Parchment unroll seed={95} className="space-y-3 p-3.5">
            <div>
              <label className="block text-[var(--ink)] font-bold mb-1 font-['Cinzel',serif] uppercase tracking-wider text-[10px]">
                Antecedente:
              </label>
              <textarea
                rows={3}
                value={formData.backstory}
                onChange={(e) => setFormData({ ...formData, backstory: e.target.value })}
                placeholder="Origem, família, passado sombrio..."
                className="w-full p-2.5 bg-black/5 border border-[var(--ink-soft)]/40 text-[var(--ink)] focus:border-[var(--gold-lo)] focus:outline-none resize-none font-['EB_Garamond',serif] text-sm"
              />
            </div>

            <div>
              <label className="block text-[var(--ink)] font-bold mb-1 font-['Cinzel',serif] uppercase tracking-wider text-[10px]">
                Vínculo com a Companhia:
              </label>
              <textarea
                rows={2}
                value={formData.connection}
                onChange={(e) => setFormData({ ...formData, connection: e.target.value })}
                placeholder="Por quem você daria a vida sem hesitar?"
                className="w-full p-2.5 bg-black/5 border border-[var(--ink-soft)]/40 text-[var(--ink)] focus:border-[var(--gold-lo)] focus:outline-none resize-none font-['EB_Garamond',serif] text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[var(--ink)] font-bold mb-1 font-['Cinzel',serif] uppercase tracking-wider text-[10px]">
                  Ideal:
                </label>
                <input
                  type="text"
                  value={formData.ideal}
                  onChange={(e) => setFormData({ ...formData, ideal: e.target.value })}
                  placeholder="Sua bússola moral..."
                  className="w-full p-2.5 bg-black/5 border border-[var(--ink-soft)]/40 text-[var(--ink)] focus:border-[var(--gold-lo)] focus:outline-none font-['EB_Garamond',serif] text-sm"
                />
              </div>

              <div>
                <label className="block text-[var(--ink)] font-bold mb-1 font-['Cinzel',serif] uppercase tracking-wider text-[10px]">
                  Defeito / Fardo:
                </label>
                <input
                  type="text"
                  value={formData.defeito}
                  onChange={(e) => setFormData({ ...formData, defeito: e.target.value })}
                  placeholder="Sua vulnerabilidade secreta..."
                  className="w-full p-2.5 bg-black/5 border border-[var(--ink-soft)]/40 text-[var(--ink)] focus:border-[var(--gold-lo)] focus:outline-none font-['EB_Garamond',serif] text-sm"
                />
              </div>
            </div>
          </Parchment>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--iron)]">
            <StoneButton
              title="Cancelar"
              onClick={() => setIsEditing(false)}
              className="w-auto px-4 py-2"
            />
            <GoldButton
              type="submit"
              disabled={isSaving}
              className="w-auto px-5 py-2 text-xs font-bold font-['Cinzel',serif] uppercase"
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </GoldButton>
          </div>
        </form>
      </Modal>
    </Parchment>
  );
};
