import type { BatteryTranslations } from './types.js'

/** Battery translations for Telugu. */
export const te: BatteryTranslations = {
  'battery.charging': 'ఛార్జ్ అవుతోంది',
  'battery.discharging': 'బ్యాటరీలో',
  'battery.full': 'పూర్తిగా ఛార్జ్',
  'battery.not-charging': 'ఛార్జ్ అవడం లేదు',
  'battery.unknown': 'తెలియదు',
  'battery.remainingUnknown': 'తెలియదు',
  'battery.remainingTime': '{{hours}}గం {{minutes}}ని',
  'battery.remainingMinutes': '{{minutes}}ని',
  'battery.error.noProvider':
    '`@molecule/app-battery`: ప్రొవైడర్ ఏదీ సెట్ చేయబడలేదు. `BatteryProvider` ఇంప్లిమెంటేషన్‌తో `setProvider()` కాల్ చేయండి — మాలిక్యూల్ దీని కోసం ఏ ప్రొవైడర్‌ను అందించదు; మీ నేటివ్ రన్‌టైమ్‌లో ఇంటర్‌ఫేస్‌ను ఇంప్లిమెంట్ చేసి, దానిని బాండ్ చేయండి.',
}
