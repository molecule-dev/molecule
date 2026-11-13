import type { BatteryTranslations } from './types.js'

/** Battery translations for Albanian. */
export const sq: BatteryTranslations = {
  'battery.charging': 'Po Ngarkohet',
  'battery.discharging': 'Me Bateri',
  'battery.full': 'Plotesisht e Ngarkuar',
  'battery.not-charging': 'Nuk Po Ngarkohet',
  'battery.unknown': 'E panjohur',
  'battery.remainingUnknown': 'E panjohur',
  'battery.remainingTime': '{{hours}}o {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Nuk është caktuar asnjë ofrues. Thirrni `setProvider()` me një implementim `BatteryProvider` — asnjë ofrues nuk vjen me flotën; implementoni ndërfaqen në kohën tuaj të ekzekutimit vendas dhe lidheni atë.',
}
