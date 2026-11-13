import type { HealthTranslations } from './types.js'

/** Health translations for Estonian. */
export const et: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}t {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Terviseteenuse pakkujat pole ühendatud — rakendage oma loomulikus käituskeskkonnas (Apple HealthKit / Android Health Connect / Google Fit) liides `HealthProvider` ja ühendage see käivitamisel funktsiooniga `setProvider()` . Seadmete komplekti ei kuulu ühtegi pakkujat. Enne kutsumist tuvastage funktsioonid funktsiooniga `hasProvider()` või `getCapabilities().supported` — terviseteabe lugemisel pole ausat vaikeväärtust, seega viskab see valeandmeid, mitte ei tagasta neid.',
}
