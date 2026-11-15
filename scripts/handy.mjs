#!/usr/bin/env node
/**
 * Stellt die fertige App (Ordner dist/) im eigenen WLAN bereit – per HTTPS mit
 * einem selbst erzeugten Zertifikat. Nur so kann ein Handy die App installieren
 * und offline nutzen (Service Worker brauchen HTTPS). Es ist kein Internet nötig.
 *
 * Aufruf:  npm run handy   (baut vorher die App)
 *
 * Beim ersten Start wird im Ordner .handy-zertifikat/ eine eigene, private
 * Zertifizierungsstelle (CA) angelegt. Deren Zertifikat installierst du einmalig
 * am Handy. Den privaten Schlüssel (ca-key.pem) niemals weitergeben!
 */
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import forge from 'node-forge';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const CERT_DIR = path.join(ROOT, '.handy-zertifikat');
const HTTPS_PORT = Number(process.env.HTTPS_PORT ?? 8443);
const HTTP_PORT = Number(process.env.HTTP_PORT ?? 8080);
const CA_NAME = 'Intervall-Trainer lokale CA';
const CA_FILE_NAME = 'intervall-trainer-zertifikat.crt';

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/ fehlt – bitte mit „npm run handy" starten (baut die App vorher).');
  process.exit(1);
}

// ---------- Netzwerkadressen ----------

function lanAddresses() {
  const result = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) result.push(a.address);
    }
  }
  return [...new Set(result)];
}

const ips = lanAddresses();
if (ips.length === 0) {
  console.error('Keine WLAN/LAN-Adresse gefunden. Ist der Rechner mit dem Netzwerk verbunden?');
  process.exit(1);
}

// ---------- Zertifikate ----------

const pki = forge.pki;
const file = (name) => path.join(CERT_DIR, name);

function randomSerial() {
  // positive Seriennummer (erstes Byte < 0x80)
  return '0' + forge.util.bytesToHex(forge.random.getBytesSync(15)).slice(1);
}

function loadOrCreateCA() {
  if (fs.existsSync(file('ca-key.pem')) && fs.existsSync(file('ca-cert.pem'))) {
    return {
      key: pki.privateKeyFromPem(fs.readFileSync(file('ca-key.pem'), 'utf8')),
      cert: pki.certificateFromPem(fs.readFileSync(file('ca-cert.pem'), 'utf8')),
    };
  }
  console.log('Erzeuge eigene Zertifizierungsstelle (einmalig, dauert ein paar Sekunden) …');
  const keys = pki.rsa.generateKeyPair(2048);
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = randomSerial();
  cert.validity.notBefore = new Date(Date.now() - 60_000);
  cert.validity.notAfter = new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000);
  const attrs = [
    { name: 'commonName', value: CA_NAME },
    { name: 'organizationName', value: 'Intervall-Trainer (privat)' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
    { name: 'subjectKeyIdentifier' },
  ]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  fs.mkdirSync(CERT_DIR, { recursive: true });
  fs.writeFileSync(file('ca-key.pem'), pki.privateKeyToPem(keys.privateKey), { mode: 0o600 });
  fs.writeFileSync(file('ca-cert.pem'), pki.certificateToPem(cert));
  return { key: keys.privateKey, cert };
}

function loadOrCreateServerCert(ca) {
  const wanted = [...ips, '127.0.0.1'].sort().join(',');
  const metaFile = file('server-ips.txt');
  if (fs.existsSync(file('server-key.pem')) && fs.existsSync(file('server-cert.pem')) && fs.existsSync(metaFile)) {
    const cert = pki.certificateFromPem(fs.readFileSync(file('server-cert.pem'), 'utf8'));
    const stillValid = cert.validity.notAfter.getTime() - Date.now() > 30 * 24 * 3600 * 1000;
    if (stillValid && fs.readFileSync(metaFile, 'utf8') === wanted) {
      return { key: fs.readFileSync(file('server-key.pem'), 'utf8'), cert: fs.readFileSync(file('server-cert.pem'), 'utf8') };
    }
  }
  console.log('Erzeuge Server-Zertifikat für', ips.join(', '), '…');
  const keys = pki.rsa.generateKeyPair(2048);
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = randomSerial();
  cert.validity.notBefore = new Date(Date.now() - 60_000);
  // iOS akzeptiert höchstens 825 Tage Laufzeit
  cert.validity.notAfter = new Date(Date.now() + 800 * 24 * 3600 * 1000);
  cert.setSubject([{ name: 'commonName', value: ips[0] }]);
  cert.setIssuer(ca.cert.subject.attributes);
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, critical: true },
    { name: 'extKeyUsage', serverAuth: true },
    {
      name: 'subjectAltName',
      altNames: [{ type: 2, value: 'localhost' }, ...[...ips, '127.0.0.1'].map((ip) => ({ type: 7, ip }))],
    },
    { name: 'subjectKeyIdentifier' },
    { name: 'authorityKeyIdentifier', keyIdentifier: ca.cert.generateSubjectKeyIdentifier().getBytes() },
  ]);
  cert.sign(ca.key, forge.md.sha256.create());
  const result = { key: pki.privateKeyToPem(keys.privateKey), cert: pki.certificateToPem(cert) };
  fs.writeFileSync(file('server-key.pem'), result.key, { mode: 0o600 });
  fs.writeFileSync(file('server-cert.pem'), result.cert);
  fs.writeFileSync(metaFile, wanted);
  return result;
}

