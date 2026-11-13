import type { BatteryTranslations } from './types.js'

/** Battery translations for tr. */
export const tr: Partial<BatteryTranslations> = {
  'battery.unknown': 'Bilinmiyor',
  'battery.remainingUnknown': 'Bilinmiyor',
  'battery.remainingMinutes': '{{minutes}}dk',
  'battery.charging': 'Şarj işlemi',
  'battery.discharging': 'Pil ile',
  'battery.full': 'Tamamen Şarj Edilmiş',
  'battery.not-charging': 'Şarj Edilmiyor',
  'battery.remainingTime': '{{hours}} H {{minutes}} M',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Sağlayıcı ayarlanmadı. `setProvider()` işlevini bir `BatteryProvider` uygulamasıyla çağırın — Molecule bunun için bir sağlayıcı sunmuyor; arayüzü yerel çalışma ortamınızda uygulayın ve bağlayın.',
}
