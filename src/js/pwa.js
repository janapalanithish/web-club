/**
 * PWA registration and install prompt handling.
 */

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Service workers are not available in the Capacitor Android WebView
  // (it serves from a local origin), and registering there can break asset loading.
  if (window.Capacitor) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('Service worker registration failed:', err));
  });
}
