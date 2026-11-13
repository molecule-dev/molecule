import type { BatteryTranslations } from './types.js'

/** Battery translations for Tamil. */
export const ta: BatteryTranslations = {
  'battery.charging': 'சார்ஜ் ஆகிறது',
  'battery.discharging': 'பேட்டரியில்',
  'battery.full': 'முழுமையாக சார்ஜ்',
  'battery.not-charging': 'சார்ஜ் ஆகவில்லை',
  'battery.unknown': 'தெரியாது',
  'battery.remainingUnknown': 'தெரியாது',
  'battery.remainingTime': '{{hours}}ம {{minutes}}நி',
  'battery.remainingMinutes': '{{minutes}}நி',
  'battery.error.noProvider':
    '`@molecule/app-battery`: வழங்குநர் எதுவும் அமைக்கப்படவில்லை. `BatteryProvider` செயலாக்கத்துடன் `setProvider()` அழைக்கவும் — இந்தத் தொகுப்புடன் எந்த வழங்குநரும் அனுப்பப்படவில்லை; உங்கள் நேட்டிவ் ரன்டைமில் இடைமுகத்தைச் செயல்படுத்தி, அதை இணைக்கவும்.',
}
