export type VideoQuality = 'best' | '1080p' | '720p' | '480p'

export type VideoCodec = 'auto' | 'h264' | 'hevc' | 'av1'

export type CookieSource = 'none' | 'edge' | 'chrome' | 'firefox'

export interface DownloadConfig {
  url: string
  quality: VideoQuality
  codec: VideoCodec
  cookieSource: CookieSource
  savePath: string
  mergeAudioVideo: boolean
}

export const DEFAULT_DOWNLOAD_CONFIG: Readonly<DownloadConfig> = {
  url: '',
  quality: 'best',
  codec: 'auto',
  cookieSource: 'none',
  savePath: '',
  mergeAudioVideo: true,
}
