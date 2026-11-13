import type { BatteryTranslations } from './types.js'

/** Battery translations for Gujarati. */
export const gu: BatteryTranslations = {
  'battery.charging': 'ચાર્જ થઈ રહ્યું છે',
  'battery.discharging': 'બેટરી પર',
  'battery.full': 'સંપૂર્ણ ચાર્જ',
  'battery.not-charging': 'ચાર્જ થઈ રહ્યું નથી',
  'battery.unknown': 'અજ્ઞાત',
  'battery.remainingUnknown': 'અજ્ઞાત',
  'battery.remainingTime': '{{hours}}ક {{minutes}}મિ',
  'battery.remainingMinutes': '{{minutes}}મિ',
  'battery.error.noProvider':
    '`@molecule/app-battery`: કોઈ પ્રદાતા સેટ નથી. `BatteryProvider` અમલીકરણ સાથે `setProvider()` કૉલ કરો — Molecule તેના માટે કોઈ પ્રદાતા આપતું નથી; તમારા મૂળ રનટાઇમ પર ઇન્ટરફેસ લાગુ કરો અને તેને બોન્ડ કરો.',
}
