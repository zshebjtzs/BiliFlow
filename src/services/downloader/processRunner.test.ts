import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_DOWNLOAD_CONFIG } from '../../types/config.ts'
import type { DownloadConfig } from '../../types/config.ts'
import { buildYtDlpArgs } from './commandBuilder.ts'
import { PERCENT_ENV_VAR } from './commandSerializer.ts'
import { serializeWindowsCommand } from './commandSerializer.ts'
import {
  createDownloadProcessRunner,
  DownloadProcessError,
} from './processRunner.ts'
import type {
  DownloadExitEvent,
  DownloadOutputEvent,
  NativeProcessEvent,
  ProcessRunnerDependencies,
  SpawnedProcessInfo,
  SpawnProcessOptions,
} from './processRunner.ts'

const APP_PATH = 'C:\\Apps\\BiliFlow'
const YT_DLP_PATH = `${APP_PATH}\\yt-dlp.exe`
const SAMPLE_URL = 'https://www.bilibili.com/video/BV1xx411c7mD'

function makeConfig(overrides: Partial<DownloadConfig> = {}): DownloadConfig {
  return {
    ...DEFAULT_DOWNLOAD_CONFIG,
    url: SAMPLE_URL,
    ...overrides,
  }
}

interface SpawnCall {
  command: string
  options?: SpawnProcessOptions
}

interface UpdateCall {
  id: number
  event: string
  data?: unknown
}

interface ListenerCall {
  event: string
  handler: (event: NativeProcessEvent) => void
}

function createHarness() {
  const spawnCalls: SpawnCall[] = []
  const updateCalls: UpdateCall[] = []
  const execCalls: string[] = []
  const statsCalls: string[] = []
  const onCalls: ListenerCall[] = []
  const offCalls: ListenerCall[] = []
  let envCalls = 0
  let nextId = 1

  const defaultSpawn = async (): Promise<SpawnedProcessInfo> => ({
    id: nextId++,
    pid: 4000 + nextId,
  })

  const state = {
    appPath: APP_PATH,
    envs: { PATH: 'C:\\Windows' } as Record<string, string>,
    spawnImpl: defaultSpawn,
    updateImpl: async (): Promise<void> => {},
    execImpl: async (): Promise<{ exitCode: number }> => ({ exitCode: 0 }),
    statsImpl: async (): Promise<{ isFile: boolean }> => ({ isFile: true }),
    envsImpl: async (): Promise<Record<string, string>> => state.envs,
    onImpl: async (): Promise<unknown> => ({}),
    defaultSpawn,
  }

  const dependencies: ProcessRunnerDependencies = {
    getAppPath: () => state.appPath,
    spawnProcess: async (command, options) => {
      spawnCalls.push({ command, options })
      return state.spawnImpl()
    },
    updateSpawnedProcess: async (id, event, data) => {
      updateCalls.push({ id, event, data })
      await state.updateImpl()
    },
    execCommand: async (command) => {
      execCalls.push(command)
      return state.execImpl()
    },
    getEnvs: async () => {
      envCalls += 1
      return state.envsImpl()
    },
    getStats: async (path) => {
      statsCalls.push(path)
      return state.statsImpl()
    },
    on: async (event, handler) => {
      onCalls.push({ event, handler })
      return state.onImpl()
    },
    off: async (event, handler) => {
      offCalls.push({ event, handler })
      return {}
    },
  }

  function emit(processId: number, action: string, data?: unknown): void {
    const listener = onCalls[0]
    assert.ok(listener, 'native listener must be registered before emitting')
    listener.handler({ detail: { id: processId, action, data } })
  }

  function emitRaw(event: NativeProcessEvent): void {
    const listener = onCalls[0]
    assert.ok(listener, 'native listener must be registered before emitting')
    listener.handler(event)
  }

  return {
    dependencies,
    state,
    spawnCalls,
    updateCalls,
    execCalls,
    statsCalls,
    onCalls,
    offCalls,
    emit,
    emitRaw,
    get envCalls() {
      return envCalls
    },
  }
}

function errorIs(code: string) {
  return (error: unknown): boolean =>
    error instanceof DownloadProcessError && error.code === code
}

async function waitFor(
  condition: () => boolean,
  message = 'condition was not reached',
): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (condition()) {
      return
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }

  assert.fail(message)
}

