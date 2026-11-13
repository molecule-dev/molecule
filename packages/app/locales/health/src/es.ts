import type { HealthTranslations } from './types.js'

/** Health translations for es. */
export const es: Partial<HealthTranslations> = {
  'health.durationMinutes': '{{minutes}} min',
  'health.durationHoursMinutes': '{{hours}} h {{minutes}} metro',
  'health.error.noProvider':
    '`@molecule/app-health`: No hay ningún proveedor de salud vinculado; implemente la interfaz `HealthProvider` en su entorno de ejecución nativo (Apple HealthKit / Android Health Connect / Google Fit) y vincúlela con `setProvider()` al inicio. Molecule no incluye ningún proveedor para ello. Detecte la funcionalidad con `hasProvider()` o `getCapabilities().supported` antes de llamar a la función; una lectura de salud no tiene un valor predeterminado honesto, por lo que esto genera un error en lugar de devolver datos falsos.',
}
