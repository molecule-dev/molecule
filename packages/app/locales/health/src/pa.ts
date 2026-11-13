import type { HealthTranslations } from './types.js'

/** Health translations for Punjabi. */
export const pa: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ਘੰ {{minutes}}ਮਿ',
  'health.durationMinutes': '{{minutes}}ਮਿ',
  'health.error.noProvider':
    "`@molecule/app-health`: ਕੋਈ ਸਿਹਤ ਪ੍ਰਦਾਤਾ ਬਾਂਡਡ ਨਹੀਂ ਹੈ — ਆਪਣੇ ਮੂਲ ਰਨਟਾਈਮ (Apple HealthKit / Android Health Connect / Google Fit) 'ਤੇ `HealthProvider` ਇੰਟਰਫੇਸ ਲਾਗੂ ਕਰੋ ਅਤੇ ਇਸਨੂੰ ਸਟਾਰਟਅੱਪ 'ਤੇ `setProvider()` ਨਾਲ ਬਾਂਡ ਕਰੋ। ਕੋਈ ਵੀ ਪ੍ਰਦਾਤਾ ਫਲੀਟ ਨਾਲ ਨਹੀਂ ਭੇਜਦਾ। ਕਾਲ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ `hasProvider()` ਜਾਂ `getCapabilities().supported` ਨਾਲ Feature-detect — ਇੱਕ ਹੈਲਥ ਰੀਡ ਵਿੱਚ ਕੋਈ ਇਮਾਨਦਾਰ ਡਿਫਾਲਟ ਨਹੀਂ ਹੁੰਦਾ, ਇਸ ਲਈ ਇਹ ਨਕਲੀ ਡੇਟਾ ਵਾਪਸ ਕਰਨ ਦੀ ਬਜਾਏ ਸੁੱਟ ਦਿੰਦਾ ਹੈ।",
}
