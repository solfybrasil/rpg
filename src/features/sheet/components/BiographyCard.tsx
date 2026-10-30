import { BookOpen, Edit3, X, Check } from 'lucide-react';
import React, { useState } from 'react';

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
    <section className="flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--line)] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[var(--gold)]" />
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--gold-bright)] font-cinzel m-0">
            Identidade & Vínculos
          </h2>
        </div>

        <button
          type="button"
          onClick={handleOpenEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-xs text-[var(--gold-bright)] border border-[var(--line)] transition-colors"
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>Editar</span>
        </button>
      </div>

      {/* Grid of 4 Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Antecedente */}
        <div className="flex flex-col p-3 rounded-xl bg-[var(--solid)] border border-[var(--hair)]">
          <span className="text-[11px] font-cinzel font-bold text-[var(--gold-dim)] uppercase tracking-wider mb-1">
            Antecedente (História):
          </span>
          <p className="text-xs text-[var(--text-2)] font-serif italic m-0 leading-relaxed">
            {backstory || 'Nenhum antecedente registrado.'}
          </p>
        </div>

        {/* Vínculo */}
        <div className="flex flex-col p-3 rounded-xl bg-[var(--solid)] border border-[var(--hair)]">
          <span className="text-[11px] font-cinzel font-bold text-[var(--gold-dim)] uppercase tracking-wider mb-1">
            Vínculo com o Grupo:
          </span>
          <p className="text-xs text-[var(--text-2)] font-sans m-0 leading-relaxed">
            {connection || 'Nenhum vínculo registrado.'}
          </p>
        </div>

        {/* Ideal */}
        <div className="flex flex-col p-3 rounded-xl bg-[var(--solid)] border border-[var(--hair)]">
          <span className="text-[11px] font-cinzel font-bold text-[var(--gold-dim)] uppercase tracking-wider mb-1">
            Ideal / Convicção:
          </span>
          <p className="text-xs text-[var(--text-2)] font-sans m-0 leading-relaxed">
            {ideal || 'Fidelidade absoluta ao juramento sagrado.'}
          </p>
        </div>

        {/* Defeito */}
        <div className="flex flex-col p-3 rounded-xl bg-[var(--solid)] border border-[var(--hair)]">
          <span className="text-[11px] font-cinzel font-bold text-[var(--gold-dim)] uppercase tracking-wider mb-1">
            Defeito / Fraqueza:
          </span>
          <p className="text-xs text-[var(--text-2)] font-sans m-0 leading-relaxed">
            {defeito || 'A carne definha perante a dúvida e a fraqueza moral.'}
          </p>
        </div>
      </div>

      {/* Edit Modal / Drawer */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--solid-2)] border-2 border-[var(--gold-dim)] p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--hair)] pb-3">
              <h3 className="text-base font-bold font-cinzel text-[var(--gold-bright)] uppercase tracking-wider m-0">
                Editar Biografia do Jurado
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-md text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block text-[var(--gold-bright)] font-semibold mb-1 font-cinzel uppercase tracking-wider">
                  Antecedente:
                </label>
                <textarea
                  rows={3}
                  value={formData.backstory}
                  onChange={(e) => setFormData({ ...formData, backstory: e.target.value })}
                  placeholder="Origem, família, passado sombrio..."
                  className="w-full rounded-xl bg-[var(--solid)] border border-[var(--line)] p-2.5 text-xs text-[var(--text)] font-serif"
                />
              </div>

              <div>
                <label className="block text-[var(--gold-bright)] font-semibold mb-1 font-cinzel uppercase tracking-wider">
                  Vínculo com o Grupo:
                </label>
                <textarea
                  rows={2}
                  value={formData.connection}
                  onChange={(e) => setFormData({ ...formData, connection: e.target.value })}
                  placeholder="Por que caminha ao lado destes jurados..."
                  className="w-full rounded-xl bg-[var(--solid)] border border-[var(--line)] p-2.5 text-xs text-[var(--text)]"
                />
              </div>

              <div>
                <label className="block text-[var(--gold-bright)] font-semibold mb-1 font-cinzel uppercase tracking-wider">
                  Ideal:
                </label>
                <input
                  type="text"
                  value={formData.ideal}
                  onChange={(e) => setFormData({ ...formData, ideal: e.target.value })}
                  placeholder="O princípio que guia cada decisão..."
                  className="w-full rounded-xl bg-[var(--solid)] border border-[var(--line)] p-2.5 text-xs text-[var(--text)]"
                />
              </div>

              <div>
                <label className="block text-[var(--gold-bright)] font-semibold mb-1 font-cinzel uppercase tracking-wider">
                  Defeito:
                </label>
                <input
                  type="text"
                  value={formData.defeito}
                  onChange={(e) => setFormData({ ...formData, defeito: e.target.value })}
                  placeholder="Sua maior vulnerabilidade ou obsessão..."
                  className="w-full rounded-xl bg-[var(--solid)] border border-[var(--line)] p-2.5 text-xs text-[var(--text)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--hair)]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--surface-2)] text-[var(--text-2)] hover:bg-[var(--surface-3)] font-semibold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold font-cinzel text-xs tracking-wider shadow-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
