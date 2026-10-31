import path from 'node:path';
import { expect, test } from '@playwright/test';

const outDir = 'C:/Users/leona/.gemini/antigravity/brain/923ad6b2-6bc8-48cf-a653-2f31317976d0';

test.describe('Captura Visual: Screenshots de Design', () => {
  test('Captura Mochila Celular Escuro e Pergaminho (390x844)', async ({ browser }) => {
    // 1. Mobile Escuro Mochila
    const mobDark = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const pageMD = await mobDark.newPage();
    await pageMD.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'tor_bjorn' }, version: 0 }),
      );
    });
    await pageMD.goto('/jogador/mochila');
    await expect(pageMD.getByText('Mochila de Viagem')).toBeVisible();
    await pageMD.screenshot({ path: path.join(outDir, 'mochila_mobile_dark.png'), fullPage: true });
    await mobDark.close();

    // 2. Mobile Pergaminho Mochila
    const mobParch = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const pageMP = await mobParch.newPage();
    await pageMP.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'tor_bjorn' }, version: 0 }),
      );
    });
    await pageMP.goto('/jogador/mochila');
    await pageMP.evaluate(() => document.documentElement.classList.add('theme-parchment'));
    await expect(pageMP.getByText('Mochila de Viagem')).toBeVisible();
    await pageMP.screenshot({
      path: path.join(outDir, 'mochila_mobile_parchment.png'),
      fullPage: true,
    });
    await mobParch.close();
  });

  test('Captura Mochila PC Escuro e Pergaminho (1440x900)', async ({ browser }) => {
    // 3. PC Escuro Mochila
    const pcDark = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pagePD = await pcDark.newPage();
    await pagePD.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'tor_bjorn' }, version: 0 }),
      );
    });
    await pagePD.goto('/jogador/mochila');
    await expect(pagePD.getByText('Mochila de Viagem')).toBeVisible();
    await pagePD.screenshot({ path: path.join(outDir, 'mochila_pc_dark.png'), fullPage: true });
    await pcDark.close();

    // 4. PC Pergaminho Mochila
    const pcParch = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pagePP = await pcParch.newPage();
    await pagePP.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'tor_bjorn' }, version: 0 }),
      );
    });
    await pagePP.goto('/jogador/mochila');
    await pagePP.evaluate(() => document.documentElement.classList.add('theme-parchment'));
    await expect(pagePP.getByText('Mochila de Viagem')).toBeVisible();
    await pagePP.screenshot({
      path: path.join(outDir, 'mochila_pc_parchment.png'),
      fullPage: true,
    });
    await pcParch.close();
  });

  test('Captura Ficha Celular Escuro e Pergaminho (390x844)', async ({ browser }) => {
    // 5. Mobile Escuro Ficha
    const mobDark = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const pageMD = await mobDark.newPage();
    await pageMD.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'tor_bjorn' }, version: 0 }),
      );
    });
    await pageMD.goto('/jogador/ficha');
    await expect(pageMD.getByText('A Palavra Empenhada')).toBeVisible();
    await pageMD.screenshot({ path: path.join(outDir, 'ficha_mobile_dark.png'), fullPage: true });
    await mobDark.close();

    // 6. Mobile Pergaminho Ficha
    const mobParch = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const pageMP = await mobParch.newPage();
    await pageMP.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'tor_bjorn' }, version: 0 }),
      );
    });
    await pageMP.goto('/jogador/ficha');
    await pageMP.evaluate(() => document.documentElement.classList.add('theme-parchment'));
    await expect(pageMP.getByText('A Palavra Empenhada')).toBeVisible();
    await pageMP.screenshot({
      path: path.join(outDir, 'ficha_mobile_parchment.png'),
      fullPage: true,
    });
    await mobParch.close();
  });

  test('Captura Ficha PC Escuro e Pergaminho (1440x900)', async ({ browser }) => {
    // 7. PC Escuro Ficha
    const pcDark = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pagePD = await pcDark.newPage();
    await pagePD.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'tor_bjorn' }, version: 0 }),
      );
    });
    await pagePD.goto('/jogador/ficha');
    await expect(pagePD.getByText('A Palavra Empenhada')).toBeVisible();
    await pagePD.screenshot({ path: path.join(outDir, 'ficha_pc_dark.png'), fullPage: true });
    await pcDark.close();

    // 8. PC Pergaminho Ficha
    const pcParch = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pagePP = await pcParch.newPage();
    await pagePP.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'tor_bjorn' }, version: 0 }),
      );
    });
    await pagePP.goto('/jogador/ficha');
    await pagePP.evaluate(() => document.documentElement.classList.add('theme-parchment'));
    await expect(pagePP.getByText('A Palavra Empenhada')).toBeVisible();
    await pagePP.screenshot({ path: path.join(outDir, 'ficha_pc_parchment.png'), fullPage: true });
    await pcParch.close();
  });

  test('Captura Mesa de Batalha do Jogador e TV (Mobile/PC, Dark/Pergaminho)', async ({
    browser,
  }) => {
    // 9. Mesa Jogador Mobile Escuro (Landscape: 844x390)
    const mobDark = await browser.newContext({
      viewport: { width: 844, height: 390 },
      deviceScaleFactor: 2,
    });
    const pageMD = await mobDark.newPage();
    await pageMD.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'tor_bjorn' }, version: 0 }),
      );
    });
    await pageMD.goto('/jogador/mesa');
    await expect(pageMD.getByTestId('movement-pill')).toBeVisible();
    await pageMD.waitForTimeout(500);
    await pageMD.screenshot({ path: path.join(outDir, 'mesa_mobile_dark.png') });
    await mobDark.close();

    // 10. Mesa Jogador Mobile Pergaminho (Landscape: 844x390)
    const mobParch = await browser.newContext({
      viewport: { width: 844, height: 390 },
      deviceScaleFactor: 2,
    });
    const pageMP = await mobParch.newPage();
    await pageMP.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'tor_bjorn' }, version: 0 }),
      );
    });
    await pageMP.goto('/jogador/mesa');
    await pageMP.evaluate(() => document.documentElement.classList.add('theme-parchment'));
    await expect(pageMP.getByTestId('movement-pill')).toBeVisible();
    await pageMP.waitForTimeout(500);
    await pageMP.screenshot({ path: path.join(outDir, 'mesa_mobile_parchment.png') });
    await mobParch.close();

    // 11. Mesa Jogador PC Escuro (1440x900)
    const pcDark = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pagePD = await pcDark.newPage();
    await pagePD.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'tor_bjorn' }, version: 0 }),
      );
    });
    await pagePD.goto('/jogador/mesa');
    await expect(pagePD.getByTestId('movement-pill')).toBeVisible();
    await pagePD.waitForTimeout(500);
    await pagePD.screenshot({ path: path.join(outDir, 'mesa_pc_dark.png') });
    await pcDark.close();

    // 12. Mesa Jogador PC Pergaminho (1440x900)
    const pcParch = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pagePP = await pcParch.newPage();
    await pagePP.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'tor_bjorn' }, version: 0 }),
      );
    });
    await pagePP.goto('/jogador/mesa');
    await pagePP.evaluate(() => document.documentElement.classList.add('theme-parchment'));
    await expect(pagePP.getByTestId('movement-pill')).toBeVisible();
    await pagePP.waitForTimeout(500);
    await pagePP.screenshot({ path: path.join(outDir, 'mesa_pc_parchment.png') });
    await pcParch.close();

    // 13. TV Batalha PC Escuro (1440x900)
    const tvDark = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pageTV = await tvDark.newPage();
    await pageTV.goto('/batalha');
    await expect(pageTV.getByTestId('tv-battle-canvas')).toBeVisible();
    await pageTV.waitForTimeout(500);
    await pageTV.screenshot({ path: path.join(outDir, 'tv_batalha_pc_dark.png') });
    await tvDark.close();

    // 14. Mestre Mesa Celular Escuro (390x844)
    const dmMobDark = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const pageDMMobDark = await dmMobDark.newPage();
    await pageDMMobDark.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'mestre' }, version: 0 }),
      );
    });
    await pageDMMobDark.goto('/mestre/mesa');
    await expect(pageDMMobDark.getByTestId('dm-battle-editor')).toBeVisible();
    await pageDMMobDark.waitForTimeout(500);
    await pageDMMobDark.screenshot({ path: path.join(outDir, 'mestre_mesa_mobile_dark.png') });
    await dmMobDark.close();

    // 15. Mestre Mesa Celular Pergaminho (390x844)
    const dmMobParch = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const pageDMMobParch = await dmMobParch.newPage();
    await pageDMMobParch.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'mestre' }, version: 0 }),
      );
    });
    await pageDMMobParch.goto('/mestre/mesa');
    await pageDMMobParch.evaluate(() => document.documentElement.classList.add('theme-parchment'));
    await expect(pageDMMobParch.getByTestId('dm-battle-editor')).toBeVisible();
    await pageDMMobParch.waitForTimeout(500);
    await pageDMMobParch.screenshot({ path: path.join(outDir, 'mestre_mesa_mobile_parchment.png') });
    await dmMobParch.close();

    // 16. Mestre Mesa PC Escuro (1440x900)
    const dmPCDark = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pageDMPCDark = await dmPCDark.newPage();
    await pageDMPCDark.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'mestre' }, version: 0 }),
      );
    });
    await pageDMPCDark.goto('/mestre/mesa');
    await expect(pageDMPCDark.getByTestId('dm-battle-editor')).toBeVisible();
    await pageDMPCDark.waitForTimeout(500);
    await pageDMPCDark.screenshot({ path: path.join(outDir, 'mestre_mesa_pc_dark.png') });
    await dmPCDark.close();

    // 17. Mestre Mesa PC Pergaminho (1440x900)
    const dmPCParch = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pageDMPCParch = await dmPCParch.newPage();
    await pageDMPCParch.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'mestre' }, version: 0 }),
      );
    });
    await pageDMPCParch.goto('/mestre/mesa');
    await pageDMPCParch.evaluate(() => document.documentElement.classList.add('theme-parchment'));
    await expect(pageDMPCParch.getByTestId('dm-battle-editor')).toBeVisible();
    await pageDMPCParch.waitForTimeout(500);
    await pageDMPCParch.screenshot({ path: path.join(outDir, 'mestre_mesa_pc_parchment.png') });
    await dmPCParch.close();
  });

  test('Captura Oficina Celular e PC Escuro e Pergaminho', async ({ browser }) => {
    // 18. Oficina Celular Escuro (390x844)
    const ofMobDark = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const pageOfMD = await ofMobDark.newPage();
    await pageOfMD.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'teste_1' }, version: 0 }),
      );
    });
    await pageOfMD.goto('/jogador/oficina');
    await expect(pageOfMD.getByText('Oficina do Jurado')).toBeVisible();
    await pageOfMD.waitForTimeout(500);
    await pageOfMD.screenshot({ path: path.join(outDir, 'oficina_mobile_dark.png'), fullPage: true });
    await ofMobDark.close();

    // 19. Oficina Celular Pergaminho (390x844)
    const ofMobParch = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const pageOfMP = await ofMobParch.newPage();
    await pageOfMP.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'teste_1' }, version: 0 }),
      );
    });
    await pageOfMP.goto('/jogador/oficina');
    await pageOfMP.evaluate(() => document.documentElement.classList.add('theme-parchment'));
    await expect(pageOfMP.getByText('Oficina do Jurado')).toBeVisible();
    await pageOfMP.waitForTimeout(500);
    await pageOfMP.screenshot({ path: path.join(outDir, 'oficina_mobile_parchment.png'), fullPage: true });
    await ofMobParch.close();

    // 20. Oficina PC Escuro (1440x900)
    const ofPCDark = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pageOfPCDark = await ofPCDark.newPage();
    await pageOfPCDark.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'teste_1' }, version: 0 }),
      );
    });
    await pageOfPCDark.goto('/jogador/oficina');
    await expect(pageOfPCDark.getByText('Oficina do Jurado')).toBeVisible();
    await pageOfPCDark.waitForTimeout(500);
    await pageOfPCDark.screenshot({ path: path.join(outDir, 'oficina_pc_dark.png') });
    await ofPCDark.close();

    // 21. Oficina PC Pergaminho (1440x900)
    const ofPCParch = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pageOfPCParch = await ofPCParch.newPage();
    await pageOfPCParch.addInitScript(() => {
      localStorage.setItem(
        'peste_session',
        JSON.stringify({ state: { role: 'jogador', heroId: 'teste_1' }, version: 0 }),
      );
    });
    await pageOfPCParch.goto('/jogador/oficina');
    await pageOfPCParch.evaluate(() => document.documentElement.classList.add('theme-parchment'));
    await expect(pageOfPCParch.getByText('Oficina do Jurado')).toBeVisible();
    await pageOfPCParch.waitForTimeout(500);
    await pageOfPCParch.screenshot({ path: path.join(outDir, 'oficina_pc_parchment.png') });
    await ofPCParch.close();
  });
});
