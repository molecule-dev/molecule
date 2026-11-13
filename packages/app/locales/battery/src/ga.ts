import type { BatteryTranslations } from './types.js'

/** Battery translations for Irish. */
export const ga: BatteryTranslations = {
  'battery.charging': 'Ag Luchtú',
  'battery.discharging': 'Ar Cheallra',
  'battery.full': 'Luchtaithe go hIomlán',
  'battery.not-charging': 'Gan Luchtú',
  'battery.unknown': 'Anaithnid',
  'battery.remainingUnknown': 'Anaithnid',
  'battery.remainingTime': '{{hours}}u {{minutes}}n',
  'battery.remainingMinutes': '{{minutes}}n',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Níl aon soláthraí socraithe. Glaoigh ar `setProvider()` le cur i bhfeidhm `BatteryProvider` — Ní sheolann Molecule aon soláthraí dó; cuir an comhéadan i bhfeidhm ar do rith-am dúchais agus ceangail é.',
}
