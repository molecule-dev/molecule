import type { BatteryTranslations } from './types.js'

/** Battery translations for es. */
export const es: Partial<BatteryTranslations> = {
  'battery.unknown': 'Desconocido',
  'battery.remainingUnknown': 'Desconocido',
  'battery.remainingMinutes': '{{minutes}} min',
  'battery.charging': 'Carga',
  'battery.discharging': 'Funciona con batería',
  'battery.full': 'Completamente cargado',
  'battery.not-charging': 'No se cobra',
  'battery.remainingTime': '{{hours}} h {{minutes}} metro',
  'battery.error.noProvider':
    '`@molecule/app-battery`: No se ha configurado ningún proveedor. Llame `setProvider()` con una implementación de `BatteryProvider` ; ningún proveedor viene incluido con la flota; implemente la interfaz en su entorno de ejecución nativo y vincúlela.',
}
