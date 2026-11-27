import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for am. */
export const am: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'ፈልግ',
  'audio.play': 'ይጫወቱ',
  'audio.pause': 'ለአፍታ አቁም',
  'audio.mute': 'ድምጸ-ከል አድርግ',
  'audio.unmute': 'ድምጸ-ከል አንሳ',
  'audio.captions': 'ንዑስ ጽሑፎች',
  'audio.error.missingProvider':
    'የድምጽ አቅራቢ አልተያያዘም። `provider` ከ {{bond}} አስመጣ እና ከ {{core}} በ `setupProviders()` `setProvider(provider)` ን ደውል።',
}
