/**
 * Angaben für die Info-Seite (Offenlegung nach § 25 Mediengesetz und Datenschutz).
 *
 * Bitte vor dem Veröffentlichen ausfüllen. Solange hier noch Platzhalter in
 * eckigen Klammern stehen, bricht die automatische Veröffentlichung auf GitHub
 * Pages absichtlich ab (siehe tests/about.test.ts).
 */
export const ABOUT = {
  /** Medieninhaber: Vor- und Nachname */
  owner: 'Helmut Hörmann',
  /** Wohnort (Ort genügt) */
  place: 'Austria',
  /** Kontakt für Datenschutzfragen, z. B. E-Mail-Adresse */
  contact: 'namroeh@gmail.com',
  /** Wo die App gehostet wird */
  hosting: {
    name: 'GitHub Pages',
    company: 'GitHub, Inc., USA',
    privacyUrl: 'https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement',
  },
};

/** true, wenn noch Platzhalter enthalten sind */
export function aboutHasPlaceholders(): boolean {
  return [ABOUT.owner, ABOUT.place, ABOUT.contact].some((v) => /^\[.*\]$/.test(v.trim()) || v.trim() === '');
}
