import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve('.env.local');
const envRaw = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const getEnv = (k: string) => {
  const m = envRaw.match(new RegExp(`^${k}=(.*)$`, 'm'));
  return m ? m[1].trim() : process.env[k];
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || '';
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY') || '';
const battleUrl = getEnv('VITE_BATTLE_SUPABASE_URL') || 'https://ngwexiqejyfsfnhtnrhf.supabase.co';
const battleKey = getEnv('VITE_BATTLE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nd2V4aXFlanlmc2ZuaHRucmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDU3NTgsImV4cCI6MjA5MzQ4MTc1OH0.Q8zUGKrQIiuVHskdYrg069h5vlce_L2lSUwb2LgQJUo';

if (!supabaseUrl || !supabaseKey) {
  console.warn('[BACKUP] Chaves do Supabase não encontradas. Ignorando backup.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const battleSupabase = createClient(battleUrl, battleKey);

async function runBackup() {
  const today = new Date().toISOString().slice(0, 10);
  const outDir = path.resolve('backups', today);
  fs.mkdirSync(outDir, { recursive: true });

  const tables = ['characters', 'inventory_items', 'game_state'];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*');
    if (error) {
      console.warn(`[BACKUP] Aviso ao exportar ${t}:`, error.message);
      continue;
    }
    const outFile = path.join(outDir, `${t}.json`);
    fs.writeFileSync(outFile, JSON.stringify(data || [], null, 2), 'utf8');
    console.log(`[BACKUP] ${t}: ${data?.length ?? 0} registros salvos em ${outFile}`);
  }

  // Backup das tabelas de batalha
  const battleTables = ['battle_maps', 'battle_tokens'];
  for (const bt of battleTables) {
    const { data, error } = await battleSupabase.from(bt).select('*');
    if (error) {
      console.warn(`[BACKUP] Aviso ao exportar ${bt}:`, error.message);
      continue;
    }
    const outFile = path.join(outDir, `${bt}.json`);
    fs.writeFileSync(outFile, JSON.stringify(data || [], null, 2), 'utf8');
    console.log(`[BACKUP] ${bt}: ${data?.length ?? 0} registros salvos em ${outFile}`);
  }
}

runBackup().catch((e) => {
  console.error('[BACKUP ERROR]', e);
  process.exit(1);
});
