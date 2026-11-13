import type { HealthTranslations } from './types.js'

/** Health translations for Catalan. */
export const ca: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}h {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    "`@molecule/app-health`: No hi ha cap proveïdor de salut vinculat: implementa la interfície `HealthProvider` al teu temps d'execució natiu (Apple HealthKit / Android Health Connect / Google Fit) i vincula-la amb `setProvider()` a l'inici. Molecule no envia cap proveïdor. Detecció de funcions amb `hasProvider()` o `getCapabilities().supported` abans de cridar: una lectura de salut no té cap valor per defecte honest, de manera que això genera dades falses en lloc de retornar-les.",
}
