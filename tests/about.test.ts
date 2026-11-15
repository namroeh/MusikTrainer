import { describe, expect, it } from 'vitest';
import { ABOUT, aboutHasPlaceholders } from '../src/about';

describe('Angaben für Offenlegung und Datenschutz', () => {
  it('Hosting-Angaben vorhanden', () => {
    expect(ABOUT.hosting.privacyUrl).toMatch(/^https:\/\//);
  });

  // Auf GitHub (CI=true) muss alles ausgefüllt sein – sonst wird nicht veröffentlicht.
  it.runIf(process.env.CI)('vor dem Veröffentlichen sind Name, Ort und Kontakt eingetragen', () => {
    expect(aboutHasPlaceholders(), 'Bitte src/about.ts ausfüllen').toBe(false);
  });
});
