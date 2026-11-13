import type { BatteryTranslations } from './types.js'

/** Battery translations for pa. */
export const pa: Partial<BatteryTranslations> = {
  'battery.charging': 'ਚਾਰਜ ਹੋ ਰਿਹਾ ਹੈ',
  'battery.full': 'ਪੂਰੀ ਤਰ੍ਹਾਂ ਚਾਰਜ',
  'battery.not-charging': 'ਚਾਰਜ ਨਹੀਂ ਹੋ ਰਿਹਾ',
  'battery.unknown': 'ਅਣਜਾਣ',
  'battery.remainingUnknown': 'ਅਣਜਾਣ',
  'battery.remainingTime': '{{hours}}ਘੰ {{minutes}}ਮਿ',
  'battery.remainingMinutes': '{{minutes}}ਮਿ',
  'battery.discharging': "ਬੈਟਰੀ 'ਤੇ",
  'battery.error.noProvider':
    "`@molecule/app-battery`: ਕੋਈ ਪ੍ਰਦਾਤਾ ਸੈੱਟ ਨਹੀਂ ਹੈ। `BatteryProvider` ਲਾਗੂਕਰਨ ਨਾਲ `setProvider()` ਕਾਲ ਕਰੋ — Molecule ਇਸਦੇ ਲਈ ਕੋਈ ਪ੍ਰਦਾਤਾ ਨਹੀਂ ਭੇਜਦਾ; ਆਪਣੇ ਮੂਲ ਰਨਟਾਈਮ 'ਤੇ ਇੰਟਰਫੇਸ ਲਾਗੂ ਕਰੋ ਅਤੇ ਇਸਨੂੰ ਬਾਂਡ ਕਰੋ।",
}
