# Intervall-Trainer

Eine kleine Handy-App zum Lernen der Intervalle mit Merkliedern. Sie läuft komplett offline, ohne Tracker und ohne Netzwerkanfragen.

- Klaviertastatur von **c' bis c'''** (zwei Oktaven)
- Grundton wählbar: C, Cis, Des, D, Es, E, F, Fis, G, As, A, B, H (wird gespeichert)
- Auf den 13 Tasten vom Grundton bis zur Oktave sitzt je ein Symbol fürs Merklied
- Antippen spielt das Intervall: **nacheinander** (aufwärts), **abwärts** oder **gleichzeitig**
- Anzeige: Kürzel, voller Name, richtig buchstabierte Tonnamen (z. B. „D – Fis", „Des – Eses (D)") und Liedtitel
- **Nochmal**-Knopf, Schalter **Symbole** und **Liedtitel** zum Selbst-Abfragen
- Hoch- und Querformat, helles und dunkles Design (folgt der Systemeinstellung)
- **Quiz:** Die App spielt ein zufälliges Intervall, du tippst die Zieltaste oder wählst es aus der Liste. Grundton fest oder zufällig, Auflösung mit Merklied, Zähler. Falsch beantwortete Intervalle kommen öfter dran
- Info-Fenster (ⓘ) mit Installationsanleitung, Offenlegung und Datenschutz; Installationshinweis im Browser

**Online:** <https://namroeh.github.io/MusikTrainer/> – am Handy öffnen und „Zum Home-Bildschirm" bzw. „App installieren". Danach läuft die App offline.

---

## 1. Voraussetzungen

