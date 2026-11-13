import type { HealthTranslations } from './types.js'

/** Health translations for es. */
export const es: Partial<HealthTranslations> = {
  'health.durationMinutes': '{{minutes}} min',
  'health.durationHoursMinutes': '{{hours}} h {{minutes}} metro',
  'health.error.noProvider':
    '`@molecule/app-health`: No hay ningún proveedor de salud vinculado; implemente la interfaz `HealthProvider` en su entorno de ejecución nativo (Apple HealthKit / Android Health Connect / Google Fit) y vincúlela con `setProvider()` al inicio. No se incluye ningún proveedor con la flota. Detecte las características con `hasProvider()` o `getCapabilities().supported` antes de llamar; una lectura de salud no tiene un valor predeterminado honesto, por lo que esto lanza una excepción en lugar de devolver datos falsos.',
}
