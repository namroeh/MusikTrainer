import { expect, test } from '@playwright/test';

const BASE = 'http://localhost:4175/intervall-trainer/';

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'android-hochformat', 'einmal reicht');
});

test('im Unterordner (wie GitHub Pages): lädt, installierbar, offline', async ({ page, context, request }) => {
  await page.goto(BASE);
  await expect(page.locator('.key')).toHaveCount(25);

  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toBe(BASE);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);

  const manifest = await (await request.get(BASE + 'manifest.webmanifest')).json();
  expect(manifest.start_url).toBe('/intervall-trainer/');
  expect(manifest.scope).toBe('/intervall-trainer/');
  for (const icon of manifest.icons) expect((await request.get(BASE + icon.src)).ok()).toBe(true);
  expect((await request.get(BASE + 'icons/apple-touch-icon.png')).ok()).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.key')).toHaveCount(25);
  await page.locator('.key[data-midi="64"]').click();
  await expect(page.locator('#info-notes')).toHaveText('C – E');
  await context.setOffline(false);
});
