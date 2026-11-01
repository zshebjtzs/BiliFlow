import type { DownloadConfig } from '../../types/config'
import { buildYtDlpArgs } from './commandBuilder.ts'
import {
  CommandSerializationError,
  hasPercentReference,
  PERCENT_ENV_VAR,
  serializeWindowsCommand,
} from './commandSerializer.ts'

export interface SpawnedProcessInfo {
  id: number
  pid: number
}

export interface SpawnProcessOptions {
  cwd?: string
  envs?: Record<string, string>
}

export interface ExecutableStats {
  isFile: boolean
}

export interface NativeProcessEvent {
  detail: unknown
}

export interface ProcessRunnerDependencies {
  getAppPath: () => string
  spawnProcess: (
    command: string,
    options?: SpawnProcessOptions,
  ) => Promise<SpawnedProcessInfo>
  updateSpawnedProcess: (id: number, event: string, data?: unknown) => Promise<void>
  getEnvs: () => Promise<Record<string, string>>
  getStats: (path: string) => Promise<ExecutableStats>
  on: (event: string, handler: (event: NativeProcessEvent) => void) => Promise<unknown>
  off: (event: string, handler: (event: NativeProcessEvent) => void) => Promise<unknown>
}

export interface DownloadOutputEvent {
  processId: number
  stream: 'stdout' | 'stderr'
  text: string
}

export interface DownloadExitEvent {
  processId: number
  exitCode: number
}

export type DownloadOutputListener = (event: DownloadOutputEvent) => void
export type DownloadExitListener = (event: DownloadExitEvent) => void

export interface DownloadProcessRunner {
  startDownload: (config: DownloadConfig) => Promise<number>
  cancelDownload: (processId: number) => Promise<boolean>
  onOutput: (listener: DownloadOutputListener) => () => void
  onExit: (listener: DownloadExitListener) => () => void
  dispose: () => Promise<void>
}

export type DownloadProcessErrorCode =
  | 'RUNNER_DISPOSED'
  | 'INVALID_APP_PATH'
  | 'INVALID_URL'
  | 'UNSAFE_COMMAND_ARGUMENT'
  | 'EXECUTABLE_NOT_FOUND'
  | 'EXECUTABLE_NOT_FILE'
  | 'EXECUTABLE_CHECK_FAILED'
  | 'ENVIRONMENT_UNAVAILABLE'
  | 'LISTENER_SETUP_FAILED'
  | 'SPAWN_FAILED'
  | 'CANCEL_FAILED'

export class DownloadProcessError extends Error {
  readonly code: DownloadProcessErrorCode
  readonly cause: unknown

  constructor(code: DownloadProcessErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'DownloadProcessError'
    this.code = code
    this.cause = cause
  }
}

interface RunningProcess {
  id: number
  cancelRequested: boolean
}

interface QueuedEvent {
  processId: number
  action: 'stdOut' | 'stdErr' | 'exit'
  data: unknown
}

const SPAWNED_PROCESS_EVENT = 'spawnedProcess'
const MAX_BUFFERED_EVENTS_PER_PROCESS = 256

function errorCodeOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined
  }

  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : undefined
}

function normalizeYtDlpPath(appPath: string): string {
  if (typeof appPath !== 'string' || appPath.trim().length === 0) {
    throw new DownloadProcessError(
      'INVALID_APP_PATH',
      '无法获取 BiliFlow 的应用目录，不能定位 yt-dlp.exe。',
    )
  }

  const normalized = appPath.replaceAll('/', '\\').replace(/\\+$/, '')
  const executablePath = `${normalized}\\yt-dlp.exe`

  if (!/^(?:[A-Za-z]:\\|\\\\)/.test(executablePath)) {
    throw new DownloadProcessError(
      'INVALID_APP_PATH',
      `BiliFlow 应用目录不是绝对路径，不能安全定位 yt-dlp.exe：${appPath}`,
    )
  }

  return executablePath
}

function isNativeEventAction(action: string): action is QueuedEvent['action'] {
  return action === 'stdOut' || action === 'stdErr' || action === 'exit'
}

function normalizeExitCode(data: unknown): number {
  return typeof data === 'number' && Number.isFinite(data) ? data : -1
}

