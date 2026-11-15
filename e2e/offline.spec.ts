import { expect, test } from '@playwright/test';

test('App startet nach dem ersten Besuch ohne Netz (Service Worker)', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active && !!navigator.serviceWorker.controller;
  }, undefined, { timeout: 30_000 });

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.key')).toHaveCount(25);
  await expect(page.locator('h1')).toHaveText('Intervall-Trainer');
  await page.locator('.key[data-midi="67"]').click();
  await expect(page.locator('#info-notes')).toHaveText('C – G');
  await context.setOffline(false);
});

test('Keine Anfragen an fremde Server', async ({ page }) => {
  const foreign: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && !url.protocol.startsWith('blob') && !url.protocol.startsWith('data')) {
      foreign.push(r.url());
    }
  });
  await page.goto('/');
  for (const midi of [60, 64, 67, 72, 80]) await page.locator(`.key[data-midi="${midi}"]`).click();
  await page.locator('button.root[data-root="Es"]').click();
  await page.waitForTimeout(500);
  expect(foreign).toEqual([]);
});

test('Manifest ist vollständig für die Installation', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.name).toBe('Intervall-Trainer');
  expect(m.display).toBe('standalone');
  expect(m.lang).toBe('de');
  expect(m.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
  for (const icon of m.icons) expect((await request.get('/' + icon.src)).ok()).toBe(true);
  expect((await request.get('/icons/apple-touch-icon.png')).ok()).toBe(true);
});
