import type { BatteryTranslations } from './types.js'

/** Battery translations for Mongolian. */
export const mn: BatteryTranslations = {
  'battery.charging': 'Цэнэглэж байна',
  'battery.discharging': 'Батарейгаар ажиллаж байна',
  'battery.full': 'Бүрэн цэнэглэгдсэн',
  'battery.not-charging': 'Цэнэглэхгүй байна',
  'battery.unknown': 'Тодорхойгүй',
  'battery.remainingUnknown': 'Тодорхойгүй',
  'battery.remainingTime': '{{hours}}ц {{minutes}}м',
  'battery.remainingMinutes': '{{minutes}}м',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Үйлчилгээ үзүүлэгч тохируулагдаагүй байна. `BatteryProvider` хэрэгжүүлэлттэй `setProvider()` дуудна уу — Molecule үүнд ямар ч үйлчилгээ үзүүлэгч илгээдэггүй; интерфэйсийг өөрийн төрөлх ажиллах хугацаанд хэрэгжүүлж, холбоно уу.',
}
