export interface Missive {
  id: string;
  session_code: string;
  from_id?: string | null;
  to_id?: string | null;
  from_name?: string | null;
  text: string;
  priority?: string | null;
  read?: boolean | null;
  created_at: string;
}

export interface SendMissiveParams {
  sessionCode?: string;
  fromId?: string | null;
  toId?: string | null;
  fromName?: string | null;
  text: string;
  priority?: string;
}
