import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for ka. */
export const ka: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'ძიება',
  'audio.play': 'თამაში',
  'audio.pause': 'პაუზა',
  'audio.mute': 'დადუმება',
  'audio.unmute': 'ხმის მოხსნა',
  'audio.captions': 'სუბტიტრები',
  'audio.error.missingProvider':
    'აუდიო პროვაიდერი არ არის დაკავშირებული. შემოიტანეთ `provider` {{bond}}-დან და გამოიძახეთ `setProvider(provider)` {{core}}-დან `setupProviders()`-ში.',
}
