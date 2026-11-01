import type { DownloadConfig, VideoCodec, VideoQuality } from '../../types/config'

type LimitedQuality = Exclude<VideoQuality, 'best'>
type PreferredCodec = Exclude<VideoCodec, 'auto'>

const MAX_HEIGHT_BY_QUALITY: Record<LimitedQuality, number> = {
  '1080p': 1080,
  '720p': 720,
  '480p': 480,
}

const FORMAT_SORT_BY_CODEC: Record<PreferredCodec, string> = {
  h264: 'vcodec:h264',
  hevc: 'vcodec:hevc',
  av1: 'vcodec:av1',
}

/**
 * Format selection follows yt-dlp's documented default and height examples:
 * https://github.com/yt-dlp/yt-dlp#format-selection
 *
 * With merging enabled, prefer separate video/audio streams and let yt-dlp
 * merge them. With merging disabled, select one combined format because
 * yt-dlp otherwise merges a `video+audio` selection automatically; there is no
 * flag that turns that merge step off. `--merge-output-format` only chooses a
 * container and does not disable merging.
 */
function buildFormatSelector(config: DownloadConfig): string {
  const maxHeight =
    config.quality === 'best' ? undefined : MAX_HEIGHT_BY_QUALITY[config.quality]

  if (config.mergeAudioVideo) {
    return maxHeight === undefined
      ? 'bv*+ba/b'
      : `bv*[height<=${maxHeight}]+ba/b[height<=${maxHeight}]`
  }

  return maxHeight === undefined ? 'b' : `b[height<=${maxHeight}]`
}

/**
 * Builds a yt-dlp argv array without reading files, launching processes, or
 * mutating the supplied configuration. The URL is intentionally last.
 */
export function buildYtDlpArgs(config: DownloadConfig): string[] {
  const args: string[] = ['--format', buildFormatSelector(config)]

  if (config.codec !== 'auto') {
    // Sorting expresses a source-codec preference. yt-dlp can fall back to a
    // different codec when the site does not offer the requested one; BiliFlow
    // never transcodes, so this cannot be treated as a hard codec guarantee.
    args.push('--format-sort', FORMAT_SORT_BY_CODEC[config.codec])
  }

  if (config.cookieSource !== 'none') {
    args.push('--cookies-from-browser', config.cookieSource)
  }

  if (config.savePath.trim().length > 0) {
    args.push('--paths', config.savePath)
  }

  args.push(config.url)

  return args
}
