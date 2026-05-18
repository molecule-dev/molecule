import type { BatteryTranslations } from './types.js'

/** Battery translations for pt. */
export const pt: Partial<BatteryTranslations> = {
  'battery.unknown': 'Desconhecido',
  'battery.remainingUnknown': 'Desconhecido',
  'battery.charging': 'Carregando',
  'battery.discharging': 'Na bateria',
  'battery.full': 'Totalmente carregado',
  'battery.not-charging': 'Não está carregando',
  'battery.remainingTime': '{{horas}} h<x> {{minutos}}</x> m',
  'battery.remainingMinutes': '{{minutos}} m',
}
