import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for cy. */
export const cy: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Chwilio',
  'audio.play': 'Chwarae',
  'audio.pause': 'Oedi',
  'audio.mute': 'Mud',
  'audio.unmute': 'Dadfud',
  'audio.captions': 'Capsiynau',
  'audio.error.missingProvider':
    "Nid oes darparwr sain wedi'i fondio. Mewnforiwch `provider` o {{bond}} a galwch `setProvider(provider)` o {{core}} yn `setupProviders()`.",
}
