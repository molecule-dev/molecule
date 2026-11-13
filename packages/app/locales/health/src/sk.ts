import type { HealthTranslations } from './types.js'

/** Health translations for Slovak. */
export const sk: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}h {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Žiadny poskytovateľ zdravotnej starostlivosti nie je prepojený – implementujte rozhranie `HealthProvider` vo vašom natívnom runtime prostredí (Apple HealthKit / Android Health Connect / Google Fit) a pri spustení ho prepojte s `setProvider()` . S flotilou nie je dodávaný žiadny poskytovateľ. Pred volaním detegujte funkcie pomocou `hasProvider()` alebo `getCapabilities().supported` – čítanie zdravotnej informácie nemá žiadnu čestnú predvolenú hodnotu, takže toto vyvolá namiesto vrátenia falošných údajov falošné údaje.',
}
