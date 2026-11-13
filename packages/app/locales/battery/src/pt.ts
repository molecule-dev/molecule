import type { BatteryTranslations } from './types.js'

/** Battery translations for pt. */
export const pt: Partial<BatteryTranslations> = {
  'battery.unknown': 'Desconhecido',
  'battery.remainingUnknown': 'Desconhecido',
  'battery.charging': 'Carregando',
  'battery.discharging': 'Na bateria',
  'battery.full': 'Totalmente carregado',
  'battery.not-charging': 'Não está carregando',
  'battery.remainingTime': '{{hours}} h {{minutes}} m',
  'battery.remainingMinutes': '{{minutes}} m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Nenhum provedor definido. Chame `setProvider()` com uma implementação de `BatteryProvider` — nenhum provedor é fornecido com a frota; implemente a interface em seu ambiente de execução nativo e faça o emparelhamento.',
}
