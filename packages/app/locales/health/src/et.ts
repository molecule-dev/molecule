import type { HealthTranslations } from './types.js'

/** Health translations for Estonian. */
export const et: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}t {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Tervisepakkujat pole seotud — rakendage oma loomulikus käituskeskkonnas (Apple HealthKit / Android Health Connect / Google Fit) liides `HealthProvider` ja seoge see käivitamisel funktsiooniga `setProvider()` . Molecule ei paku selle jaoks pakkujat. Tuvastage omadused funktsiooniga `hasProvider()` või `getCapabilities().supported` enne kutsumist — terviselugemisel pole ausat vaikeväärtust, seega viskab see valeandmeid tagasi, mitte ei tagasta neid.',
}
