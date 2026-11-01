import { events, filesystem, os } from '@neutralinojs/lib'
import { createDownloadProcessRunner } from './processRunner'
import type { DownloadProcessRunner } from './processRunner'

let runner: DownloadProcessRunner | undefined

/**
 * `NL_PATH` is absolute in a packaged app, but Neutralino's dev runner starts
 * the binary with `--path=.`, so development builds need `NL_CWD` to turn the
 * relative app path into an absolute one.
 */
function resolveAppPath(): string {
  const appPath = window.NL_PATH

  if (/^(?:[A-Za-z]:[\\/]|\\\\)/.test(appPath) || appPath.length === 0) {
    return appPath
  }

  const basePath = window.NL_CWD.replace(/[\\/]+$/, '')
  return basePath.length > 0 ? `${basePath}\\${appPath}` : appPath
}

/**
 * Returns the single download process service used by the desktop UI. Native
 * Neutralino APIs stay in this module so Vue components never call them
 * directly.
 */
export function getDownloadProcessRunner(): DownloadProcessRunner {
  if (runner === undefined) {
    runner = createDownloadProcessRunner({
      getAppPath: resolveAppPath,
      spawnProcess: os.spawnProcess,
      updateSpawnedProcess: os.updateSpawnedProcess,
      execCommand: os.execCommand,
      getEnvs: os.getEnvs,
      getStats: filesystem.getStats,
      on: events.on,
      off: events.off,
    })
  }

  return runner
}
