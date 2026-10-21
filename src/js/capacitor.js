/**
 * Capacitor bridge helpers — platform detection and native plugin bootstrapping.
 */

export function isNativePlatform() {
  return typeof window !== 'undefined' && !!window.Capacitor;
}

/** Ensure the native runtime is ready before touching plugins. */
export async function waitForCapacitor() {
  if (!isNativePlatform()) return;

  const { Capacitor } = window;
  if (Capacitor.isPluginAvailable && Capacitor.isPluginAvailable('CapacitorSQLite')) {
    // Native runtime already ready
  }

  await new Promise((resolve) => {
    if (Capacitor.isReady !== undefined) {
      Capacitor.isReady ? resolve() : Capacitor.addListener?.('appReady', resolve);
      // Fallback resolution in case the event never fires
      setTimeout(resolve, 1000);
    } else {
      resolve();
    }
  });
}