test('starts yt-dlp from the app directory and returns the Neutralino process id', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)
  const config = makeConfig({
    quality: '720p',
    codec: 'h264',
    cookieSource: 'edge',
    savePath: 'D:\\下载的视频\\Bili Flow',
  })

  try {
    const processId = await runner.startDownload(config)

    assert.equal(processId, 1)
    assert.deepEqual(harness.statsCalls, [YT_DLP_PATH])
    assert.equal(harness.spawnCalls.length, 1)
    assert.equal(
      harness.spawnCalls[0].command,
      serializeWindowsCommand(YT_DLP_PATH, buildYtDlpArgs(config)),
    )
    assert.equal(harness.spawnCalls[0].options, undefined)
    assert.equal(harness.envCalls, 0)
    assert.deepEqual(
      harness.onCalls.map(({ event }) => event),
      ['spawnedProcess'],
    )
  } finally {
    await runner.dispose()
  }
})

test('passes a merged environment when arguments contain percent signs', async () => {
  const harness = createHarness()
  harness.state.envs = {
    PATH: 'C:\\Windows',
    biliflow_percent: 'wrong value',
    TEMP: 'C:\\Temp',
  }
  const runner = createDownloadProcessRunner(harness.dependencies)
  const config = makeConfig({
    savePath: 'D:\\100%\\视频',
    url: `${SAMPLE_URL}?x=%20%TEMP%`,
  })

  try {
    await runner.startDownload(config)

    assert.equal(harness.envCalls, 1)
    const envs = harness.spawnCalls[0].options?.envs
    assert.ok(envs)
    assert.equal(envs[PERCENT_ENV_VAR], '%')
    assert.equal(envs.PATH, 'C:\\Windows')
    assert.equal(envs.TEMP, 'C:\\Temp')
    assert.equal(
      Object.keys(envs).some(
        (key) => key !== PERCENT_ENV_VAR && key.toUpperCase() === PERCENT_ENV_VAR,
      ),
      false,
    )
    assert.match(
      harness.spawnCalls[0].command,
      /%BILIFLOW_PERCENT%/,
    )
  } finally {
    await runner.dispose()
  }
})

test('reports environment failures instead of spawning with unsafe percent handling', async () => {
  const harness = createHarness()
  harness.state.envsImpl = async () => {
    throw new Error('environment unavailable')
  }
  const runner = createDownloadProcessRunner(harness.dependencies)

  try {
    await assert.rejects(
      runner.startDownload(makeConfig({ savePath: 'D:\\100%' })),
      errorIs('ENVIRONMENT_UNAVAILABLE'),
    )
    assert.equal(harness.spawnCalls.length, 0)
  } finally {
    await runner.dispose()
  }
})

test('checks the executable before spawning', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)

  try {
    harness.state.statsImpl = async () => {
      throw Object.assign(new Error('missing'), { code: 'NE_FS_NOPATHE' })
    }
    await assert.rejects(
      runner.startDownload(makeConfig()),
      errorIs('EXECUTABLE_NOT_FOUND'),
    )

    harness.state.statsImpl = async () => {
      throw new Error('permission denied')
    }
    await assert.rejects(
      runner.startDownload(makeConfig()),
      errorIs('EXECUTABLE_CHECK_FAILED'),
    )

    harness.state.statsImpl = async () => ({ isFile: false })
    await assert.rejects(
      runner.startDownload(makeConfig()),
      errorIs('EXECUTABLE_NOT_FILE'),
    )

    assert.equal(harness.spawnCalls.length, 0)
    assert.equal(harness.onCalls.length, 0)
  } finally {
    await runner.dispose()
  }
})

test('rejects relative app paths, blank URLs and unsafe arguments', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)

  try {
    harness.state.appPath = 'relative\\BiliFlow'
    await assert.rejects(
      runner.startDownload(makeConfig()),
      errorIs('INVALID_APP_PATH'),
    )

    harness.state.appPath = ''
    await assert.rejects(
      runner.startDownload(makeConfig()),
      errorIs('INVALID_APP_PATH'),
    )

    harness.state.appPath = APP_PATH
    await assert.rejects(
      runner.startDownload(makeConfig({ url: '   ' })),
      errorIs('INVALID_URL'),
    )

    await assert.rejects(
      runner.startDownload(
        makeConfig({
          url: `${SAMPLE_URL}?x=^&y=1`,
        }),
      ),
      errorIs('UNSAFE_COMMAND_ARGUMENT'),
    )

    assert.equal(harness.spawnCalls.length, 0)
    assert.equal(harness.onCalls.length, 0)
  } finally {
    await runner.dispose()
  }
})

