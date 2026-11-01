import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import {
  CommandSerializationError,
  hasPercentReference,
  PERCENT_ENV_VAR,
  quoteWindowsArgument,
  serializeWindowsCommand,
} from './commandSerializer.ts'

const YT_DLP = 'C:\\Program Files\\BiliFlow\\yt-dlp.exe'

function runThroughCmd(args: string[], delayedExpansion = false): string[] {
  const probe = 'process.stdout.write(JSON.stringify(process.argv.slice(1)))'
  const command = serializeWindowsCommand(process.execPath, [
    '-e',
    probe,
    ...args,
  ])
  const outerCommand = `"${command}"`
  const cmdArgs = delayedExpansion
    ? ['/v:on', '/c', outerCommand]
    : ['/c', outerCommand]
  const result = spawnSync('cmd.exe', cmdArgs, {
    windowsVerbatimArguments: true,
    encoding: 'utf8',
    env: { ...process.env, [PERCENT_ENV_VAR]: '%' },
  })

  assert.equal(
    result.status,
    0,
    `cmd.exe failed (${result.status}): ${result.stderr}`,
  )

  return JSON.parse(result.stdout) as string[]
}

test('quotes an executable path containing spaces', () => {
  assert.equal(
    serializeWindowsCommand(YT_DLP, ['--format', 'bv*+ba/b']),
    '"C:\\Program Files\\BiliFlow\\yt-dlp.exe" "--format" "bv*+ba/b"',
  )
})

test('keeps ampersands, pipes, dollars and parentheses inside quoted arguments', () => {
  assert.equal(
    quoteWindowsArgument('a&b|c$d(e)'),
    '"a&b|c$d(e)"',
  )
})

test('preserves Chinese characters and spaces in one argument', () => {
  assert.equal(
    quoteWindowsArgument('D:\\下载的视频\\Bili Flow\\收藏'),
    '"D:\\下载的视频\\Bili Flow\\收藏"',
  )
})

test('represents literal double quotes as doubled quotes for cmd.exe', () => {
  assert.equal(quoteWindowsArgument('a"b&c'), '"a""b&c"')
  assert.equal(quoteWindowsArgument('"quoted"'), '"""quoted"""')
  assert.equal(quoteWindowsArgument('a""b'), '"a""""b"')
})

test('doubles backslashes before literal quotes and before the closing quote', () => {
  assert.equal(quoteWindowsArgument('a\\"b'), '"a\\\\""b"')
  assert.equal(quoteWindowsArgument('abc\\'), '"abc\\\\"')
  assert.equal(quoteWindowsArgument('a\\\\"b'), '"a\\\\\\\\""b"')
})

test('keeps an empty argument as one empty argv value', () => {
  assert.equal(quoteWindowsArgument(''), '""')
})

test('emits bangs outside quoted chunks for delayed-expansion safety', () => {
  assert.equal(quoteWindowsArgument('a!b'), '"a"^!"b"')
  assert.equal(quoteWindowsArgument('!'), '^!')
  assert.equal(quoteWindowsArgument('a!!b'), '"a"^!^!"b"')
  assert.equal(quoteWindowsArgument('a! b'), '"a"^!" b"')
})

test('replaces literal percent signs with an environment reference', () => {
  const quoted = quoteWindowsArgument('a%TEMP%b')

  assert.equal(
    quoted,
    '"a%BILIFLOW_PERCENT%TEMP%BILIFLOW_PERCENT%b"',
  )
  assert.equal(hasPercentReference(quoted), true)
  assert.equal(hasPercentReference(quoteWindowsArgument('plain')), false)
})

test('rejects arguments that cmd.exe cannot receive safely', () => {
  for (const value of ['a^b', 'line\nbreak', 'nul\u0000byte']) {
    assert.throws(
      () => quoteWindowsArgument(value),
      (error: unknown) =>
        error instanceof CommandSerializationError &&
        error.reason === 'UNSUPPORTED_CHARACTER',
    )
  }
})

test('requires an absolute Windows executable path', () => {
  for (const path of ['yt-dlp.exe', '.\\yt-dlp.exe', 'C:yt-dlp.exe', '']) {
    assert.throws(
      () => serializeWindowsCommand(path, ['--version']),
      (error: unknown) =>
        error instanceof CommandSerializationError &&
        error.reason === 'INVALID_EXECUTABLE_PATH',
    )
  }
})

test(
  'cmd.exe round-trips spaces, Chinese, quotes, backslashes and metacharacters',
  { skip: process.platform !== 'win32' },
  () => {
    const args = [
      'a b',
      '中文 路径\\视频',
      'a"b',
      '"quoted"',
      'a\\"b\\\\c',
      'backslash\\',
      'a&b|c<d>e(f)$g',
      'https://example.com/watch?v=a%20b&x=%TEMP%#t=10',
      'a!b!c',
      'combo !"\\%&|()$ 中文',
      '',
    ]

    assert.deepEqual(runThroughCmd(args), args)
  },
)

test(
  'cmd.exe round-trips the same arguments with delayed expansion enabled',
  { skip: process.platform !== 'win32' },
  () => {
    const args = [
      'a b',
      '中文 路径\\视频',
      'a"b&c',
      'a\\"b',
      'a%TEMP%b',
      'a!TEMP!b',
      'combo !"\\%&|()$ 中文',
      '',
    ]

    assert.deepEqual(runThroughCmd(args, true), args)
  },
)
