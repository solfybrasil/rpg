import { expect, test } from '@playwright/test';
import path from 'node:path';

const outDir = 'C:/Users/leona/.gemini/antigravity/brain/923ad6b2-6bc8-48cf-a653-2f31317976d0';

test.describe('Captura Visual: Screenshots de Design', () => {
  test('Captura Celular Escuro e Pergaminho (390x844)', async ({ browser }) => {
    // 1. Mobile Escuro
    const mobDark = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const pageMD = await mobDark.newPage();
    await pageMD.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'teste_1' }, version: 0 }),
      );
    });
    await pageMD.goto('/jogador/mochila');
    await expect(pageMD.getByText('Mochila de Viagem')).toBeVisible();
    await pageMD.screenshot({ path: path.join(outDir, 'mochila_mobile_dark.png'), fullPage: true });
    await mobDark.close();

    // 2. Mobile Pergaminho
    const mobParch = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const pageMP = await mobParch.newPage();
    await pageMP.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'teste_1' }, version: 0 }),
      );
    });
    await pageMP.goto('/jogador/mochila');
    await pageMP.evaluate(() => document.documentElement.classList.add('theme-parchment'));
    await expect(pageMP.getByText('Mochila de Viagem')).toBeVisible();
    await pageMP.screenshot({ path: path.join(outDir, 'mochila_mobile_parchment.png'), fullPage: true });
    await mobParch.close();
  });

  test('Captura PC Escuro e Pergaminho (1440x900)', async ({ browser }) => {
    // 3. PC Escuro
    const pcDark = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pagePD = await pcDark.newPage();
    await pagePD.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'teste_1' }, version: 0 }),
      );
    });
    await pagePD.goto('/jogador/mochila');
    await expect(pagePD.getByText('Mochila de Viagem')).toBeVisible();
    await pagePD.screenshot({ path: path.join(outDir, 'mochila_pc_dark.png'), fullPage: true });
    await pcDark.close();

    // 4. PC Pergaminho
    const pcParch = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pagePP = await pcParch.newPage();
    await pagePP.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'teste_1' }, version: 0 }),
      );
    });
    await pagePP.goto('/jogador/mochila');
    await pagePP.evaluate(() => document.documentElement.classList.add('theme-parchment'));
    await expect(pagePP.getByText('Mochila de Viagem')).toBeVisible();
    await pagePP.screenshot({ path: path.join(outDir, 'mochila_pc_parchment.png'), fullPage: true });
    await pcParch.close();
  });
});
