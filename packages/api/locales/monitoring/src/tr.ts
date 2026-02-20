import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Turkish. */
export const tr: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'İzleme sağlayıcısı yapılandırılmamış. Önce setProvider() çağırın.',
  'monitoring.check.database.notBonded': 'Veritabanı bağlantısı yapılandırılmamış.',
  'monitoring.check.database.poolUnavailable': 'Veritabanı havuzu kullanılamıyor.',
  'monitoring.check.cache.notBonded': 'Önbellek bağlantısı yapılandırılmamış.',
  'monitoring.check.cache.providerUnavailable': 'Önbellek sağlayıcı kullanılamıyor.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} yanıtı.',
  'monitoring.check.http.timeout': 'İstek zaman aşımına uğradı.',
  'monitoring.check.http.degraded':
    'Yanıt süresi {{latencyMs}}ms eşik değeri {{thresholdMs}}ms aştı.',
  'monitoring.check.bond.notBonded': "'{{bondType}}' bağlantısı kayıtlı değil.",
  'monitoring.check.timedOut': 'Kontrol {{timeoutMs}}ms sonra zaman aşımına uğradı.',
}
