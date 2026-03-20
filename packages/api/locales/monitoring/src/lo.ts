import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Lao. */
export const lo: MonitoringTranslations = {
  'monitoring.error.noProvider': 'ຜູ້ໃຫ້ບໍລິການການຕິດຕາມບໍ່ໄດ້ຕັ້ງຄ່າ. ເຊີຍ setProvider() ກ່ອນ.',
  'monitoring.check.database.notBonded': 'ບອນຖານຂໍ້ມູນບໍ່ໄດ້ຕັ້ງຄ່າ.',
  'monitoring.check.database.poolUnavailable': 'ພູລຖານຂໍ້ມູນບໍ່ພ້ອມໃຊ້.',
  'monitoring.check.cache.notBonded': 'ບອນແຄດບໍ່ໄດ້ຕັ້ງຄ່າ.',
  'monitoring.check.cache.providerUnavailable': 'ຜູ້ໃຫ້ບໍລິການແຄດບໍ່ພ້ອມໃຊ້.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} ການຕອບກັບ.',
  'monitoring.check.http.timeout': 'ຄໝຂໍເມົດເວລາ.',
  'monitoring.check.http.degraded': 'ເວລາຕອບສະໜອງ {{latencyMs}}ms ເກີນເກນ {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' ບໍ່ໄດ້ລົງທະບຽນ.",
  'monitoring.check.timedOut': 'ການກວດສອບໝົດເວລາຫຼັງຈາກ {{timeoutMs}}ms.',
}