const ca = loadOrCreateCA();
const server = loadOrCreateServerCert(ca);
const caDer = Buffer.from(forge.asn1.toDer(pki.certificateToAsn1(ca.cert)).getBytes(), 'binary');

// ---------- HTTPS: die App ----------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function serveApp(req, res) {
  const url = new URL(req.url ?? '/', 'https://x');
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  let target = path.normalize(path.join(DIST, rel));
  if (!target.startsWith(DIST)) {
    res.writeHead(403).end();
    return;
  }
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) target = path.join(DIST, 'index.html');
  const ext = path.extname(target);
  const immutable = target.includes(`${path.sep}assets${path.sep}`);
  res.writeHead(200, {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  fs.createReadStream(target).pipe(res);
}

// ---------- HTTP: Anleitung + Zertifikat zum Herunterladen ----------

function instructionsPage(req) {
  const host = (req.headers.host ?? `${ips[0]}:${HTTP_PORT}`).split(':')[0];
  const appUrl = `https://${host}:${HTTPS_PORT}/`;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Intervall-Trainer installieren</title>
<style>
 body{font:17px/1.5 system-ui,-apple-system,sans-serif;margin:0;padding:20px;background:#f4efe6;color:#1f1d1a;max-width:640px}
 h1{font-size:1.4rem} h2{font-size:1.1rem;margin-top:1.6em}
 a.btn{display:block;text-align:center;padding:14px;border-radius:12px;background:#c8611a;color:#fff;text-decoration:none;font-weight:700;margin:12px 0}
 code{background:#ebe3d6;padding:2px 5px;border-radius:5px}
 li{margin:.4em 0}
</style></head><body>
<h1>Intervall-Trainer aufs Handy</h1>
<p><b>Schritt 1:</b> Zertifikat laden (einmalig):</p>
<a class="btn" href="/${CA_FILE_NAME}">Zertifikat laden</a>
<h2>iPhone</h2>
<ol>
<li>Nach dem Tippen auf „Zertifikat laden" → <b>Zulassen</b> → <b>Schließen</b>.</li>
<li><b>Einstellungen</b> öffnen → oben „Profil geladen" (oder <i>Allgemein → VPN und Geräteverwaltung</i>) → „${CA_NAME}" → <b>Installieren</b>.</li>
<li><b>Einstellungen → Allgemein → Info → Zertifikatsvertrauenseinstellungen</b> → Schalter bei „${CA_NAME}" einschalten.</li>
<li>In <b>Safari</b> öffnen: <a href="${appUrl}">${appUrl}</a></li>
<li>Teilen-Symbol → <b>Zum Home-Bildschirm</b>.</li>
</ol>
<h2>Android (Chrome)</h2>
<ol>
<li>„Zertifikat laden" tippen – die Datei landet in „Downloads".</li>
<li><b>Einstellungen</b> → in der Suche „Zertifikat" eingeben → <b>CA-Zertifikat installieren</b> → „Trotzdem installieren" → Datei <code>${CA_FILE_NAME}</code> wählen.</li>
<li>In <b>Chrome</b> öffnen: <a href="${appUrl}">${appUrl}</a></li>
<li>Menü ⋮ → <b>App installieren</b> (oder „Zum Startbildschirm hinzufügen").</li>
</ol>
<p>Danach läuft die App komplett am Handy – auch ohne WLAN und ohne dass der Rechner läuft.</p>
</body></html>`;
}

function serveHttp(req, res) {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === `/${CA_FILE_NAME}`) {
    res.writeHead(200, {
      'Content-Type': 'application/x-x509-ca-cert',
      'Content-Disposition': `attachment; filename="${CA_FILE_NAME}"`,
      'Content-Length': caDer.length,
    });
    res.end(caDer);
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(instructionsPage(req));
}

// ---------- Start ----------

https.createServer({ key: server.key, cert: server.cert }, serveApp).listen(HTTPS_PORT, '0.0.0.0');
http.createServer(serveHttp).listen(HTTP_PORT, '0.0.0.0');

console.log(`
──────────────────────────────────────────────────────────
 Intervall-Trainer läuft im WLAN.

 1) Am Handy (selbes WLAN) diese Seite öffnen – dort steht alles weitere:
${ips.map((ip) => `      http://${ip}:${HTTP_PORT}/`).join('\n')}

 2) Die App selbst:
${ips.map((ip) => `      https://${ip}:${HTTPS_PORT}/`).join('\n')}

 Beenden mit Strg+C. Nach der Installation am Handy wird der
 Rechner nicht mehr gebraucht.
──────────────────────────────────────────────────────────`);
