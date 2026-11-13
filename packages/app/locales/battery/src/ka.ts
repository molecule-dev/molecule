import type { BatteryTranslations } from './types.js'

/** Battery translations for Georgian. */
export const ka: BatteryTranslations = {
  'battery.charging': 'Itvirtheba',
  'battery.discharging': 'Batareas',
  'battery.full': 'Srulad Damuxtva',
  'battery.not-charging': 'Ar Itvirtheba',
  'battery.unknown': 'Uchnobi',
  'battery.remainingUnknown': 'Uchnobi',
  'battery.remainingTime': '{{hours}}sth {{minutes}}ts',
  'battery.remainingMinutes': '{{minutes}}ts',
  'battery.error.noProvider':
    '`@molecule/app-battery`: პროვაიდერი არ არის დაყენებული. გამოიძახეთ `setProvider()` `BatteryProvider` იმპლემენტაციით — Molecule მისთვის პროვაიდერს არ აგზავნის; დანერგეთ ინტერფეისი თქვენს მშობლიურ გაშვების დროს და დააკავშირეთ იგი.',
}
