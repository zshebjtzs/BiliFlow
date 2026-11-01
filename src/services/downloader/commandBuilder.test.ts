import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_DOWNLOAD_CONFIG } from '../../types/config.ts'
import type {
  CookieSource,
  DownloadConfig,
  VideoCodec,
  VideoQuality,
} from '../../types/config.ts'
import { buildYtDlpArgs } from './commandBuilder.ts'

const SAMPLE_URL = 'https://www.bilibili.com/video/BV1xx411c7mD'

function makeConfig(overrides: Partial<DownloadConfig> = {}): DownloadConfig {
  return {
    ...DEFAULT_DOWNLOAD_CONFIG,
    url: SAMPLE_URL,
    ...overrides,
  }
}

test('builds the default configuration without extra options', () => {
  assert.deepEqual(buildYtDlpArgs(DEFAULT_DOWNLOAD_CONFIG), ['--format', 'bv*+ba/b', ''])
})

const qualityCases: Array<{ quality: VideoQuality; format: string }> = [
  { quality: 'best', format: 'bv*+ba/b' },
  { quality: '1080p', format: 'bv*[height<=1080]+ba/b[height<=1080]' },
  { quality: '720p', format: 'bv*[height<=720]+ba/b[height<=720]' },
  { quality: '480p', format: 'bv*[height<=480]+ba/b[height<=480]' },
]

for (const { quality, format } of qualityCases) {
  test(`maps quality "${quality}" to the expected format selector`, () => {
    assert.deepEqual(buildYtDlpArgs(makeConfig({ quality })), [
      '--format',
      format,
      SAMPLE_URL,
    ])
  })
}

const codecCases: Array<{ codec: VideoCodec; formatSort?: string }> = [
  { codec: 'auto' },
  { codec: 'h264', formatSort: 'vcodec:h264' },
  { codec: 'hevc', formatSort: 'vcodec:h265' },
  { codec: 'av1', formatSort: 'vcodec:av01' },
]

for (const { codec, formatSort } of codecCases) {
  test(`maps codec "${codec}" to the expected format-sort preference`, () => {
    const expected = ['--format', 'bv*+ba/b']
    if (formatSort !== undefined) {
      expected.push('--format-sort', formatSort)
    }
    expected.push(SAMPLE_URL)

    assert.deepEqual(buildYtDlpArgs(makeConfig({ codec })), expected)
  })
}

const cookieCases: Array<{ source: CookieSource; browser?: string }> = [
  { source: 'none' },
  { source: 'edge', browser: 'edge' },
  { source: 'chrome', browser: 'chrome' },
  { source: 'firefox', browser: 'firefox' },
]

for (const { source, browser } of cookieCases) {
  test(`maps cookie source "${source}" to separate argument values`, () => {
    const expected = ['--format', 'bv*+ba/b']
    if (browser !== undefined) {
      expected.push('--cookies-from-browser', browser)
    }
    expected.push(SAMPLE_URL)

    assert.deepEqual(buildYtDlpArgs(makeConfig({ cookieSource: source })), expected)
  })
}

test('omits --paths for an empty save directory', () => {
  const args = buildYtDlpArgs(makeConfig({ savePath: '' }))

  assert.equal(args.includes('--paths'), false)
})

test('omits --paths for a whitespace-only save directory', () => {
  const args = buildYtDlpArgs(makeConfig({ savePath: '   ' }))

  assert.equal(args.includes('--paths'), false)
})

test('keeps a Windows path with spaces and Chinese characters as one argument', () => {
  const savePath = 'D:\\下载的视频\\Bili Flow\\收藏'

  assert.deepEqual(buildYtDlpArgs(makeConfig({ savePath })), [
    '--format',
    'bv*+ba/b',
    '--paths',
    savePath,
    SAMPLE_URL,
  ])
})

test('disables merging by selecting a single combined format', () => {
  assert.deepEqual(buildYtDlpArgs(makeConfig({ mergeAudioVideo: false })), [
    '--format',
    'b',
    SAMPLE_URL,
  ])

  assert.deepEqual(
    buildYtDlpArgs(makeConfig({ mergeAudioVideo: false, quality: '720p' })),
    ['--format', 'b[height<=720]', SAMPLE_URL],
  )
})

test('keeps URLs with special characters as a single final argument', () => {
  const url = 'https://example.com/watch?v=abc 123&list=a%20b#t=10'

  assert.deepEqual(buildYtDlpArgs(makeConfig({ url })), ['--format', 'bv*+ba/b', url])
})

test('does not mutate the input configuration and is deterministic', () => {
  const config = Object.freeze(
    makeConfig({
      quality: '720p',
      codec: 'hevc',
      cookieSource: 'edge',
      savePath: 'C:\\Users\\张三\\Videos\\Bili Flow',
      mergeAudioVideo: false,
      url: 'https://example.com/watch?v=1&t=2',
    }),
  )
  const snapshot = structuredClone(config)

  const firstArgs = buildYtDlpArgs(config)
  const secondArgs = buildYtDlpArgs(config)

  assert.deepEqual(config, snapshot)
  assert.deepEqual(firstArgs, secondArgs)
})

test('builds a complete argument list without overwriting or omitting options', () => {
  const savePath = 'C:\\Users\\张三\\Videos\\Bili Flow\\收藏'
  const url = 'https://www.bilibili.com/video/BV1xx411c7mD?p=2&t=30'

  const args = buildYtDlpArgs(
    makeConfig({
      quality: '1080p',
      codec: 'h264',
      cookieSource: 'chrome',
      savePath,
      mergeAudioVideo: true,
      url,
    }),
  )

  assert.deepEqual(args, [
    '--format',
    'bv*[height<=1080]+ba/b[height<=1080]',
    '--format-sort',
    'vcodec:h264',
    '--cookies-from-browser',
    'chrome',
    '--paths',
    savePath,
    url,
  ])
})
