import path from 'node:path';
import { expect, test } from '@playwright/test';

const outDir = 'C:/Users/leona/.gemini/antigravity/brain/923ad6b2-6bc8-48cf-a653-2f31317976d0';
const refHtmlPath = 'file:///C:/Users/leona/OneDrive/%C3%81rea%20de%20Trabalho/0102/imagem%20rpg/referencia_painel.html';

test.describe('Captura Visual: Design Pedra e Pergaminho', () => {
  test('Captura todas as telas do novo design e compara com referencia_painel.html', async ({
    browser,
  }) => {
    test.setTimeout(180000);

    const page = await browser.newPage();

    // 1. Captura da Referência Oficial
    try {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(refHtmlPath, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outDir, 'pedra_referencia_painel.png') });
    } catch (e) {
      console.warn('Aviso ao carregar referencia_painel.html:', e);
    }

    // 2. Rota /design no Celular (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/design', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Pedra e Pergaminho')).toBeVisible();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, 'pedra_design_mobile.png'), fullPage: true });

    // 3. Rota /design no PC (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, 'pedra_design_pc.png'), fullPage: true });

    // 4. Entrada / Santuário no Celular (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('PESTE DO JURAMENTO')).toBeVisible();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, 'pedra_entrada_mobile.png'), fullPage: true });

    // 5. Entrada / Santuário no PC (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, 'pedra_entrada_pc.png') });

    // 6. Layout do Jogador com HUD no Celular (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'tor_bjorn' }, version: 0 }),
      );
    });
    await page.goto('/jogador/mochila', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'pedra_jogador_hud_mobile.png'), fullPage: true });

    // 7. Layout do Jogador com HUD no PC (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, 'pedra_jogador_hud_pc.png') });

    await page.close();
  });
});
