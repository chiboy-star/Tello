/**
 * Dispatches the ready signal indicating:
 * 1. React is hydrated
 * 2. Auth / session check resolved
 * 3. Initial route skeleton or content is mounted
 */
export function signalAppReady() {
  if (typeof window !== 'undefined') {
    if ((window as any).__TALLO_DELAY_APP_READY_MS) {
      setTimeout(() => {
        (window as any).__TALLO_APP_READY = true;
        window.dispatchEvent(new CustomEvent('tallo:app-ready'));
      }, (window as any).__TALLO_DELAY_APP_READY_MS);
      return;
    }
    if ((window as any).__TALLO_SUPPRESS_APP_READY) {
      return;
    }
    (window as any).__TALLO_APP_READY = true;
    window.dispatchEvent(new CustomEvent('tallo:app-ready'));
  }
}

export function isAppReady(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).__TALLO_APP_READY);
}
