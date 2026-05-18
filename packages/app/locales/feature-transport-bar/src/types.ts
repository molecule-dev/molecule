/**
 * Translation key types for `@molecule/app-feature-transport-bar-react`.
 *
 * @module
 */

/** Translation keys consumed by the transport-bar feature. */
export type TransportBarTranslationKey =
  | 'transportBar.aria.region'
  | 'transportBar.aria.skipBack'
  | 'transportBar.aria.skipForward'
  | 'transportBar.aria.play'
  | 'transportBar.aria.pause'
  | 'transportBar.aria.stop'
  | 'transportBar.aria.record'
  | 'transportBar.aria.stopRecording'
  | 'transportBar.aria.loopOn'
  | 'transportBar.aria.loopOff'

/** Translation record mapping transport-bar keys to translated strings. */
export type TransportBarTranslations = Record<TransportBarTranslationKey, string>
