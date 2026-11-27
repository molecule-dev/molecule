import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for gu. */
export const gu: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'શોધો',
  'audio.play': 'રમો',
  'audio.pause': 'થોભો',
  'audio.mute': 'મ્યૂટ કરો',
  'audio.unmute': 'અનમ્યૂટ કરો',
  'audio.captions': 'કૅપ્શન',
  'audio.error.missingProvider':
    'કોઈ ઓડિયો પ્રદાતા બોન્ડેડ નથી. {{bond}} માંથી `provider` આયાત કરો અને `setupProviders()` માં {{core}} માંથી `setProvider(provider)` ને કૉલ કરો.',
}