test('wraps spawn exceptions and allows a later retry', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)

  try {
    harness.state.spawnImpl = async () => {
      throw new Error('spawn failed')
    }
    await assert.rejects(
      runner.startDownload(makeConfig()),
      errorIs('SPAWN_FAILED'),
    )

    harness.state.spawnImpl = harness.state.defaultSpawn
    const processId = await runner.startDownload(makeConfig())

    assert.equal(processId, 1)
    assert.equal(harness.spawnCalls.length, 2)
    assert.equal(harness.onCalls.length, 1)
  } finally {
    await runner.dispose()
  }
})

test('rejects malformed Neutralino process identifiers', async () => {
  const harness = createHarness()
  harness.state.spawnImpl = async () =>
    ({ id: Number.NaN, pid: 1 }) as SpawnedProcessInfo
  const runner = createDownloadProcessRunner(harness.dependencies)

  try {
    await assert.rejects(
      runner.startDownload(makeConfig()),
      errorIs('SPAWN_FAILED'),
    )
  } finally {
    await runner.dispose()
  }
})

test('reports listener setup failures and retries setup on the next start', async () => {
  const harness = createHarness()
  harness.state.onImpl = async () => {
    throw new Error('listener failed')
  }
  const runner = createDownloadProcessRunner(harness.dependencies)

  try {
    await assert.rejects(
      runner.startDownload(makeConfig()),
      errorIs('LISTENER_SETUP_FAILED'),
    )
    assert.equal(harness.spawnCalls.length, 0)

    harness.state.onImpl = async () => ({})
    const processId = await runner.startDownload(makeConfig())

    assert.equal(processId, 1)
    assert.equal(harness.onCalls.length, 2)
    assert.equal(harness.spawnCalls.length, 1)
  } finally {
    await runner.dispose()
  }
})

test('dispatches stdout and stderr with the Neutralino process id', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)
  const output: DownloadOutputEvent[] = []
  runner.onOutput((event) => output.push(event))

  try {
    const firstId = await runner.startDownload(makeConfig())
    const secondId = await runner.startDownload(
      makeConfig({ url: 'https://example.com/other' }),
    )

    assert.notEqual(firstId, secondId)
    harness.emit(firstId, 'stdOut', 'first stdout')
    harness.emit(secondId, 'stdErr', 'second stderr')
    harness.emit(999, 'stdOut', 'unknown process')

    assert.deepEqual(output, [
      { processId: firstId, stream: 'stdout', text: 'first stdout' },
      { processId: secondId, stream: 'stderr', text: 'second stderr' },
    ])
  } finally {
    await runner.dispose()
  }
})

test('dispatches exit codes once and removes the process state', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)
  const exits: DownloadExitEvent[] = []
  runner.onOutput(() => {
    assert.fail('exit should not be emitted as output')
  })
  runner.onExit((event) => exits.push(event))

  try {
    const processId = await runner.startDownload(makeConfig())

    harness.emit(processId, 'exit', 42)
    harness.emit(processId, 'stdOut', 'after exit')
    harness.emit(processId, 'exit', 43)

    assert.deepEqual(exits, [{ processId, exitCode: 42 }])
    assert.equal(await runner.cancelDownload(processId), false)
    assert.equal(harness.updateCalls.length, 0)
  } finally {
    await runner.dispose()
  }
})

test('preserves a zero exit code', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)
  const exits: DownloadExitEvent[] = []
  runner.onExit((event) => exits.push(event))

  try {
    const processId = await runner.startDownload(makeConfig())
    harness.emit(processId, 'exit', 0)

    assert.deepEqual(exits, [{ processId, exitCode: 0 }])
  } finally {
    await runner.dispose()
  }
})

