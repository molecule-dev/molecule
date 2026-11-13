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
    '`@molecule/app-battery`: לא הוגדר ספק. קרא ל `setProvider()` עם מימוש `BatteryProvider` - אף ספק לא מגיע עם הצי; הטמע את הממשק על זמן הריצה המקורי שלך וקשר אותו.',
}
