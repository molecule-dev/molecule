import type { BatteryTranslations } from './types.js'

/** Battery translations for Swahili. */
export const sw: BatteryTranslations = {
  'battery.charging': 'Inachaji',
  'battery.discharging': 'Inatumia Betri',
  'battery.full': 'Imejaa Kabisa',
  'battery.not-charging': 'Haichaji',
  'battery.unknown': 'Haijulikani',
  'battery.remainingUnknown': 'Haijulikani',
  'battery.remainingTime': 'saa {{hours}} dk {{minutes}}',
  'battery.remainingMinutes': 'dk {{minutes}}',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Hakuna mtoa huduma aliyewekwa. Piga simu `setProvider()` ukitumia utekelezaji wa `BatteryProvider` — Molekuli haitoi mtoa huduma kwa ajili yake; tekeleza kiolesura kwenye muda wako asilia wa utekelezaji na ukiunganishe.',
}
