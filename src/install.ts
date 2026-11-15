/**
 * Hinweis „Als App installieren" – nur im Browser, nicht in der installierten App.
 * - iPhone/iPad: Anleitung (iOS hat keinen Installieren-Knopf für Web-Apps)
 * - Android/Chrome: eigener „Installieren"-Knopf, sobald der Browser es anbietet
 */
import { SHARE_ICON, isIOS, isStandalone } from './platform';

const DISMISS_KEY = 'intervall-trainer:installhinweis';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === 'aus';
  } catch {
    return false;
  }
}

function rememberDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, 'aus');
  } catch {
    /* egal */
  }
}

export function setupInstallBanner(app: HTMLElement, onLayoutChange: () => void): void {
  const banner = document.getElementById('install-banner') as HTMLElement;
  const text = document.getElementById('install-text') as HTMLElement;
  const action = document.getElementById('install-action') as HTMLButtonElement;
  const close = document.getElementById('install-close') as HTMLButtonElement;
  let deferred: BeforeInstallPromptEvent | null = null;

  const show = (html: string) => {
    if (isStandalone() || dismissed()) return;
    text.innerHTML = html;
    banner.hidden = false;
    app.classList.add('has-banner');
    onLayoutChange();
  };
  const hide = () => {
    if (banner.hidden) return;
    banner.hidden = true;
    app.classList.remove('has-banner');
    onLayoutChange();
  };

  if (isIOS()) {
    show(`Als App installieren: <b>Teilen</b> ${SHARE_ICON} → <b>„Zum Home-Bildschirm“</b>`);
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    action.hidden = false;
    show('Als App installieren – läuft dann auch ohne Internet.');
  });

  action.addEventListener('click', async () => {
    if (!deferred) return;
    const event = deferred;
    deferred = null;
    await event.prompt();
    await event.userChoice.catch(() => undefined);
    hide();
  });

  close.addEventListener('click', () => {
    rememberDismissed();
    hide();
  });

  window.addEventListener('appinstalled', hide);
}
