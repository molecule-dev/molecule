/** Translation keys for the transport-bar locale package. */
export type TransportBarTranslationKey =
  | 'transportBar.aria.region'
  | 'transportBar.aria.skipForward'
  | 'transportBar.aria.play'
  | 'transportBar.aria.pause'
  | 'transportBar.aria.stop'
  | 'transportBar.aria.record'
  | 'transportBar.aria.stopRecording'
  | 'transportBar.aria.loopOff'

/** Translation record mapping transport-bar-react keys to translated strings. */
export type TransportBarTranslations = Record<TransportBarTranslationKey, string>