test('cancels a running process once and ignores repeated cancellation', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)
  const exits: DownloadExitEvent[] = []
  runner.onExit((event) => exits.push(event))

  try {
    const processId = await runner.startDownload(makeConfig())

    assert.equal(await runner.cancelDownload(processId), true)
    assert.equal(await runner.cancelDownload(processId), false)
    assert.equal(harness.execCalls.length, 1)
    assert.match(
      harness.execCalls[0],
      /^"%SystemRoot%\\System32\\taskkill\.exe" \/PID \d+ \/T \/F$/,
    )
    assert.equal(harness.updateCalls.length, 0)

    harness.emit(processId, 'exit', 1)
    assert.deepEqual(exits, [{ processId, exitCode: 1 }])
    assert.equal(await runner.cancelDownload(processId), false)
    assert.equal(harness.execCalls.length, 1)
  } finally {
    await runner.dispose()
  }
})

test('surfaces cancellation failures and permits a retry', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)

  try {
    const processId = await runner.startDownload(makeConfig())
    harness.state.execImpl = async () => ({ exitCode: 1 })
    harness.state.updateImpl = async () => {
      throw new Error('cancel failed')
    }

    await assert.rejects(
      runner.cancelDownload(processId),
      errorIs('CANCEL_FAILED'),
    )

    harness.state.updateImpl = async () => {}
    assert.equal(await runner.cancelDownload(processId), true)
    assert.equal(harness.execCalls.length, 2)
    assert.equal(harness.updateCalls.length, 2)
  } finally {
    await runner.dispose()
  }
})

test('falls back to Neutralino exit when taskkill cannot run', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)

  try {
    const processId = await runner.startDownload(makeConfig())
    harness.state.execImpl = async () => {
      throw new Error('taskkill blocked')
    }

    assert.equal(await runner.cancelDownload(processId), true)
    assert.deepEqual(harness.updateCalls, [
      { id: processId, event: 'exit', data: undefined },
    ])
  } finally {
    await runner.dispose()
  }
})

test('treats an already-ended native process as no longer cancellable', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)

  try {
    const processId = await runner.startDownload(makeConfig())
    harness.state.execImpl = async () => ({ exitCode: 1 })
    harness.state.updateImpl = async () => {
      throw Object.assign(new Error('process is gone'), {
        code: 'NE_OS_UNLTOUP',
      })
    }

    assert.equal(await runner.cancelDownload(processId), false)

    harness.emit(processId, 'exit', 0)
    assert.equal(await runner.cancelDownload(processId), false)
  } finally {
    await runner.dispose()
  }
})

test('does not cancel unknown process identifiers', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)

  try {
    assert.equal(await runner.cancelDownload(12345), false)
    assert.equal(harness.updateCalls.length, 0)
  } finally {
    await runner.dispose()
  }
})

test('registers the native listener once across concurrent starts', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)

  try {
    const ids = await Promise.all([
      runner.startDownload(makeConfig()),
      runner.startDownload(makeConfig({ url: 'https://example.com/second' })),
    ])

    assert.equal(new Set(ids).size, 2)
    assert.equal(harness.onCalls.length, 1)
  } finally {
    await runner.dispose()
  }
})

test('deduplicates subscriber registration and unsubscribes cleanly', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)
  const output: DownloadOutputEvent[] = []
  const listener = (event: DownloadOutputEvent): void => {
    output.push(event)
  }

  try {
    const unsubscribeFirst = runner.onOutput(listener)
    runner.onOutput(listener)
    const processId = await runner.startDownload(makeConfig())

    harness.emit(processId, 'stdOut', 'one')
    assert.equal(output.length, 1)

    unsubscribeFirst()
    unsubscribeFirst()
    harness.emit(processId, 'stdOut', 'two')
    assert.equal(output.length, 1)
  } finally {
    await runner.dispose()
  }
})

test('buffers output that arrives before spawnProcess returns an id', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)
  const output: DownloadOutputEvent[] = []
  runner.onOutput((event) => output.push(event))

  let resolveSpawn: (value: SpawnedProcessInfo) => void = () => {}
  harness.state.spawnImpl = () =>
    new Promise<SpawnedProcessInfo>((resolve) => {
      resolveSpawn = resolve
    })

  try {
    const startPromise = runner.startDownload(makeConfig())
    await waitFor(
      () => harness.spawnCalls.length === 1,
      'spawnProcess was not called',
    )

    harness.emit(7, 'stdOut', 'early output')
    resolveSpawn({ id: 7, pid: 700 })

    assert.equal(await startPromise, 7)
    assert.deepEqual(output, [
      { processId: 7, stream: 'stdout', text: 'early output' },
    ])
  } finally {
    await runner.dispose()
  }
})

