/** Translation keys for the audio-player locale package. */
export type AudioPlayerTranslationKey =
  'audio.seek' | 'audio.play' | 'audio.pause' | 'audio.mute' | 'audio.unmute' | 'audio.captions'

/** Translation record mapping audio-player-react keys to translated strings. */
export type AudioPlayerTranslations = Record<AudioPlayerTranslationKey, string>
