import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const VERSION = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;

const isIphoneProject = (name: string) => name.startsWith('iphone');

test('iPhone im Browser: Anleitung „Zum Home-Bildschirm", schließbar und gemerkt', async ({ page }, testInfo) => {
  test.skip(!isIphoneProject(testInfo.project.name), 'nur mit iPhone-Kennung');
  await page.goto('/');
  const banner = page.locator('#install-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Zum Home-Bildschirm');
  await expect(page.locator('#install-action')).toBeHidden();

  await page.getByRole('button', { name: 'Hinweis schließen' }).click();
  await expect(banner).toBeHidden();
  await page.reload();
  await expect(page.locator('.key')).toHaveCount(25);
  await expect(banner).toBeHidden();
});

test('Android/Chrome: eigener „Installieren"-Knopf, wenn der Browser es anbietet', async ({ page }, testInfo) => {
  test.skip(isIphoneProject(testInfo.project.name), 'nicht auf iPhone');
  await page.goto('/');
  const banner = page.locator('#install-banner');
  await expect(banner).toBeHidden(); // ohne Angebot des Browsers kein Hinweis

  // Angebot des Browsers nachstellen
  await page.evaluate(() => {
    const w = window as unknown as { __prompted: boolean };
    w.__prompted = false;
    const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    e.prompt = async () => {
      w.__prompted = true;
    };
    e.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(e);
  });
  await expect(banner).toBeVisible();
  await page.getByRole('button', { name: 'Installieren', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { __prompted: boolean }).__prompted)).toBe(true);
  await expect(banner).toBeHidden();
});

test('Info-Fenster mit Installation, Offenlegung, Datenschutz und Version', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Info und Installation' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (const text of ['Als App installieren', 'Offenlegung', 'Medieninhaber', 'Datenschutz', 'keine Cookies', 'GitHub Pages', `Version ${VERSION}`]) {
    await expect(dialog).toContainText(text);
  }
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(dialog).toBeHidden();

  // auch mit der Escape-Taste
  await page.getByRole('button', { name: 'Info und Installation' }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
