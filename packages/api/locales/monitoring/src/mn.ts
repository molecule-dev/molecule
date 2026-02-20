import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Mongolian. */
export const mn: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'Мэдээллийн сангийн пул боломжгүй.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'Кэш нийлүүлэгч боломжгүй.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'Хариу хугацаа {{latencyMs}}мс босго {{thresholdMs}}мс-ийг давсан.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': 'Шалгалт {{timeoutMs}}мс-ийн дараа хугацаа дууссан.',
}
