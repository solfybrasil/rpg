import { test, expect } from '@playwright/test';
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
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_HERO_IDS = ['teste_1', 'teste_2', 'teste_3'];
const REAL_HERO_IDS = ['tor_bjorn', 'malenia', 'kaelis_moonfire'];

async function cleanupTestEntities() {
  await supabase.from('inventory_items').delete().in('character_id', TEST_HERO_IDS);
  await supabase.from('dice_rolls').delete().in('player_id', TEST_HERO_IDS);
  await supabase.from('characters').delete().in('id', TEST_HERO_IDS);
}

test.describe.serial('Fundação: Contratos de Navegação, Layouts e Isolamento dos Heróis Reais', () => {
  test.beforeAll(async () => {
    await cleanupTestEntities();

    const baseTemplate = {
      racial_trait: 'Traço de Teste',
      oath_type: 'Lealdade',
      oath: 'Juramento de teste automatizado',
      oath_power: 'Poder de teste automatizado',
      oath_item: 'Relíquia de teste',
      backstory: 'História de teste',
      connection: 'Conexão de teste',
      caminho: 'guerreiro',
      level: 1,
      xp: 0,
      gift: 'Dom de Teste',
      plague_gifts: [],
      inspiration: 0,
      conditions: [],
      death_saves: { f: 0, s: 0 },
      oath_tree: {},
    };

    const testHeroes = [
      {
        ...baseTemplate,
        id: 'teste_1',
        name: 'Herói Teste 1',
        title: 'Jurado de Teste I',
        race: 'Humano',
        race_id: 'humano',
        attributes: { corpo: 2, astucia: 2, vontade: 1, presenca: 1 },
        health: 20,
        max_health: 20,
        focus: 5,
        max_focus: 5,
        plague: 0,
        defense: 10,
        coins_bronze: 2500,
        session_code: 'MESA',
        player_id: 'teste_1',
        character_id: 'teste_1',
        alive: true,
        active: true,
        gear: [],
        skills: [{ name: 'Forja', bonus: 1 }],
      },
      {
        ...baseTemplate,
        id: 'teste_2',
        name: 'Herói Teste 2',
        title: 'Jurado de Teste II',
        race: 'Anão',
        race_id: 'anao',
        attributes: { corpo: 3, astucia: 1, vontade: 1, presenca: 0 },
        health: 22,
        max_health: 22,
        focus: 4,
        max_focus: 4,
        plague: 0,
        defense: 11,
        coins_bronze: 1000,
        session_code: 'MESA',
        player_id: 'teste_2',
        character_id: 'teste_2',
        alive: true,
        active: true,
        gear: [],
        skills: [{ name: 'Atletismo', bonus: 1 }],
      },
      {
        ...baseTemplate,
        id: 'teste_3',
        name: 'Herói Teste 3',
        title: 'Jurado de Teste III',
        race: 'Elfo',
        race_id: 'elfo',
        attributes: { corpo: 1, astucia: 3, vontade: 2, presenca: 1 },
        health: 16,
        max_health: 16,
        focus: 8,
        max_focus: 8,
        plague: 0,
        defense: 9,
        coins_bronze: 5000,
        session_code: 'MESA',
        player_id: 'teste_3',
        character_id: 'teste_3',
        alive: true,
        active: true,
        gear: [],
        skills: [{ name: 'Arcanismo', bonus: 2 }],
      },
    ];

    const { error } = await supabase.from('characters').insert(testHeroes);
    if (error) console.error('Erro ao inserir heróis de teste:', error.message);
  });

  test.afterAll(async () => {
    await cleanupTestEntities();

    // Verificação de segurança: os heróis reais da campanha não podem ter sido apagados
    const { data: realHeroes, error } = await supabase
      .from('characters')
      .select('id, name')
      .in('id', REAL_HERO_IDS);

    expect(error).toBeNull();
    expect(realHeroes?.length).toBe(3);
  });

  test('1. Entrada: Seleção de Papéis na Landing Page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('ESCOLHA SEU PAPEL NA MESA')).toBeVisible();
    await expect(page.getByText('Mestre do Jogo')).toBeVisible();
    await expect(page.getByText('Tela TV / Mesa')).toBeVisible();
    await expect(page.getByText('Tor-Björn')).toBeVisible();
    await expect(page.getByText('Malênia')).toBeVisible();
    await expect(page.getByText('Kaelis Moonfire')).toBeVisible();
  });

  test('2. MestreLayout: Navegação pelo menu lateral do Confessório', async ({ browser }) => {
    const dmContext = await browser.newContext();
    const page = await dmContext.newPage();

    await page.goto('/mestre/jogadores');
    await expect(page.getByText('CONFESSÓRIO')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Painel dos Jogadores' })).toBeVisible();

    // Navega para Editor da Mesa
    await page.getByRole('link', { name: 'Editor da Mesa' }).click();
    await expect(page.getByRole('heading', { name: 'Editor da Mesa de Batalha' })).toBeVisible();

    // Navega para Bestiário
    await page.getByRole('link', { name: 'Bestiário' }).click();
    await expect(page.getByRole('heading', { name: 'Bestiário & Criaturas' })).toBeVisible();

    // Navega para Catálogo de Itens
    await page.getByRole('link', { name: 'Catálogo de Itens' }).click();
    await expect(page.getByRole('heading', { name: 'Catálogo Geral de Itens' })).toBeVisible();

    await dmContext.close();
  });

  test('3. JogadorLayout: Navegação por abas inferiores e gaveta Mais', async ({ browser }) => {
    const playerContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone viewport
    });
    const page = await playerContext.newPage();

    // Entra como Malênia pela tela inicial
    await page.goto('/');
    await page.getByText('Malênia').click();

    // Confirma redirecionamento para /jogador/mochila
    await expect(page.getByRole('heading', { name: 'Mochila & Inventário' })).toBeVisible();

    // Navega para Ficha
    await page.getByRole('link', { name: 'Ficha' }).click();
    await expect(page.getByRole('heading', { name: 'Ficha do Personagem' })).toBeVisible();

    // Navega para Grimório
    await page.getByRole('link', { name: 'Grimório' }).click();
    await expect(page.getByRole('heading', { name: 'Grimório de Magias' })).toBeVisible();

    // Navega para Oficina
    await page.getByRole('link', { name: 'Oficina' }).click();
    await expect(page.getByRole('heading', { name: 'Oficina (Forja, Alquimia & Cozinha)' })).toBeVisible();

    // Navega para Combate
    await page.getByRole('link', { name: 'Combate' }).click();
    await expect(page.getByRole('heading', { name: 'Combate por Turnos & Arena' })).toBeVisible();

    // Abre gaveta Mais
    await page.getByRole('button', { name: 'Mais' }).click();
    await expect(page.getByText('OUTROS MÓDULOS')).toBeVisible();
    await page.getByRole('link', { name: 'Árvore do Juramento' }).click();
    await expect(page.getByRole('heading', { name: 'Árvore do Juramento' })).toBeVisible();

    await playerContext.close();
  });

  test('4. TvLayout: Tela cheia sem menus', async ({ page }) => {
    await page.goto('/tv');
    await expect(page.getByRole('heading', { name: 'Exibição TV da Mesa' })).toBeVisible();
    // Confirma que barra de navegação do jogador ou lateral do mestre não existem na TV
    await expect(page.getByText('CONFESSÓRIO')).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Mochila' })).not.toBeVisible();
  });
});
