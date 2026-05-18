/** Translation keys for the audio-mixer locale package. */
export type AudioMixerTranslationKey =
  | 'audioMixer.aria.console'
  | 'audioMixer.master'
  | 'audioMixer.button.mute'
  | 'audioMixer.button.solo'
  | 'audioMixer.aria.fader'
  | 'audioMixer.aria.pan'
  | 'audioMixer.aria.send'

/** Translation record mapping audio-mixer-react keys to translated strings. */
export type AudioMixerTranslations = Record<AudioMixerTranslationKey, string>
