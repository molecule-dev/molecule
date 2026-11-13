import type { HealthTranslations } from './types.js'

/** Health translations for Galician. */
export const gl: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}h {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Non hai ningún provedor de saúde vinculado: implementa a interface `HealthProvider` no teu tempo de execución nativo (Apple HealthKit / Android Health Connect / Google Fit) e vincúlaa con `setProvider()` ao inicio. Ningún provedor inclúese coa frota. Detección de funcionalidades con `hasProvider()` ou `getCapabilities().supported` antes de chamar: unha lectura de saúde non ten un valor predeterminado honesto, polo que isto lanza datos falsos en lugar de devolver datos falsos.',
}
