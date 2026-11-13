import type { HealthTranslations } from './types.js'

/** Health translations for Slovak. */
export const sk: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}h {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Žiadny prepojený poskytovateľ zdravotnej starostlivosti – implementujte rozhranie `HealthProvider` vo vašom natívnom runtime prostredí (Apple HealthKit / Android Health Connect / Google Fit) a prepojte ho s `setProvider()` pri spustení. Molecule preň neposkytuje žiadneho poskytovateľa. Pred volaním detekujte funkcie s `hasProvider()` alebo `getCapabilities().supported` – čítanie zdravotnej starostlivosti nemá žiadnu čestnú predvolenú hodnotu, takže toto vyvolá namiesto vrátenia falošných údajov.',
}