- **Node.js 20 oder neuer** (LTS-Version von <https://nodejs.org>). Nur auf dem Rechner nötig, nicht am Handy.
- Den Projektordner entpacken, ein Terminal darin öffnen (Windows: im Ordner Rechtsklick → „Im Terminal öffnen") und einmalig ausführen:

```bash
npm install
```

## 2. Starten (Entwicklung)

```bash
npm run dev
```

- Am Rechner: <http://localhost:5173>
- Am Handy im selben WLAN: die Adresse hinter „Network:" aus der Terminal-Ausgabe, z. B. `http://192.168.1.20:5173`

> Auf diesem Weg kannst du die App am Handy **ansehen und ausprobieren**, aber **nicht installieren**: Über eine einfache `http://`-Adresse lassen Handys keinen Offline-Betrieb (Service Worker) zu. Zum Installieren nimm die veröffentlichte Version (Abschnitt 4) oder den lokalen Weg (Abschnitt 5).

## 3. Bauen

```bash
npm run build
```

Ergebnis im Ordner `dist/`. Testweise ansehen mit `npm run preview`.

## 4. Veröffentlichen auf GitHub Pages (für alle)

Jeder Push auf den Branch `main` startet automatisch den Workflow `.github/workflows/pages.yml`:

1. Unit-Tests und Abnahmetests laufen. Schlägt einer fehl, wird **nicht** veröffentlicht.
2. Die App wird für den Unterordner `/<Repository-Name>/` gebaut.
3. Das Ergebnis geht auf GitHub Pages: <https://namroeh.github.io/MusikTrainer/>

**Einmalig einrichten:** Im Repository *Settings → Pages → Build and deployment → Source:* **GitHub Actions** wählen.

**Vor der ersten Veröffentlichung:** In `src/about.ts` Name, Wohnort und Kontakt für Offenlegung und Datenschutzhinweis eintragen. Solange dort Platzhalter stehen, bricht der Workflow absichtlich ab.

Den Fortschritt siehst du im Repository unter **Actions**. Installierte Apps holen sich neue Versionen automatisch, sobald sie mit Internet geöffnet werden.

## 5. Aufs Handy installieren – lokal, ohne Internet

Ein Handy installiert eine Web-App nur, wenn sie über **HTTPS** kommt. Dafür bringt das Projekt einen kleinen Server mit, der eine **eigene, private Zertifizierungsstelle** anlegt. Es ist kein Internet und kein Konto irgendwo nötig. Handy und Rechner müssen nur im selben WLAN sein.

```bash
npm run handy
```

Das Terminal zeigt zwei Adressen, z. B.:

```
1) Am Handy diese Seite öffnen:  http://192.168.1.20:8080/
2) Die App selbst:               https://192.168.1.20:8443/
```

Windows fragt beim ersten Start eventuell nach einer Firewall-Freigabe für Node.js. Erlaube den Zugriff für **private Netzwerke**.

Öffne am Handy die erste Adresse (`http://…:8080`). Dort steht die Anleitung noch einmal, mit dem Knopf **Zertifikat laden**.

### iPhone (Safari)

1. Auf **Zertifikat laden** tippen → **Zulassen** → **Schließen**.
2. **Einstellungen** öffnen → oben **Profil geladen** (oder *Allgemein → VPN und Geräteverwaltung*) → „Intervall-Trainer lokale CA" → **Installieren**.
3. **Einstellungen → Allgemein → Info → Zertifikatsvertrauenseinstellungen** → den Schalter bei „Intervall-Trainer lokale CA" **einschalten**.
4. In **Safari** `https://192.168.1.20:8443/` öffnen (deine Adresse aus dem Terminal).
5. Teilen-Symbol → **Zum Home-Bildschirm**.

### Android (Chrome)

1. Auf **Zertifikat laden** tippen. Die Datei landet unter „Downloads".
2. In den **Einstellungen** nach „Zertifikat" suchen → **CA-Zertifikat installieren** → „Trotzdem installieren" → `intervall-trainer-zertifikat.crt` wählen. Die Menünamen unterscheiden sich je nach Hersteller.
3. In **Chrome** `https://192.168.1.20:8443/` öffnen.
4. Menü ⋮ → **App installieren** (oder „Zum Startbildschirm hinzufügen").

**Danach** läuft die App vollständig am Handy, auch im Flugmodus und ohne dass der Rechner eingeschaltet ist. Den Server beendest du mit `Strg+C`.

### Wichtig zur Sicherheit

- Im Ordner `.handy-zertifikat/` liegt der **private Schlüssel** (`ca-key.pem`) deiner Zertifizierungsstelle. Wer ihn hat, könnte Zertifikate ausstellen, denen dein Handy vertraut. **Nicht weitergeben**, nicht in ein öffentliches Repository hochladen (er ist in `.gitignore` eingetragen).
- Wenn du auf Nummer sicher gehen willst, entferne das Zertifikat nach der Installation wieder:
  - iPhone: *Einstellungen → Allgemein → VPN und Geräteverwaltung → Profil → Entfernen*
  - Android: *Einstellungen → Sicherheit → Vertrauenswürdige Anmeldedaten → Nutzer*

  Die installierte App läuft dann aus dem Speicher des Handys weiter. Für ein **Update** der App brauchst du das Zertifikat wieder (Profil neu laden), und der Rechner muss unter derselben Adresse erreichbar sein. *(Hinweis: Dass die App nach dem Entfernen des Zertifikats weiterläuft, ist aus der Funktionsweise abgeleitet, aber noch nicht an einem echten Gerät getestet.)*
- Ändert sich die IP-Adresse deines Rechners, erzeugt `npm run handy` automatisch ein neues Server-Zertifikat. Die Zertifizierungsstelle bleibt dieselbe, am Handy musst du also nichts neu installieren. Die neue Adresse ist für das Handy aber eine **andere App**: Gegebenenfalls einmal neu „Zum Home-Bildschirm" hinzufügen.

### Warum nicht einfach eine Datei aufs Handy kopieren?

- **iPhone:** Safari kann keine lokalen HTML-Dateien öffnen, und die Vorschau in der Dateien-App führt kein JavaScript aus. Ohne JavaScript gibt es weder Tastatur noch Ton.
- **Android:** Eine lokale HTML-Datei lässt sich teilweise öffnen. Installation, Offline-Betrieb und das Speichern der Einstellungen funktionieren so aber nicht zuverlässig.
- Der Weg über `npm run handy` ist einmalig etwas Arbeit (rund 10 Minuten). Danach liegt die App wirklich lokal am Handy.

## 6. Tests

```bash
npm test
```

**Unit-Tests (Vitest):**

- Frequenzberechnung: c' = 261,63 Hz, Formel 261,63 × 2^(n/12) für alle 25 Tasten, Oktav- und Halbtonverhältnis
- Intervalldaten: genau 13 Einträge, Halbtöne 0–12 lückenlos, Kürzel und Intervallzahl passend, Symbole ohne externe Bezüge
- Quiz-Logik: Gewichtung (falsch beantwortete kommen öfter), keine direkte Wiederholung, Grundton fest/zufällig, gleichmäßige Verteilung ohne Lernstand
- Tonbenennung: alle 13 Grundtöne × 13 Intervalle (Stammton-Stufe aus der Intervallzahl, Tonhöhe aus der Halbtonzahl, höchstens Doppelvorzeichen, Klammer genau bei Doppelvorzeichen), dazu die festen Prüffälle:

  | Intervall | Grundton | Zielton |
  |---|---|---|
  | gr3 | D | Fis |
  | kl3 | C | Es |
  | ü4 | F | H |
  | kl6 | E | C |
  | gr7 | Des | C |
  | kl2 | H | C |
  | kl2 | Des | Eses (D) |

  Bei den 13 Grundtönen kommen genau vier Doppelvorzeichen vor: kl2 über Des = Eses (D), kl6 über Des = Heses (A), kl2 über As = Heses (A), ü4 über Cis = Fisis (G).

```bash
npx playwright install chromium   # einmalig
npm run test:e2e
```

**Abnahmetests im Browser (Playwright/Chromium, 3 Bildschirmgrößen):**

- Alle 13 Grundtöne × 13 Tasten × 3 Wiedergabearten = **507 Fälle** je Bildschirmgröße. Geprüft werden die tatsächlich geplanten Frequenzen und ihre Reihenfolge, die Anzeige (Kürzel, Name, Tonnamen, Liedtitel), das Aufleuchten von Grund- und Zieltaste und welches Symbol auf welcher Taste sitzt.
- Die festen Prüffälle in der Anzeige
- Abgedunkelte Tasten spielen ihren Einzelton
- „Nochmal", die Schalter, das Speichern der Auswahl und der Standard beim ersten Start
- Tastenbreite mindestens 44 px; der Grundton-Bereich ist nach der Auswahl sichtbar
- Quiz: richtige und falsche Antwort per Taste und per Liste, Auflösung, Zähler, Speichern des Lernstands, Grundton fest/zufällig (Symbole wandern mit), alle Wiedergabearten, Tasten außerhalb des Bereichs, Vergleichen nach der Antwort, Einstellungen bleiben erhalten
- Installationshinweis (iPhone) und „Installieren"-Knopf (Android), Info-Fenster
- Build im Unterordner wie auf GitHub Pages: Pfade, Manifest, Offline-Start
- Nach dem Hintergrund (App-Wechsel) wird ein frischer AudioContext erzeugt, alte werden geschlossen und häufen sich nicht an
- **Offline-Start** nach dem ersten Besuch, Vollständigkeit des Manifests, **keine Anfragen an fremde Server**

## 7. Quiz

Oben auf **Quiz** wechseln, dann **Start**.

- **Grundton:** fest (der gewählte, wie im Lernen-Bereich) oder **zufällig**. Bei „fest" ist es derselbe Grundton wie im Lernen-Bereich: Änderst du ihn an einer Stelle, ändert er sich auch an der anderen.
- **Antwort:** per **Taste** (Zieltaste antippen, der Grundton leuchtet) oder aus der **Liste** (beschriftet mit dem vollen Namen, z. B. „kleine Terz“).
- Die **Wiedergabeart** (nacheinander / abwärts / gleichzeitig) gilt auch im Quiz.
- **Auflösen** zeigt die Lösung, zählt aber als falsch.
- Nach der Antwort siehst du, ob sie richtig oder falsch war, und die Auflösung mit Name, Tonnamen, Merklied und Symbol. Die richtige Taste leuchtet, eine falsch angetippte wird rot. Danach kannst du Tasten oder Listeneinträge antippen, um Intervalle zu vergleichen. Das zählt nicht mehr als Antwort.
- **Zähler:** „Richtig: x von y" für die laufende Sitzung, mit ↺ zurücksetzen.
- **Öfter üben, was schiefgeht:** Jedes Intervall hat einen Übungsbedarf. Eine falsche Antwort erhöht ihn um 3, eine richtige senkt ihn um 1 (Bereich 0–9). Die Ziehwahrscheinlichkeit ist proportional zu 1 + Übungsbedarf. Ein gerade falsch beantwortetes Intervall kommt also etwa dreimal so oft wie ein sicheres, bis es wieder sitzt. Dieselbe Frage kommt nie zweimal hintereinander. Der Lernstand wird am Gerät gespeichert. Zurücksetzen kannst du ihn im Quiz („Lernstand zurücksetzen") oder im Info-Fenster.

Die Logik steckt in `src/quiz.ts` (getestet in `tests/quiz.test.ts`), die Oberfläche in `src/quiz-view.ts`.

## 8. Lieder und Symbole ändern

Alles steht in **`src/intervals.ts`**: Liedtitel (`song`), Symbolbeschreibung (`symbolName`) und das Symbol selbst (`symbol`, als SVG-Code mit Zeichenfläche 48 × 48). `semitones` und `degree` bitte nicht ändern, davon hängen Klang und Tonnamen ab. Nach einer Änderung `npm test` laufen lassen.

Tipp für eigene Symbole: Inhalt innerhalb eines Kreises mit Radius ~20 um die Mitte halten. Die App legt jedes Symbol auf ein helles, rundes Plättchen mit dunklem Rand, damit es auf weißen **und** schwarzen Tasten gut lesbar ist.

## 9. Ton, iOS und der Stummschalter

**Klang:** Dreieck- und Sinuswelle mit leisen Obertönen und einem Tiefpass, der sich nach dem Anschlag schließt, damit es klavierähnlich klingt. Die Lautstärke steigt in 8 ms von 0 an, klingt ab und läuft beim Loslassen weich auf 0 aus. Beim Antippen einer neuen Taste wird ein noch laufender Ton in rund 50 ms ausgeblendet. Ein Kompressor verhindert Übersteuern bei „gleichzeitig".

*Geprüft:* Die Töne wurden im Browser mit einem `OfflineAudioContext` gerendert und Sample für Sample ausgewertet. Der Sprung am Tonanfang beträgt höchstens 0,004 (bei einem Spitzenpegel von 0,5 bis 0,7), das Ende geht exakt auf 0, nichts übersteuert. Auch beim Abbrechen mitten im Ton gibt es keinen Sprung.

**Start des Tons:** Der AudioContext wird erst bei der ersten Berührung erzeugt bzw. fortgesetzt (Vorgabe von iOS und Chrome).

**Stummschalter am iPhone:** iOS behandelt Web-Audio standardmäßig wie Umgebungston. Bei eingeschaltetem Stummschalter wäre es also still. Die App setzt deshalb `navigator.audioSession.type = "playback"` (Safari ab iOS 17). Damit sollte der Ton auch bei Stummschaltung zu hören sein, laut Lautstärkeregler. Auf älteren iOS-Versionen ohne diese Schnittstelle startet die App ein stummes, im Speicher erzeugtes Audio-Element (keine Datei), das auf Medien-Wiedergabe umschaltet. Nebenwirkung von „playback": Läuft gerade Musik in einer anderen App, wird sie beim Abspielen eines Intervalls pausiert.

**Nach dem Hintergrund (App-Wechsel, Sperrbildschirm):** iOS lässt eine Web-Audio-Ausgabe, die im Hintergrund war, oft stumm. Sie bleibt im Zustand „interrupted" oder meldet „running" und gibt trotzdem nichts aus (offene WebKit-Fehler [263627](https://bugs.webkit.org/show_bug.cgi?id=263627), [273511](https://bugs.webkit.org/show_bug.cgi?id=273511), [291892](https://bugs.webkit.org/show_bug.cgi?id=291892)). Die App pausiert deshalb die Ausgabe beim Verlassen und baut sie bei der nächsten Berührung komplett neu auf, statt die alte zu wecken. *Am iPhone beobachtet (Version 1.0.0): nach dem Hintergrund stumm, erst nach Neustart der App wieder Ton. Ab Version 1.0.1 behoben, am iPhone bestätigt.*

> ⚠️ **Noch nicht auf echten Geräten getestet.** Die App wurde in einer Cloud-Umgebung mit Chromium entwickelt und getestet. Ein iPhone oder Android-Handy stand nicht zur Verfügung. Bitte prüfe die folgenden Punkte und trag das Ergebnis hier ein:

| Prüfpunkt | iPhone (Safari / installiert) | Android (Chrome / installiert) |
|---|---|---|
| Ton beim ersten Antippen einer Taste | ☐ | ☐ |
| Ton bei **eingeschaltetem Stummschalter** (iPhone) | ☐ | – |
| Kein Knacksen am Tonanfang/-ende | ☐ | ☐ |
| „gleichzeitig" klingt sauber, nicht verzerrt | ☐ | ☐ |
| Ton nach App-Wechsel / Sperrbildschirm wieder da | ☐ | ☐ |
| Start im Flugmodus nach der Installation | ☐ | ☐ |
| iOS-Version / Android-Version | | |

Falls am iPhone bei Stummschaltung nichts zu hören ist: iOS-Version notieren und mir Bescheid geben. Dann bauen wir den Ausweichweg für ältere Versionen um.

## 10. Projektstruktur

```
src/
  intervals.ts   ← ALLE Intervall-Daten: Kürzel, Name, Halbtöne, Stufe, Liedtitel, Symbol
  notes.ts       ← deutsche Tonnamen, Grundtöne, Buchstabierung des Zieltons
  pitch.ts       ← Frequenzberechnung, Tastaturumfang
  playback.ts    ← Wiedergabe-Plan (nacheinander / abwärts / gleichzeitig)
  audio.ts       ← Klangerzeugung (Web Audio), iOS-Freischaltung und -Stummschalter
  keyboard.ts    ← Tastatur: Aufbau, Größe, Scrollen, Hervorhebung
  settings.ts    ← gespeicherte Auswahl (localStorage)
  quiz.ts        ← Quiz-Logik: Fragen, Gewichtung, Lernstand
  quiz-view.ts   ← Quiz-Oberfläche
  about.ts       ← Angaben für Offenlegung und Datenschutz (vor dem Veröffentlichen ausfüllen)
  about-view.ts  ← Info-Fenster
  install.ts     ← Installationshinweis / „Installieren"-Knopf
  platform.ts    ← Plattform-Erkennung (iOS, installiert?)
  main.ts        ← verbindet alles
  style.css
tests/           ← Unit-Tests (Vitest)
e2e/             ← Abnahmetests (Playwright)
scripts/
  handy.mjs      ← lokaler HTTPS-Server fürs Handy (npm run handy)
  icons.mjs      ← erzeugt die App-Icons aus scripts/icon-src/ (npm run icons)
public/icons/    ← App-Icons
.github/workflows/pages.yml ← automatische Tests + Veröffentlichung
```

**Technik:** Vite + TypeScript, ohne UI-Framework. Die App hat eine einzige Ansicht mit wenig Zustand, ein Framework wäre da nur Ballast. So bleibt das Programm klein (≈ 12 kB JavaScript, komprimiert) und startet sofort. `vite-plugin-pwa` erzeugt beim Build das Manifest und den Service Worker, der alle Dateien vorab speichert.

**Datenschutz:** keine Tracker, keine externen Schriften oder Skripte, keine Netzwerkanfragen zur Laufzeit. Gespeichert wird nur deine Auswahl (Grundton, Wiedergabeart, Schalter), und zwar lokal am Gerät.

**Stimmung:** gleichstufig, c' = 261,63 Hz, Frequenz = 261,63 × 2^(Halbtöne über c' / 12). Der Grundton liegt immer zwischen c' und h', seine Oktave entsprechend zwischen c'' und h''.

## 11. Bekannte Grenzen

- Sehr schmale Handys (320 px, z. B. iPhone SE der 1. Generation): Weil jede Taste mindestens 44 px breit ist, passt eine ganze Oktave nicht ganz auf den Schirm. Die Tastatur lässt sich wischen.
- Die automatischen Tests laufen in Chromium. WebKit (Safari) war in der Entwicklungsumgebung nicht verfügbar, siehe Checkliste oben.
- `npm audit` meldet Hinweise in `workbox-build` (Werkzeug für den Build). Das betrifft nur den Build-Vorgang am Rechner, nicht die App am Handy.
