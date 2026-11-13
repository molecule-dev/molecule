import type { HealthTranslations } from './types.js'

/** Health translations for Czech. */
export const cs: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}h {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Žádný propojený poskytovatel zdravotní péče — implementujte rozhraní `HealthProvider` ve vašem nativním běhovém prostředí (Apple HealthKit / Android Health Connect / Google Fit) a propojte ho s `setProvider()` při spuštění. Molecule pro něj neposkytuje žádného poskytovatele. Před voláním detekujte funkce s `hasProvider()` nebo `getCapabilities().supported` — čtení zdravotních dat nemá žádnou poctivou výchozí hodnotu, takže se vyvolají falešná data, nikoli se vrátí falešná.',
}
