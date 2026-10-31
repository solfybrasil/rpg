export interface PlayerNote {
  id: string;
  session_code: string;
  character_id: string;
  title: string;
  body: string;
  updated_at: string;
}

export type SaveStatus = 'Salvo' | 'Salvando...' | 'Erro ao salvar';
