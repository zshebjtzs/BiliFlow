import { init } from '@neutralinojs/lib'

/**
 * Neutralino injects its globals before the app script runs when the page is
 * loaded inside the desktop window. The browser-only Vite preview does not
 * have them, so native client initialization must stay behind this guard.
 */
export function isNeutralinoRuntime(): boolean {
  return typeof window !== 'undefined' && 'NL_PORT' in window
}

export function initDesktopRuntime(): void {
  if (!isNeutralinoRuntime()) {
    return
  }

  init()
}
