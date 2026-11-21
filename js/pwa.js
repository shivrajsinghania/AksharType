/**
 * AksharType — PWA Registration, In-App Install Prompt & Offline Connectivity Monitor
 */

import { registerSW } from 'virtual:pwa-register';

export function initPWA({ installBtn, iosModal, iosCloseBtn, offlineBanner }) {
  // 1. Register Service Worker for 100% offline precaching + automatic updates
  try {
    registerSW({
      immediate: true,
      onOfflineReady() {
        // App shell and assets are cached for 100% offline usage
      },
    });
  } catch {
    // Gracefully skip if SW is blocked in a restricted sandbox
  }

  // 2. Detect standalone installed state & iOS Safari
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);

  let deferredPrompt = null;

  function updateInstallButtonVisibility() {
    if (!installBtn) return;
    if (isStandalone) {
      installBtn.classList.add('is-hidden');
      return;
    }
    if (deferredPrompt || isIOS) {
      installBtn.classList.remove('is-hidden');
      installBtn.textContent = isIOS && !deferredPrompt ? 'Install on iOS' : 'Install App';
    } else {
      installBtn.classList.add('is-hidden');
    }
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    updateInstallButtonVisibility();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installBtn) installBtn.classList.add('is-hidden');
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        try {
          const choice = await deferredPrompt.userChoice;
          if (choice && choice.outcome === 'accepted') {
            deferredPrompt = null;
            updateInstallButtonVisibility();
          }
        } catch {
          // Ignore dismissed prompt errors
        }
      } else if (isIOS && iosModal) {
        iosModal.classList.remove('is-hidden');
      }
    });
  }

  if (iosCloseBtn && iosModal) {
    iosCloseBtn.addEventListener('click', () => {
      iosModal.classList.add('is-hidden');
    });
    iosModal.addEventListener('click', (e) => {
      if (e.target === iosModal) iosModal.classList.add('is-hidden');
    });
  }

  updateInstallButtonVisibility();

  // 3. Offline / Online connectivity indicator
  function syncConnectivity() {
    if (!offlineBanner) return;
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    offlineBanner.classList.toggle('is-hidden', !isOffline);
  }

  window.addEventListener('online', syncConnectivity);
  window.addEventListener('offline', syncConnectivity);
  syncConnectivity();
}
