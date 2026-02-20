import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Lao. */
export const lo: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'ພູລຖານຂໍ້ມູນບໍ່ພ້ອມໃຊ້.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'ຜູ້ໃຫ້ບໍລິການແຄດບໍ່ພ້ອມໃຊ້.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded': 'ເວລາຕອບສະໜອງ {{latencyMs}}ms ເກີນເກນ {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': 'ການກວດສອບໝົດເວລາຫຼັງຈາກ {{timeoutMs}}ms.',
}
