import type { HealthTranslations } from './types.js'

/** Health translations for Latvian. */
export const lv: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}st {{minutes}}min',
  'health.durationMinutes': '{{minutes}}min',
  'health.error.noProvider':
    '`@molecule/app-health`: Nav piesaistīts veselības aprūpes pakalpojumu sniedzējs — ieviesiet `HealthProvider` saskarni savā vietējā izpildlaikā (Apple HealthKit / Android Health Connect / Google Fit) un startēšanas laikā piesaistiet to ar `setProvider()` . Pakalpojumu sniedzējs netiek piegādāts kopā ar ierīcēm. Funkciju noteikšana ar `hasProvider()` vai `getCapabilities().supported` pirms izsaukšanas — veselības aprūpes nolasījumam nav godīgas noklusējuma vērtības, tāpēc tas izmet, nevis atgriež viltotus datus.',
}
