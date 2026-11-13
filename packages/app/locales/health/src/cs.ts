import type { HealthTranslations } from './types.js'

/** Health translations for Czech. */
export const cs: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}h {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Žádný poskytovatel zdravotní péče není propojen s poskytovatelem zdravotní péče – implementujte rozhraní `HealthProvider` ve vašem nativním běhovém prostředí (Apple HealthKit / Android Health Connect / Google Fit) a při spuštění jej propojte s `setProvider()` . S vozovým parkem není dodáván žádný poskytovatel. Před voláním detekujte funkce pomocí `hasProvider()` nebo `getCapabilities().supported` – čtení stavu nemá žádnou poctivou výchozí hodnotu, takže se vyvolají falešná data, nikoli se vrátí falešná.',
}