export function createDownloadProcessRunner(
  dependencies: ProcessRunnerDependencies,
): DownloadProcessRunner {
  const outputListeners = new Set<DownloadOutputListener>()
  const exitListeners = new Set<DownloadExitListener>()
  const processes = new Map<number, RunningProcess>()
  const bufferedEvents = new Map<number, QueuedEvent[]>()

  let disposed = false
  let nativeListenerAttached = false
  let listenerSetup: Promise<void> | undefined
  let pendingSpawns = 0

  function assertActive(): void {
    if (disposed) {
      throw new DownloadProcessError('RUNNER_DISPOSED', '下载进程服务已经关闭。')
    }
  }

  function emitOutput(event: DownloadOutputEvent): void {
    for (const listener of [...outputListeners]) {
      try {
        listener(event)
      } catch (error) {
        console.error('BiliFlow download output listener failed.', error)
      }
    }
  }

  function emitExit(event: DownloadExitEvent): void {
    for (const listener of [...exitListeners]) {
      try {
        listener(event)
      } catch (error) {
        console.error('BiliFlow download exit listener failed.', error)
      }
    }
  }

  function dispatchQueuedEvent(event: QueuedEvent): void {
    if (event.action === 'exit') {
      const process = processes.get(event.processId)
      if (!process) {
        return
      }

      processes.delete(event.processId)
      emitExit({
        processId: event.processId,
        exitCode: normalizeExitCode(event.data),
      })
      return
    }

    if (!processes.has(event.processId)) {
      return
    }

    emitOutput({
      processId: event.processId,
      stream: event.action === 'stdOut' ? 'stdout' : 'stderr',
      text: typeof event.data === 'string' ? event.data : String(event.data ?? ''),
    })
  }

  function handleNativeEvent(event: NativeProcessEvent): void {
    const detail = event.detail
    if (typeof detail !== 'object' || detail === null) {
      return
    }

    const { id, action, data } = detail as {
      id?: unknown
      action?: unknown
      data?: unknown
    }

    if (
      typeof id !== 'number' ||
      !Number.isInteger(id) ||
      typeof action !== 'string' ||
      !isNativeEventAction(action)
    ) {
      return
    }

    const queuedEvent: QueuedEvent = {
      processId: id,
      action,
      data,
    }

    if (processes.has(id)) {
      dispatchQueuedEvent(queuedEvent)
      return
    }

    // A fast child can write before Neutralino responds to spawnProcess. Keep
    // that early output until the response gives us the Neutralino process id.
    if (pendingSpawns > 0) {
      const queued = bufferedEvents.get(id) ?? []
      if (queued.length >= MAX_BUFFERED_EVENTS_PER_PROCESS) {
        queued.shift()
      }
      queued.push(queuedEvent)
      bufferedEvents.set(id, queued)
    }
  }

  async function ensureNativeListener(): Promise<void> {
    if (nativeListenerAttached) {
      return
    }

    if (listenerSetup === undefined) {
      listenerSetup = dependencies
        .on(SPAWNED_PROCESS_EVENT, handleNativeEvent)
        .then(() => {
          nativeListenerAttached = true
        })
        .catch((error: unknown) => {
          listenerSetup = undefined
          throw new DownloadProcessError(
            'LISTENER_SETUP_FAILED',
            '无法监听 yt-dlp 进程输出。',
            error,
          )
        })
    }

    await listenerSetup
  }

  async function ensureExecutableExists(executablePath: string): Promise<void> {
    let stats: ExecutableStats

    try {
      stats = await dependencies.getStats(executablePath)
    } catch (error) {
      if (errorCodeOf(error) === 'NE_FS_NOPATHE') {
        throw new DownloadProcessError(
          'EXECUTABLE_NOT_FOUND',
          `未找到 yt-dlp.exe。请将 yt-dlp.exe 放到 BiliFlow 可执行文件所在目录：${executablePath}`,
          error,
        )
      }

      throw new DownloadProcessError(
        'EXECUTABLE_CHECK_FAILED',
        `无法检查 yt-dlp.exe 是否存在：${executablePath}`,
        error,
      )
    }

    if (!stats.isFile) {
      throw new DownloadProcessError(
        'EXECUTABLE_NOT_FILE',
        `yt-dlp.exe 路径不是可执行文件：${executablePath}`,
      )
    }
  }

  async function buildEnvironment(): Promise<Record<string, string>> {
    let currentEnvironment: Record<string, string>

    try {
      currentEnvironment = await dependencies.getEnvs()
    } catch (error) {
      throw new DownloadProcessError(
        'ENVIRONMENT_UNAVAILABLE',
        '无法读取运行环境，不能安全传递包含百分号的参数。',
        error,
      )
    }

    const environment: Record<string, string> = { ...currentEnvironment }

    for (const key of Object.keys(environment)) {
      if (key.toUpperCase() === PERCENT_ENV_VAR) {
        delete environment[key]
      }
    }

    environment[PERCENT_ENV_VAR] = '%'
    return environment
  }

  async function startDownload(config: DownloadConfig): Promise<number> {
    assertActive()

    if (config.url.trim().length === 0) {
      throw new DownloadProcessError('INVALID_URL', '请先输入视频链接。')
    }

    const executablePath = normalizeYtDlpPath(dependencies.getAppPath())
    await ensureExecutableExists(executablePath)

    let command: string

    try {
      command = serializeWindowsCommand(executablePath, buildYtDlpArgs(config))
    } catch (error) {
      if (error instanceof CommandSerializationError) {
        throw new DownloadProcessError(
          'UNSAFE_COMMAND_ARGUMENT',
          error.message,
          error,
        )
      }

      throw new DownloadProcessError(
        'UNSAFE_COMMAND_ARGUMENT',
        '无法安全构建 yt-dlp 命令。',
        error,
      )
    }

    const options: SpawnProcessOptions | undefined = hasPercentReference(command)
      ? { envs: await buildEnvironment() }
      : undefined

    await ensureNativeListener()

    pendingSpawns += 1

    try {
      let spawned: SpawnedProcessInfo

      try {
        spawned = await dependencies.spawnProcess(command, options)
      } catch (error) {
        throw new DownloadProcessError(
          'SPAWN_FAILED',
          '无法启动 yt-dlp 进程。',
          error,
        )
      }

      if (
        typeof spawned !== 'object' ||
        spawned === null ||
        typeof spawned.id !== 'number' ||
        !Number.isInteger(spawned.id)
      ) {
        throw new DownloadProcessError(
          'SPAWN_FAILED',
          'Neutralino 返回了无效的下载进程标识。',
        )
      }

      if (processes.has(spawned.id)) {
        throw new DownloadProcessError(
          'SPAWN_FAILED',
          `下载进程标识重复：${spawned.id}`,
        )
      }

      processes.set(spawned.id, {
        id: spawned.id,
        cancelRequested: false,
      })

      const queued = bufferedEvents.get(spawned.id)
      if (queued !== undefined) {
        bufferedEvents.delete(spawned.id)
        for (const event of queued) {
          dispatchQueuedEvent(event)
        }
      }

      return spawned.id
    } finally {
      pendingSpawns -= 1
      if (pendingSpawns === 0) {
        bufferedEvents.clear()
      }
    }
  }

  async function cancelDownload(processId: number): Promise<boolean> {
    assertActive()

    const process = processes.get(processId)
    if (process === undefined || process.cancelRequested) {
      return false
    }

    process.cancelRequested = true

    try {
      await dependencies.updateSpawnedProcess(processId, 'exit')
      return true
    } catch (error) {
      process.cancelRequested = false

      // The process may have ended between the state lookup and the native
      // call. Treat that as "already finished" rather than cancelling again.
      if (errorCodeOf(error) === 'NE_OS_UNLTOUP') {
        return false
      }

      throw new DownloadProcessError(
        'CANCEL_FAILED',
        '无法取消 yt-dlp 进程。',
        error,
      )
    }
  }

  function onOutput(listener: DownloadOutputListener): () => void {
    outputListeners.add(listener)

    return () => {
      outputListeners.delete(listener)
    }
  }

  function onExit(listener: DownloadExitListener): () => void {
    exitListeners.add(listener)

    return () => {
      exitListeners.delete(listener)
    }
  }

  async function dispose(): Promise<void> {
    if (disposed) {
      return
    }

    disposed = true
    outputListeners.clear()
    exitListeners.clear()
    processes.clear()
    bufferedEvents.clear()

    if (listenerSetup !== undefined) {
      try {
        await listenerSetup
      } catch {
        // A failed listener setup has nothing to remove.
      }
    }

    if (nativeListenerAttached) {
      await dependencies.off(SPAWNED_PROCESS_EVENT, handleNativeEvent)
      nativeListenerAttached = false
    }
  }

  return {
    startDownload,
    cancelDownload,
    onOutput,
    onExit,
    dispose,
  }
}
