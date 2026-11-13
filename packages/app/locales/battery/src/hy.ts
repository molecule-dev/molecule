import type { BatteryTranslations } from './types.js'

/** Battery translations for Armenian. */
export const hy: BatteryTranslations = {
  'battery.charging': 'Լիցqavorvum e',
  'battery.discharging': 'Martkoci vra',
  'battery.full': 'Amboxjoviny licqavorvac',
  'battery.not-charging': 'Chi licqavorvum',
  'battery.unknown': 'Anhayt',
  'battery.remainingUnknown': 'Anhayt',
  'battery.remainingTime': '{{hours}}zh {{minutes}}r',
  'battery.remainingMinutes': '{{minutes}}r',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Մատակարար սահմանված չէ։ Կանչեք `setProvider()` ը `BatteryProvider` իրականացմամբ։ Molecule-ը դրա համար մատակարար չի տրամադրում։ Իրականացրեք ինտերֆեյսը ձեր բնօրինակ գործարկման ժամանակի վրա և կապեք այն։',
}
