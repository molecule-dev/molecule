import type { BatteryTranslations } from './types.js'

/** Battery translations for Hebrew. */
export const he: BatteryTranslations = {
  'battery.charging': 'טוען',
  'battery.discharging': 'על סוללה',
  'battery.full': 'טעון במלואו',
  'battery.not-charging': 'לא טוען',
  'battery.unknown': 'לא ידוע',
  'battery.remainingUnknown': 'לא ידוע',
  'battery.remainingTime': '{{hours}}ש {{minutes}}ד',
  'battery.remainingMinutes': '{{minutes}}ד',
  'battery.error.noProvider':
    '`@molecule/app-battery`: לא הוגדר ספק. קריאה ל `setProvider()` עם מימוש של `BatteryProvider` — Molecule לא שולחת ספק עבורו; יש לממש את הממשק על זמן הריצה המקורי שלך וליצור קשר איתו.',
}
