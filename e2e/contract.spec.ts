import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve('.env.local');
const envRaw = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const getEnv = (k: string) => {
  const m = envRaw.match(new RegExp(`^${k}=(.*)$`, 'm'));
  return m ? m[1].trim() : process.env[k];
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || '';
const supabaseKey =
  getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_HERO_IDS = ['teste_1', 'teste_2', 'teste_3'];
const REAL_HERO_IDS = ['tor_bjorn', 'malenia', 'kaelis_moonfire'];

async function cleanupTestEntities() {
  await supabase.from('inventory_items').delete().in('character_id', TEST_HERO_IDS);
  await supabase.from('dice_rolls').delete().in('player_id', TEST_HERO_IDS);
  await supabase.from('characters').delete().in('id', TEST_HERO_IDS);
}

test.describe.serial('Fundação & Prompt 01: Santuário Inicial, TV e Isolamento', () => {
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

  test('1. Santuário Inicial: Renderiza brasas, olho místico, lema e os 4 papéis', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');

    // Header & Lema
    await expect(page.getByText('PESTE DO JURAMENTO')).toBeVisible();
    await expect(
      page.getByText('"Toda palavra jurada é uma dívida com o próprio corpo."'),
    ).toBeVisible();

    // 4 Papéis visíveis
    await expect(page.getByRole('heading', { name: 'Tor Bjorn' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Malenia' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Kaelis Moonfire' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'O Mestre' })).toBeVisible();

    // Atalhos TV no rodapé
    await expect(page.getByRole('link', { name: /batalha/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /mesa/i })).toBeVisible();

    // Animações de fundo em canvas presentes
    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThanOrEqual(2); // Embers + Eye

    expect(consoleErrors).toEqual([]);
  });

  test('2. Santuário Inicial: Escolhe Tor e lembra último papel ao recarregar', async ({
    context,
  }) => {
    const page = await context.newPage();
    await page.goto('/');

    // Clica no botão Jogar com Tor
    await page.getByRole('button', { name: 'Jogar com Tor' }).click();

    // Chega na mochila do jogador
    await expect(page).toHaveURL(/\/jogador\/mochila/);
    await expect(page.getByRole('heading', { name: 'Mochila & Inventário' })).toBeVisible();

    // Recarrega a landing page e verifica que lembra a última sessão
    await page.goto('/');
    await expect(page.getByText('Última sessão:')).toBeVisible();
    await expect(page.locator('strong', { hasText: 'Tor Bjorn' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar →' })).toBeVisible();

    await page.close();
  });

  test('3. Santuário Inicial: Escolhe O Mestre e entra na rota certa', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Entrar como Mestre' }).click();

    await expect(page).toHaveURL(/\/mestre/);
    await expect(page.getByText('CONFESSÓRIO')).toBeVisible();
  });

  test('4. Rotas Diretas da TV: /batalha e /mesa funcionam sem redirecionamento quebrado', async ({
    page,
  }) => {
    // Testa /batalha
    await page.goto('/batalha');
    await expect(page.getByRole('heading', { name: 'Mesa de Batalha (TV)' })).toBeVisible();
    await expect(page.getByText('CONFESSÓRIO')).not.toBeVisible();

    // Testa /mesa
    await page.goto('/mesa');
    await expect(page.getByRole('heading', { name: 'Mesa de Batalha & Dados 3D' })).toBeVisible();
    await expect(page.getByText('CONFESSÓRIO')).not.toBeVisible();
  });

  test('5. Mobile Viewport: Sem erros de console e responsivo no celular', async ({
    browser,
  }) => {
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone viewport
    });
    const page = await mobileContext.newPage();
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page.getByText('PESTE DO JURAMENTO')).toBeVisible();

    // Clica no card de Malenia
    await page.getByRole('button', { name: 'Jogar com Malenia' }).click();
    await expect(page).toHaveURL(/\/jogador\/mochila/);

    expect(consoleErrors).toEqual([]);
    await mobileContext.close();
  });

  test('6. Mestre: Altar ao vivo, tira vida de teste_1 com resposta < 1s', async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    await dmPage.goto('/mestre/jogadores');
    await expect(dmPage.getByRole('heading', { name: 'Herói Teste 1' })).toBeVisible();

    // Vida inicial é 20
    const heroCard = dmPage.locator('article', { hasText: 'Herói Teste 1' });
    await expect(heroCard.getByText('20 /20')).toBeVisible();

    const tStart = Date.now();

    // Mestre clica no botão "-" de vida de Herói Teste 1
    const minusBtn = dmPage.getByRole('button', { name: 'Diminuir Vida de Herói Teste 1' });
    await minusBtn.click();

    // UI atualiza imediatamente para 19 /20 de forma otimista em menos de 1s
    await expect(heroCard.getByText('19 /20')).toBeVisible();
    const optimisticElapsed = Date.now() - tStart;
    expect(optimisticElapsed).toBeLessThan(1000);

    // Confirma sincronização no banco Supabase
    let synced = false;
    const syncStart = Date.now();
    while (Date.now() - syncStart < 3000) {
      const { data } = await supabase.from('characters').select('health').eq('id', 'teste_1').single();
      if (data?.health === 19) {
        synced = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    expect(synced).toBe(true);

    // Testa abertura do modal de Dádiva com busca no catálogo
    await heroCard.getByRole('button', { name: 'Dádiva' }).click();
    await expect(dmPage.getByText('Conceder Dádiva a Herói Teste 1')).toBeVisible();
    await dmPage.getByPlaceholder('Buscar item no catálogo oficial...').fill('Espada');
    await dmPage.getByRole('button', { name: 'Cancelar' }).click();

    // Testa abertura da Ficha Completa
    await heroCard.getByTitle('Abrir Detalhe Completo e Mochila').click();
    await expect(dmPage.getByRole('button', { name: 'Ficha & Atributos' })).toBeVisible();
    await dmPage.getByRole('button', { name: 'Fechar' }).click();

    await dmContext.close();
  });
});
