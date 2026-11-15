import type { Page } from '@playwright/test';

export interface PlayedNote {
  midi: number;
  frequency: number;
  offset: number;
  hold: number;
}

/** Zeichnet jedes Wiedergabe-Ereignis der App auf. */
export async function recordPlays(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __plays: unknown[] };
    w.__plays = [];
    window.addEventListener('intervall:play', (e) => {
      w.__plays.push((e as CustomEvent).detail.notes);
    });
  });
}

export async function plays(page: Page): Promise<PlayedNote[][]> {
  return page.evaluate(() => (window as unknown as { __plays: PlayedNote[][] }).__plays);
}

export async function clearPlays(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __plays: unknown[] }).__plays = [];
  });
}

export const freq = (midi: number) => 261.63 * Math.pow(2, (midi - 60) / 12);
