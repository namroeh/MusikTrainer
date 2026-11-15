import { expect, test } from '@playwright/test';

/**
 * iOS lässt einen AudioContext nach dem Hintergrund oft stumm.
 * Die App muss deshalb beim Verlassen pausieren und bei der nächsten
 * Berührung einen frischen AudioContext erzeugen.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    const w = window as unknown as { __contexts: AudioContext[] };
    w.__contexts = [];
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options);
        w.__contexts.push(this);
      }
    } as typeof AudioContext;
  });
});

async function setVisibility(page: import('@playwright/test').Page, hidden: boolean) {
  await page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

const states = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __contexts: AudioContext[] }).__contexts.map((c) => c.state));

test('nach dem Hintergrund wird der Ton mit frischem AudioContext gespielt', async ({ page }) => {
  await page.goto('/');
  await page.locator('.key[data-midi="64"]').click();
  await expect.poll(() => states(page)).toEqual(['running']);

  // App geht in den Hintergrund → Ausgabe wird pausiert
  await setVisibility(page, true);
  await expect.poll(() => states(page)).toEqual(['suspended']);

  // zurück in den Vordergrund, nächste Berührung → neuer AudioContext, alter geschlossen
  await setVisibility(page, false);
  await page.locator('.key[data-midi="67"]').click();
  await expect.poll(() => states(page)).toEqual(['closed', 'running']);

  // weitere Berührungen verwenden den neuen AudioContext weiter
  await page.locator('.key[data-midi="69"]').click();
  await page.locator('#again').click();
  await expect.poll(() => states(page)).toEqual(['closed', 'running']);
});

test('mehrfaches Hin- und Herwechseln häuft keine AudioContexts an', async ({ page }) => {
  await page.goto('/');
  for (let i = 0; i < 5; i++) {
    await page.locator('.key[data-midi="64"]').click();
    await setVisibility(page, true);
    await setVisibility(page, false);
  }
  await page.locator('.key[data-midi="64"]').click();
  const s = await states(page);
  expect(s.filter((x) => x !== 'closed')).toEqual(['running']);
});
