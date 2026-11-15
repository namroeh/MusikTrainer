/** Info-Fenster: Installation, Bedienung, Offenlegung, Datenschutz. */
import { ABOUT } from './about';
import { QUIZ_RESET_EVENT, clearStats } from './quiz';
import { SHARE_ICON, escapeHtml } from './platform';

function contactHtml(contact: string): string {
  const c = contact.trim();
  if (/^[^\s@]+@[^\s@]+$/.test(c)) return `<a href="mailto:${escapeHtml(c)}">${escapeHtml(c)}</a>`;
  return escapeHtml(c);
}

function content(): string {
  const owner = escapeHtml(ABOUT.owner);
  const place = escapeHtml(ABOUT.place);
  return `
<p class="about-version">Version ${escapeHtml(__APP_VERSION__)}</p>

<h3>Als App installieren</h3>
<ul>
  <li><b>iPhone/iPad:</b> in Safari öffnen → <b>Teilen</b> ${SHARE_ICON} → <b>„Zum Home-Bildschirm“</b>.</li>
  <li><b>Android:</b> in Chrome öffnen → Menü <b>⋮</b> → <b>„App installieren“</b>.</li>
</ul>
<p>Danach funktioniert die App auch ohne Internet. Neue Versionen kommen automatisch, sobald du sie mit Internetverbindung öffnest.</p>

<h3>So funktioniert's</h3>
<ul>
  <li>Grundton wählen – auf den Tasten bis zur Oktave sitzt je ein Symbol für das Merklied.</li>
  <li>Taste antippen: Das Intervall erklingt, darunter stehen Name, Töne und Liedtitel.</li>
  <li>Zum Selbst-Abfragen <b>Symbole</b> und/oder <b>Liedtitel</b> ausschalten – oder gleich ins <b>Quiz</b> wechseln.</li>
</ul>

<h3>Quiz</h3>
<p>Im Bereich <b>Quiz</b> spielt die App ein zufälliges Intervall. Du tippst die Zieltaste oder wählst das Intervall aus der Liste und bekommst sofort die Auflösung mit Merklied. Intervalle, die du falsch beantwortest, kommen öfter dran, bis du sie wieder sicher kannst.</p>
<p><button type="button" class="secondary small" id="about-forget">Quiz-Lernstand zurücksetzen</button> <span class="about-done" id="about-forget-done" hidden>Erledigt.</span></p>

<h3>Offenlegung</h3>
<p>Medieninhaber: ${owner}, ${place}<br>
Private, nicht kommerzielle Lern-App zum Üben der Intervalle (Musiktheorie).</p>

<h3>Datenschutz</h3>
<p>Diese App erhebt keine personenbezogenen Daten. Sie verwendet keine Cookies, keine Tracker und keine Analysewerkzeuge und lädt keine Inhalte von fremden Servern. Deine Einstellungen (Grundton, Wiedergabeart, Schalter) werden ausschließlich lokal auf deinem Gerät gespeichert und nicht übertragen.</p>
<p>Bereitgestellt wird die App über ${escapeHtml(ABOUT.hosting.name)} (${escapeHtml(ABOUT.hosting.company)}). Beim Aufruf verarbeitet der Anbieter technisch notwendige Verbindungsdaten wie deine IP-Adresse, etwa in Server-Protokollen. Näheres in der <a href="${escapeHtml(ABOUT.hosting.privacyUrl)}" target="_blank" rel="noopener noreferrer">Datenschutzerklärung von GitHub</a>.</p>
<p>Verantwortlich: ${owner}, ${place} · Kontakt: ${contactHtml(ABOUT.contact)}</p>

<h3>Hinweise</h3>
<p>Die Liedtitel dienen nur als Merkhilfe; die Rechte an Titeln, Marken und Werken liegen bei den jeweiligen Rechteinhabern. Die App enthält keine Melodien und keine Liedtexte. Alle Symbole sind eigene Zeichnungen.</p>`;
}

export function setupAbout(): void {
  const dialog = document.getElementById('about') as HTMLDialogElement;
  const open = document.getElementById('info-open') as HTMLButtonElement;
  const close = document.getElementById('about-close') as HTMLButtonElement;
  const body = document.getElementById('about-content') as HTMLElement;
  body.innerHTML = content();

  open.addEventListener('click', () => {
    dialog.showModal();
    body.scrollTop = 0;
  });
  close.addEventListener('click', () => dialog.close());
  const forgetDone = document.getElementById('about-forget-done') as HTMLElement;
  document.getElementById('about-forget')?.addEventListener('click', () => {
    clearStats();
    window.dispatchEvent(new Event(QUIZ_RESET_EVENT));
    forgetDone.hidden = false;
  });
  dialog.addEventListener('close', () => {
    forgetDone.hidden = true;
  });
  // Tippen auf den abgedunkelten Hintergrund schließt ebenfalls
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}
