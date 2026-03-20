import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Mongolian. */
export const mn: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Мониторинг нийлүүлэгч тохируулагдаагүй. Эхлээд setProvider() дуудна уу.',
  'monitoring.check.database.notBonded': 'Мэдээллийн сангийн бонд тохируулагдаагүй.',
  'monitoring.check.database.poolUnavailable': 'Мэдээллийн сангийн пул боломжгүй.',
  'monitoring.check.cache.notBonded': 'Кэш бонд тохируулагдаагүй.',
  'monitoring.check.cache.providerUnavailable': 'Кэш нийлүүлэгч боломжгүй.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} хариу.',
  'monitoring.check.http.timeout': 'Хүсэлтийн хугацаа дууссан.',
  'monitoring.check.http.degraded':
    'Хариу хугацаа {{latencyMs}}мс босго {{thresholdMs}}мс-ийг давсан.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' бүртгэгдээгүй.",
  'monitoring.check.timedOut': 'Шалгалт {{timeoutMs}}мс-ийн дараа хугацаа дууссан.',
}
