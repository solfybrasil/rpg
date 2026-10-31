import { supabase } from '../../../shared/supabase';
import type { PlayerNote } from '../types';

const NOTES_COLS = 'id, session_code, character_id, title, body, updated_at';

export async function fetchPlayerNotes(
  characterId: string,
  sessionCode: string = 'MESA',
): Promise<PlayerNote[]> {
  if (!characterId) return [];
  try {
    const code = (sessionCode || 'MESA').toUpperCase();
    const { data, error } = await supabase
      .from('player_notes')
      .select(NOTES_COLS)
      .eq('session_code', code)
      .eq('character_id', characterId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('[NOTES] Erro ao buscar notas do jogador:', error);
      return [];
    }
    return (data as unknown as PlayerNote[]) || [];
  } catch (err) {
    console.warn('[NOTES] Falha de conexão ao buscar notas:', err);
    return [];
  }
}

export async function savePlayerNote(
  note: Partial<PlayerNote> & { character_id: string; session_code?: string },
): Promise<PlayerNote> {
  const row = {
    session_code: (note.session_code || 'MESA').toUpperCase(),
    character_id: note.character_id,
    title: note.title || 'Sem Título',
    body: note.body || '',
    updated_at: new Date().toISOString(),
  };

  if (note.id) {
    const { data, error } = await supabase
      .from('player_notes')
      .update(row)
      .eq('id', note.id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as PlayerNote;
  } else {
    const { data, error } = await supabase.from('player_notes').insert(row).select().single();
    if (error) throw error;
    return data as unknown as PlayerNote;
  }
}

export async function deletePlayerNote(noteId: string): Promise<boolean> {
  const { error } = await supabase.from('player_notes').delete().eq('id', noteId);
  if (error) throw error;
  return true;
}
