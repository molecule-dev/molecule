import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for my. */
export const my: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'ရှာဖွေပါ',
  'audio.play': 'ကစားပါ',
  'audio.pause': 'ခေတ္တရပ်ပါ',
  'audio.mute': 'အသံတိတ်ပါ',
  'audio.unmute': 'အသံဖွင့်ရန်',
  'audio.captions': 'စာတွဲ',
  'audio.error.missingProvider':
    'အသံ provider ကို ချိတ်ဆက်မထားပါ။ {{bond}} မှ `provider` တင်သွင်းပြီး `setupProviders()` ရှိ {{core}} မှ `setProvider(provider)` ကို ခေါ်ပါ။',
}
