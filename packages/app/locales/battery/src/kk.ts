import type { BatteryTranslations } from './types.js'

/** Battery translations for Kazakh. */
export const kk: BatteryTranslations = {
  'battery.charging': 'Зарядталуда',
  'battery.discharging': 'Батареяда',
  'battery.full': 'Толық зарядталған',
  'battery.not-charging': 'Зарядталмайды',
  'battery.unknown': 'Белгісіз',
  'battery.remainingUnknown': 'Белгісіз',
  'battery.remainingTime': '{{hours}}с {{minutes}}м',
  'battery.remainingMinutes': '{{minutes}}м',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Провайдер орнатылмаған. `setProvider()` функциясын `BatteryProvider` іске асыруымен шақырыңыз — Molecule оған ешқандай провайдер жібермейді; интерфейсті өзіңіздің жергілікті жұмыс уақытыңызда іске қосып, оны байланыстырыңыз.',
}
