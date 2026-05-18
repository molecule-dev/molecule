/** Translation keys for the feature-audio-mixer locale package. */
export type AudioMixerTranslationKey =
  | 'audioMixer.aria.console'
  | 'audioMixer.aria.fader'
  | 'audioMixer.aria.pan'
  | 'audioMixer.aria.send'
  | 'audioMixer.button.mute'
  | 'audioMixer.button.solo'
  | 'audioMixer.master'
  | 'audioMixer.sends'

/** Translation record mapping audio-mixer keys to translated strings. */
export type AudioMixerTranslations = Record<AudioMixerTranslationKey, string>
