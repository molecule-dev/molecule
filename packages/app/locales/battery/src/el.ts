import type { BatteryTranslations } from './types.js'

/** Battery translations for Greek. */
export const el: BatteryTranslations = {
  'battery.charging': 'Φόρτιση',
  'battery.discharging': 'Σε Μπαταρία',
  'battery.full': 'Πλήρως Φορτισμένο',
  'battery.not-charging': 'Δεν Φορτίζει',
  'battery.unknown': 'Άγνωστο',
  'battery.remainingUnknown': 'Άγνωστο',
  'battery.remainingTime': '{{hours}}ω {{minutes}}λ',
  'battery.remainingMinutes': '{{minutes}}λ',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Δεν έχει οριστεί πάροχος. Καλέστε `setProvider()` με μια υλοποίηση `BatteryProvider` — Το Molecule δεν παρέχει κανέναν πάροχο για αυτό. Υλοποιήστε τη διεπαφή στον εγγενή χρόνο εκτέλεσης (runtime) και συνδέστε την.',
}
