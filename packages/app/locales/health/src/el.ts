import type { HealthTranslations } from './types.js'

/** Health translations for Greek. */
export const el: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ω {{minutes}}λ',
  'health.durationMinutes': '{{minutes}}λ',
  'health.error.noProvider':
    '`@molecule/app-health`: Δεν υπάρχει σύνδεση παρόχου υγείας — υλοποιήστε τη διεπαφή `HealthProvider` στο εγγενές περιβάλλον εκτέλεσης (Apple HealthKit / Android Health Connect / Google Fit) και συνδέστε την με το `setProvider()` κατά την εκκίνηση. Κανένας πάροχος δεν αποστέλλεται με το στόλο. Ανίχνευση χαρακτηριστικών με `hasProvider()` ή `getCapabilities().supported` πριν από την κλήση — μια ανάγνωση υγείας δεν έχει ειλικρινή προεπιλογή, επομένως αυτό δημιουργεί ψευδή δεδομένα αντί να επιστρέφει.',
}
