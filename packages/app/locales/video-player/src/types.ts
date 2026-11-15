/** Translation keys for the video-player locale package. */
export type VideoPlayerTranslationKey =
  | 'video.pause'
  | 'video.play'
  | 'video.seek'
  | 'video.mute'
  | 'video.unmute'
  | 'video.fullscreen'
  | 'video.captions'

/** Translation record mapping video-player-react keys to translated strings. */
export type VideoPlayerTranslations = Record<VideoPlayerTranslationKey, string>
