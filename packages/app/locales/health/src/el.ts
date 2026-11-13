import type { HealthTranslations } from './types.js'

/** Health translations for Greek. */
export const el: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ω {{minutes}}λ',
  'health.durationMinutes': '{{minutes}}λ',
  'health.error.noProvider':
    '`@molecule/app-health`: Δεν υπάρχει συνδεδεμένος πάροχος υγείας — υλοποιήστε τη διεπαφή `HealthProvider` στον εγγενή χρόνο εκτέλεσης (Apple HealthKit / Android Health Connect / Google Fit) και συνδέστε την με `setProvider()` κατά την εκκίνηση. Το Molecule δεν στέλνει κανέναν πάροχο για αυτό. Ανίχνευση χαρακτηριστικών με `hasProvider()` ή `getCapabilities().supported` πριν από την κλήση — μια ανάγνωση υγείας δεν έχει ειλικρινή προεπιλογή, επομένως αυτό δημιουργεί ψευδή δεδομένα αντί να επιστρέφει.',
}
