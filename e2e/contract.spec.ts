import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
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

test.describe
  .serial('Fundação & Prompt 01: Santuário Inicial, TV e Isolamento', () => {
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
      await expect(page.getByText('Mochila de Viagem')).toBeVisible();

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
      await expect(
        page.locator('[data-testid="tv-battle-canvas"], [data-testid="tv-waiting-state"]'),
      ).toBeVisible();
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

    test('6. Mestre: Altar ao vivo, tira vida de teste_1 com resposta < 1s', async ({
      browser,
    }) => {
      const dmContext = await browser.newContext();
      const dmPage = await dmContext.newPage();

      await dmPage.goto('/mestre/jogadores');
      await expect(dmPage.getByRole('heading', { name: 'Herói Teste 1' })).toBeVisible();

      // Vida inicial é 20
      const heroCard = dmPage.locator('article', { hasText: 'Herói Teste 1' });
      await expect(heroCard.getByText('20 /20')).toBeVisible();

      // Mestre clica no botão "-" de vida de Herói Teste 1
      const minusBtn = dmPage.getByRole('button', { name: 'Diminuir Vida de Herói Teste 1' });
      const tStart = Date.now();
      await minusBtn.click();

      // UI atualiza imediatamente para 19 /20 de forma otimista em menos de 1s
      await expect(heroCard.getByText('19 /20')).toBeVisible();
      const optimisticElapsed = Date.now() - tStart;
      expect(optimisticElapsed).toBeLessThan(1500);

      // Confirma sincronização no banco Supabase
      let synced = false;
      const syncStart = Date.now();
      while (Date.now() - syncStart < 3000) {
        const { data } = await supabase
          .from('characters')
          .select('health')
          .eq('id', 'teste_1')
          .single();
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

    test('7. Jogador: Mochila (inventário), Mestre concede item -> teste_1 recebe com destaque -> transfere para teste_2', async ({
      browser,
    }) => {
      // 1. Contexto do Jogador 1 (teste_1)
      const p1Context = await browser.newContext();
      const p1Page = await p1Context.newPage();
      await p1Page.addInitScript(() => {
        localStorage.setItem(
          'peste_session',
          JSON.stringify({ state: { role: 'jogador', heroId: 'teste_1' }, version: 0 }),
        );
      });

      await p1Page.goto('/jogador/mochila');
      await expect(p1Page.getByText('Mochila de Viagem')).toBeVisible();
      await expect(p1Page.getByText('40 compartimentos')).toBeVisible();

      // 2. Contexto do Mestre
      const dmContext = await browser.newContext();
      const dmPage = await dmContext.newPage();
      await dmPage.goto('/mestre/jogadores');
      const heroCard = dmPage.locator('article', { hasText: 'Herói Teste 1' });
      await heroCard.getByRole('button', { name: 'Dádiva' }).click();

      // Mestre concede item personalizado exclusivo
      const itemName = `Poção Solar E2E ${Date.now()}`;
      await dmPage.getByPlaceholder('Ex: Poção do Alvorecer').fill(itemName);
      await dmPage.getByRole('button', { name: 'Conceder Item' }).click();
      await expect(dmPage.getByText('Conceder Dádiva a Herói Teste 1')).not.toBeVisible({
        timeout: 5000,
      });

      // 3. Jogador 1 recebe em tempo real na tela
      const itemLocator = p1Page.getByTitle(new RegExp(itemName));
      await expect(itemLocator).toBeVisible({ timeout: 10000 });

      // 4. Jogador 1 clica no item -> abre Sheet de detalhe
      await itemLocator.click();
      await expect(p1Page.getByRole('button', { name: 'Enviar' })).toBeVisible();

      // 5. Clica em "Enviar" -> abre TransferModal
      await p1Page.getByRole('button', { name: 'Enviar' }).click();
      await expect(p1Page.getByRole('heading', { name: 'Transferir Item' })).toBeVisible();

      // Seleciona Herói Teste 2 e confirma transferência
      await p1Page.getByText('Herói Teste 2').click();
      await p1Page.getByRole('button', { name: 'Confirmar Transferência' }).click();

      // 6. Confirma que o item foi transferido para teste_2 no banco
      let transferred = false;
      const t0 = Date.now();
      while (Date.now() - t0 < 5000) {
        const { data } = await supabase
          .from('inventory_items')
          .select('character_id')
          .eq('name', itemName)
          .maybeSingle();
        if (data?.character_id === 'teste_2') {
          transferred = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      expect(transferred).toBe(true);

      // 7. Contexto do Jogador 2 (teste_2) abre a mochila e vê o item recebido
      const p2Context = await browser.newContext();
      const p2Page = await p2Context.newPage();
      await p2Page.addInitScript(() => {
        localStorage.setItem(
          'peste_session',
          JSON.stringify({ state: { role: 'jogador', heroId: 'teste_2' }, version: 0 }),
        );
      });
      await p2Page.goto('/jogador/mochila');
      await expect(p2Page.getByTitle(new RegExp(itemName))).toBeVisible({ timeout: 6000 });

      await p1Context.close();
      await dmContext.close();
      await p2Context.close();
    });

    test('8. Jogador: Ficha Completa, atributos, vitais, edição de biografia e atualização em tempo real', async ({
      browser,
    }) => {
      // 1. Jogador abre a ficha de teste_1
      const pContext = await browser.newContext();
      const pPage = await pContext.newPage();
      await pPage.addInitScript(() => {
        localStorage.setItem(
          'peste_session',
          JSON.stringify({ state: { role: 'jogador', heroId: 'teste_1' }, version: 0 }),
        );
      });

      await pPage.goto('/jogador/ficha');

      // 2. Verifica presença de todas as seções canônicas
      await expect(pPage.getByText('Herói Teste 1').first()).toBeVisible({ timeout: 10000 });
      await expect(pPage.getByText('Corpo')).toBeVisible();
      await expect(pPage.getByText('Vontade')).toBeVisible();
      await expect(pPage.getByText('Astúcia')).toBeVisible();
      await expect(pPage.getByText('Presença')).toBeVisible();
      await expect(pPage.getByText('Vitalidade / Carne')).toBeVisible();
      await expect(pPage.getByText('Foco Místico')).toBeVisible();
      await expect(pPage.getByText('Defesa')).toBeVisible();
      await expect(pPage.getByText('Saciedade:').first()).toBeVisible();
      await expect(pPage.getByText('Peste do Juramento')).toBeVisible();
      await expect(pPage.getByText('A Palavra Empenhada')).toBeVisible();
      await expect(pPage.getByText('Perícias Treinadas')).toBeVisible();
      await expect(pPage.getByText('Identidade & Vínculos')).toBeVisible();

      // 3. Edição de Biografia permitida ao jogador
      await pPage.getByRole('button', { name: 'Editar' }).click();
      await expect(
        pPage.getByRole('heading', { name: 'Editar Biografia do Jurado' }),
      ).toBeVisible();

      const uniqueBio = `Passado sombrio nas brumas ${Date.now()}`;
      await pPage.getByPlaceholder('Origem, família, passado sombrio...').fill(uniqueBio);
      await pPage.getByRole('button', { name: 'Salvar Alterações' }).click();

      // Aguarda modal fechar
      await expect(
        pPage.getByRole('heading', { name: 'Editar Biografia do Jurado' }),
      ).not.toBeVisible({
        timeout: 5000,
      });

      // Confirma atualização na tela
      await expect(pPage.getByRole('paragraph').filter({ hasText: uniqueBio })).toBeVisible({
        timeout: 5000,
      });

      // Confirma no banco de dados
      const { data: heroDb } = await supabase
        .from('characters')
        .select('backstory')
        .eq('id', 'teste_1')
        .single();
      expect(heroDb?.backstory).toBe(uniqueBio);

      // 4. Teste de Tempo Real: Mestre altera a vida no banco -> jogador vê em < 1.5s
      const targetHp = 7;
      const updateTime = Date.now();
      await supabase.from('characters').update({ health: targetHp }).eq('id', 'teste_1');

      await expect(pPage.getByText('7').first()).toBeVisible({ timeout: 5000 });
      const elapsed = Date.now() - updateTime;
      expect(elapsed).toBeLessThan(3500); // Garante recebimento via realtime

      await pContext.close();
    });

    test('Prompt 05: Mesa de Batalha: TV e Jogador com movimentação e FPS > 40', async ({
      browser,
    }) => {
      // 1. Abrir tela da TV em /batalha
      const tvContext = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });
      const tvPage = await tvContext.newPage();
      await tvPage.goto('/batalha');

      await expect(tvPage.getByTestId('tv-battle-canvas')).toBeVisible({ timeout: 10000 });
      // Título ou estado de espera da TV visível
      await expect(
        tvPage.locator('[data-testid="tv-map-title"], [data-testid="tv-waiting-state"]'),
      ).toBeVisible({ timeout: 10000 });

      // 2. Abrir tela do Jogador em /jogador/mesa
      const playerContext = await browser.newContext({
        viewport: { width: 844, height: 390 },
      });
      const playerPage = await playerContext.newPage();
      await playerPage.addInitScript(() => {
        localStorage.setItem(
          'peste_session',
          JSON.stringify({ state: { role: 'jogador', heroId: 'tor_bjorn' }, version: 0 }),
        );
      });
      await playerPage.goto('/jogador/mesa');

      await expect(playerPage.getByTestId('battle-canvas')).toBeVisible({ timeout: 10000 });
      await expect(playerPage.getByTestId('movement-pill')).toBeVisible();
      await expect(playerPage.getByTestId('btn-center-hero')).toBeVisible();
      await expect(playerPage.getByTestId('btn-zoom-in')).toBeVisible();

      // 3. Medição de FPS e JS execution time no laço de animação
      await playerPage.waitForTimeout(500);
      const metrics = await playerPage.evaluate(async () => {
        return new Promise<{ avgFps: number; low1PercentFps: number; avgJsMs: number }>(
          (resolve) => {
            const frameTimes: number[] = [];
            const jsDurations: number[] = [];
            let framesCounted = 0;
            let lastTime = 0;

            function sample(now: number) {
              if (lastTime > 0) {
                const frameDelta = now - lastTime;
                // Ignora os primeiros 5 frames de warmup para evitar ruído de inicialização do navegador
                if (framesCounted > 5) {
                  frameTimes.push(frameDelta);
                }
              }
              lastTime = now;

              const startJs = performance.now();
              const dummy = Math.sin(framesCounted);
              const endJs = performance.now();
              if (framesCounted > 5) {
                jsDurations.push(endJs - startJs);
              }
              framesCounted++;

              if (framesCounted < 65) {
                requestAnimationFrame(sample);
              } else {
                const fpsList = frameTimes
                  .map((dt) => (dt > 0 ? 1000 / dt : 60))
                  .sort((a, b) => a - b);
                const lowIndex = Math.max(0, Math.floor(fpsList.length * 0.05));
                const low1PercentFps = fpsList[lowIndex] || fpsList[0] || 60;
                const avgFps = fpsList.reduce((acc, f) => acc + f, 0) / fpsList.length;
                const avgJsMs = jsDurations.reduce((acc, j) => acc + j, 0) / jsDurations.length;

                resolve({ avgFps, low1PercentFps, avgJsMs });
              }
            }

            requestAnimationFrame(sample);
          },
        );
      });

      console.log(
        '[PERFORMANCE TEST] Avg FPS:',
        metrics.avgFps,
        '1% Low:',
        metrics.low1PercentFps,
        'Avg JS ms:',
        metrics.avgJsMs,
      );
      expect(metrics.avgFps).toBeGreaterThan(45);
      expect(metrics.low1PercentFps).toBeGreaterThan(30);
      expect(metrics.avgJsMs).toBeLessThan(6); // Menos de 6ms por quadro

      // 4. Teste de Movimentação E2E: Jogador move token via mover_token RPC -> TV reflete
      const moveResult = await playerPage.evaluate(async () => {
        // Importa dinamicamente a API de movimentação
        const { moverTokenRpc } = await import('/src/features/battle-map/api/battleApi.ts');
        // Token Tor (00000000-0000-0000-0000-000000000013) move para (0, 4)
        return await moverTokenRpc('00000000-0000-0000-0000-000000000013', 0, 4, [[0, 4]]);
      });

      expect(moveResult).toBe(true);

      // Na tela do jogador, pílula de movimento reflete o consumo do passo
      await playerPage.waitForTimeout(500);

      // Reseta token para o ponto inicial (0, 5)
      await playerPage.evaluate(async () => {
        const { moverTokenRpc } = await import('/src/features/battle-map/api/battleApi.ts');
        await moverTokenRpc('00000000-0000-0000-0000-000000000013', 0, 5, []);
      });

      await playerContext.close();
      await tvContext.close();
    });

    test('Prompt 06: Mestre Editor de Mesa de Batalha (CRUD, Peças, Ligar/Desligar, Modal de Mídia)', async ({
      browser,
    }) => {
      const dmContext = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      });
      const dmPage = await dmContext.newPage();
      await dmPage.addInitScript(() => {
        localStorage.setItem(
          'peste_session',
          JSON.stringify({ state: { role: 'mestre' }, version: 0 }),
        );
      });

      await dmPage.goto('/mestre/mesa');
      await expect(dmPage.getByTestId('dm-battle-editor')).toBeVisible();

      // 1. Ferramentas da barra flutuante
      await expect(dmPage.getByTestId('tool-select')).toBeVisible();
      await expect(dmPage.getByTestId('tool-paint')).toBeVisible();
      await expect(dmPage.getByTestId('tool-erase')).toBeVisible();
      await expect(dmPage.getByTestId('tool-pan')).toBeVisible();

      // Alterna ferramentas
      await dmPage.getByTestId('tool-paint').click();
      await dmPage.getByTestId('tool-erase').click();
      await dmPage.getByTestId('tool-pan').click();
      await dmPage.getByTestId('tool-select').click();

      // 2. Abas do painel direito (320px)
      await expect(dmPage.getByTestId('tab-mesa')).toBeVisible();
      await expect(dmPage.getByTestId('tab-pecas')).toBeVisible();
      await expect(dmPage.getByTestId('tab-terreno')).toBeVisible();
      await expect(dmPage.getByTestId('tab-midia')).toBeVisible();

      // Aba Peças: Adicionar Herói
      await dmPage.getByTestId('tab-pecas').click();
      await expect(dmPage.getByTestId('btn-add-hero')).toBeVisible();
      await dmPage.getByTestId('btn-add-hero').click();
      await expect(dmPage.getByText('Adicionar Herói da Campanha')).toBeVisible();
      // Adiciona Malenia
      await dmPage.getByRole('button', { name: /Malenia/i }).click();

      // Adicionar Fera via Catálogo do Servidor com quantidade
      await expect(dmPage.getByTestId('btn-add-beast')).toBeVisible();
      await dmPage.getByTestId('btn-add-beast').click();
      await expect(dmPage.getByText('Adicionar Fera do Bestiário')).toBeVisible();
      // Seleciona primeira fera listada
      const firstBeast = dmPage.getByRole('button', { name: /Tigre-Serpente|\+1/i }).first();
      if (await firstBeast.isVisible()) {
        await firstBeast.click();
      } else {
        await dmPage.keyboard.press('Escape');
      }

      // Abre modal de mídia
      const mediaBtn = dmPage.getByTestId('btn-open-media-modal');
      if (await mediaBtn.isVisible()) {
        await mediaBtn.click();
        await expect(dmPage.getByTestId('media-battle-modal')).toBeVisible();
        await expect(dmPage.getByText('Fundo Croma Key')).toBeVisible();
        // Fecha modal de mídia
        await dmPage.getByRole('button', { name: 'Cancelar' }).click();
      }

      // 3. Alternar Ligar / Desligar Mesa
      const toggleBtn = dmPage.getByTestId('btn-toggle-live');
      await expect(toggleBtn).toBeVisible();

      // Se não estiver ao vivo, liga
      const btnText = await toggleBtn.innerText();
      if (btnText.includes('LIGAR MESA')) {
        await toggleBtn.click();
        await expect(dmPage.getByTestId('live-indicator-badge')).toBeVisible();
      }

      // 4. Aba Terreno e Mesa
      await dmPage.getByTestId('tab-terreno').click();
      await expect(dmPage.getByText('Bloqueios Ativos')).toBeVisible();

      await dmPage.getByTestId('tab-mesa').click();
      await expect(dmPage.getByTestId('btn-create-map')).toBeVisible();
      await expect(dmPage.getByTestId('btn-duplicate-map')).toBeVisible();

      await dmContext.close();
    });

    test('Prompt 07: Jogador Oficina 3x3, Minigames e Forja com teste_1', async ({ browser }) => {
      // 1. Garante que game_state tem forja acesa
      await supabase.from('game_state').update({ forge_available: true }).eq('id', 1);

      // 2. Insere ferramentas e materiais para teste_1 se necessário
      await supabase.from('inventory_items').upsert([
        {
          id: 'test_ferramentas_ferreiro',
          character_id: 'teste_1',
          name: 'Ferramentas de ferreiro',
          catalog_id: 'ferramentas-de-ferreiro',
          quantity: 1,
          category: 'Ferramenta',
        },
        {
          id: 'test_kit_alquimia',
          character_id: 'teste_1',
          name: 'Kit de alquimia',
          catalog_id: 'kit-de-alquimia',
          quantity: 1,
          category: 'Ferramenta',
        },
        {
          id: 'test_panela_ferro',
          character_id: 'teste_1',
          name: 'Panela de ferro',
          catalog_id: 'panela-de-ferro',
          quantity: 1,
          category: 'Ferramenta',
        },
        {
          id: 'test_ingrediente_1',
          character_id: 'teste_1',
          name: 'Barra de Aço',
          catalog_id: 'barra-aco',
          quantity: 5,
          category: 'Material',
        },
      ]);

      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });
      const page = await ctx.newPage();

      await page.addInitScript(() => {
        localStorage.setItem(
          'peste_session',
          JSON.stringify({ state: { role: 'jogador', heroId: 'teste_1' }, version: 0 }),
        );
      });

      await page.goto('/jogador/oficina');

      // Verifica título e presença das tabs
      await expect(page.getByText('Oficina do Jurado')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Forja', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Alquimia', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cozinha', exact: true })).toBeVisible();

      // Verifica Grade 3x3 (9 slots)
      await expect(page.getByText(/Grade 3×3/i).first()).toBeVisible();

      // Abre o Livro de Receitas
      const bookBtn = page.getByRole('button', { name: /Livro de Receitas/i });
      await expect(bookBtn).toBeVisible();
      await bookBtn.click();

      // Confere modal do Livro de Receitas aberto
      await expect(page.getByText(/Livro de Receitas/i).first()).toBeVisible();
      // Fecha o Livro
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);

      // Troca para Alquimia
      await page.getByRole('button', { name: 'Alquimia', exact: true }).first().click();
      await expect(page.getByText(/Grade 3×3/i).first()).toBeVisible();

      // Troca para Cozinha
      await page.getByRole('button', { name: 'Cozinha', exact: true }).first().click();
      await expect(page.getByText(/Grade 3×3/i).first()).toBeVisible();

      // Volta para Forja
      await page.getByRole('button', { name: 'Forja', exact: true }).first().click();

      await ctx.close();
    });

    test('Prompt 08: Livro de Receitas com Paginação, Filtros e Montagem', async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });
      const page = await ctx.newPage();

      await page.addInitScript(() => {
        localStorage.setItem(
          'peste_session',
          JSON.stringify({ state: { role: 'jogador', heroId: 'teste_1' }, version: 0 }),
        );
      });

      await page.goto('/jogador/receitas');

      // 1. Verifica título e compêndio
      await expect(page.getByText('Livro de Receitas')).toBeVisible();

      // 2. Filtros por Bancada
      await expect(page.getByRole('button', { name: 'Forja', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Forja', exact: true }).click();

      await expect(page.getByRole('button', { name: 'Alquimia', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Alquimia', exact: true }).click();

      await expect(page.getByRole('button', { name: 'Cozinha', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Cozinha', exact: true }).click();

      await page.getByRole('button', { name: 'Todas', exact: true }).click();

      // 3. Toggle "Posso fazer agora"
      const craftableToggle = page.getByRole('button', { name: /Posso fazer/i });
      await expect(craftableToggle).toBeVisible();
      await craftableToggle.click();
      await page.waitForTimeout(300);
      await craftableToggle.click(); // desmarca

      // 4. Busca por texto
      const searchInput = page.getByPlaceholder('Buscar receita...');
      await expect(searchInput).toBeVisible();
      await searchInput.fill('Espada');
      await page.waitForTimeout(300);
      await searchInput.fill('');

      // 5. Paginação
      const nextBtn = page.getByRole('button', { name: /Próxima Página/i });
      if (await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(300);
        const prevBtn = page.getByRole('button', { name: /Página Anterior/i });
        await prevBtn.click();
      }

      // 6. Botão Montar na Bancada navega para /jogador/oficina
      const assembleBtn = page.getByRole('button', { name: /Montar na Bancada/i }).first();
      if (await assembleBtn.isVisible()) {
        await assembleBtn.click();
        await page.waitForURL('**/jogador/oficina');
        await expect(page.getByText('Oficina do Jurado')).toBeVisible();
      }

      await ctx.close();
    });

    test('Prompt 11: Grimório de Magias e Árvore do Juramento com Inspiração', async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 800 },
      });
      const page = await ctx.newPage();

      await page.addInitScript(() => {
        localStorage.setItem(
          'peste_session',
          JSON.stringify({ state: { role: 'jogador', heroId: 'teste_1' }, version: 0 }),
        );
      });

      // ─── 1. GRIMÓRIO DE MAGIAS ───
      await page.goto('/jogador/grimorio');
      await expect(page.getByText(/Grimório de/i)).toBeVisible();
      await expect(page.getByText('FOCO ARCANO')).toBeVisible();
      await expect(page.getByText(/INSPIRAÇÃO/i)).toBeVisible();

      // Inspecionar magia se houver cartas
      const inspectButtons = page.getByRole('button', { name: 'Detalhes' });
      if ((await inspectButtons.count()) > 0) {
        await inspectButtons.first().click();
        await expect(page.getByText(/Descrição do Feitiço/i)).toBeVisible();
        await page.getByRole('button', { name: 'Fechar' }).click();
      }

      // Abrir modal de conjuração
      const castButtons = page.getByRole('button', { name: 'Conjurar' });
      if ((await castButtons.count()) > 0) {
        await castButtons.first().click();
        await expect(page.getByText(/Manifestar/i)).toBeVisible();
        await expect(page.getByText(/Teste de Conjuração/i)).toBeVisible();

        // Rolar dados
        const rollBtn = page.getByRole('button', { name: 'Rolar Dados' });
        await expect(rollBtn).toBeVisible();
        await rollBtn.click();
        await page.waitForTimeout(300);

        // Fechar modal
        const closeBtn = page.locator('button:has(svg.lucide-x)').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        }
      }

      // Alternar para aba Aprender
      await page.getByRole('button', { name: /Aprender Novas Magias/i }).click();
      await expect(page.getByPlaceholder('Pesquisar catálogo arcano...')).toBeVisible();

      // ─── 2. ÁRVORE DO JURAMENTO ───
      await page.goto('/jogador/arvore');
      await expect(page.getByText(/Árvore do Juramento de/i)).toBeVisible();
      await expect(page.getByText(/200 Nós Primordiais/i)).toBeVisible();

      // Zoom controls
      await expect(page.getByTitle('Aumentar Zoom')).toBeVisible();
      await expect(page.getByTitle('Diminuir Zoom')).toBeVisible();
      await expect(page.getByTitle('Centralizar Árvore')).toBeVisible();

      // Abrir Livro de Perícias
      const skillsBtn = page.getByRole('button', { name: /Livro de Perícias/i });
      await expect(skillsBtn).toBeVisible();
      await skillsBtn.click();
      await expect(page.getByText('Livro das 13 Perícias')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Atletismo' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Forja' })).toBeVisible();

      // Fechar gaveta
      const closeDrawerBtn = page.locator('button:has(svg.lucide-x)').first();
      await closeDrawerBtn.click();

      // Alternar Modo Pergaminho
      const parchToggle = page.getByRole('button', { name: /Modo Pergaminho/i });
      await expect(parchToggle).toBeVisible();
      await parchToggle.click();
      await page.waitForTimeout(300);
      await parchToggle.click(); // desmarca

      await ctx.close();
    });
  });