test('buffers an early exit event and still cleans up process state', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)
  const exits: DownloadExitEvent[] = []
  runner.onExit((event) => exits.push(event))

  let resolveSpawn: (value: SpawnedProcessInfo) => void = () => {}
  harness.state.spawnImpl = () =>
    new Promise<SpawnedProcessInfo>((resolve) => {
      resolveSpawn = resolve
    })

  try {
    const startPromise = runner.startDownload(makeConfig())
    await waitFor(
      () => harness.spawnCalls.length === 1,
      'spawnProcess was not called',
    )

    harness.emit(8, 'exit', 3)
    resolveSpawn({ id: 8, pid: 800 })
    await startPromise

    assert.deepEqual(exits, [{ processId: 8, exitCode: 3 }])
    assert.equal(await runner.cancelDownload(8), false)
    assert.equal(harness.updateCalls.length, 0)
  } finally {
    await runner.dispose()
  }
})

test('ignores malformed native events', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)
  const output: DownloadOutputEvent[] = []
  const exits: DownloadExitEvent[] = []
  runner.onOutput((event) => output.push(event))
  runner.onExit((event) => exits.push(event))

  try {
    await runner.startDownload(makeConfig())
    harness.emitRaw({ detail: null })
    harness.emitRaw({ detail: { id: '1', action: 'stdOut', data: 'x' } })
    harness.emitRaw({ detail: { id: 1, action: 'unknown', data: 'x' } })
    harness.emitRaw({ detail: { id: 1, action: 'stdOut', data: {} } })

    assert.deepEqual(output, [
      { processId: 1, stream: 'stdout', text: '[object Object]' },
    ])
    assert.deepEqual(exits, [])
  } finally {
    await runner.dispose()
  }
})

test('dispose terminates tracked processes and rejects later starts', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)

  await runner.startDownload(makeConfig())
  await runner.dispose()

  assert.equal(harness.execCalls.length, 1)
  assert.match(
    harness.execCalls[0],
    /^"%SystemRoot%\\System32\\taskkill\.exe" \/PID \d+ \/T \/F$/,
  )
  assert.equal(harness.updateCalls.length, 0)
  assert.equal(harness.offCalls.length, 1)
  assert.equal(harness.offCalls[0].event, 'spawnedProcess')
  await assert.rejects(
    runner.startDownload(makeConfig()),
    errorIs('RUNNER_DISPOSED'),
  )

  await runner.dispose()
  assert.equal(harness.offCalls.length, 1)
})

test('dispose waits for an in-flight spawn and terminates the created process', async () => {
  const harness = createHarness()
  const runner = createDownloadProcessRunner(harness.dependencies)
  let resolveSpawn: (value: SpawnedProcessInfo) => void = () => {}
  let resolveExit: (value: { exitCode: number }) => void = () => {}

  harness.state.spawnImpl = () =>
    new Promise<SpawnedProcessInfo>((resolve) => {
      resolveSpawn = resolve
    })
  harness.state.execImpl = () =>
    new Promise<{ exitCode: number }>((resolve) => {
      resolveExit = resolve
    })

  const startRejected = assert.rejects(
    runner.startDownload(makeConfig()),
    errorIs('RUNNER_DISPOSED'),
  )
  await waitFor(
    () => harness.spawnCalls.length === 1,
    'spawnProcess was not called',
  )

  const disposePromise = runner.dispose()
  assert.equal(harness.offCalls.length, 0)

  resolveSpawn({ id: 9, pid: 900 })
  await waitFor(
    () => harness.execCalls.length === 1,
    'the in-flight process was not asked to exit',
  )

  let disposeSettled = false
  void disposePromise.then(() => {
    disposeSettled = true
  })
  await new Promise<void>((resolve) => setTimeout(resolve, 0))

  assert.equal(disposeSettled, false)
  assert.equal(harness.offCalls.length, 0)
  assert.match(
    harness.execCalls[0],
    /^"%SystemRoot%\\System32\\taskkill\.exe" \/PID 900 \/T \/F$/,
  )
  assert.equal(harness.updateCalls.length, 0)

  resolveExit({ exitCode: 0 })
  await startRejected
  await disposePromise

  assert.equal(harness.offCalls.length, 1)
  assert.equal(harness.offCalls[0].handler, harness.onCalls[0].handler)

  await assert.rejects(
    runner.startDownload(makeConfig()),
    errorIs('RUNNER_DISPOSED'),
  )
})
