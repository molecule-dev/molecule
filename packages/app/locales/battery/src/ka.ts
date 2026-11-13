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
    '`@molecule/app-battery`: პროვაიდერი არ არის დაყენებული. გამოიძახეთ `setProvider()` `BatteryProvider` იმპლემენტაციით — ფლოტს არცერთი პროვაიდერი არ მოყვება; იმპლემენტირეთ ინტერფეისი თქვენს მშობლიურ გაშვებულ დროს და დააკავშირეთ იგი.',
}
