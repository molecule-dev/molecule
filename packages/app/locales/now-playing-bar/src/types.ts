/** Translation keys for the now-playing-bar locale package. */
export type NowPlayingBarTranslationKey =
  | 'nowPlaying.empty'
  | 'nowPlaying.aria.region'
  | 'nowPlaying.aria.artwork'
  | 'nowPlaying.aria.play'
  | 'nowPlaying.aria.pause'
  | 'nowPlaying.aria.next'
  | 'nowPlaying.aria.prev'
  | 'nowPlaying.aria.seek'
  | 'nowPlaying.aria.volume'

/** Translation record mapping now-playing-bar keys to translated strings. */
export type NowPlayingBarTranslations = Record<NowPlayingBarTranslationKey, string>
