import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Malayalam. */
export const ml: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'മോണിട്ടറിംഗ് പ്രൊവൈഡർ കോൺഫിഗർ ചെയ്തിട്ടില്ല. ആദ്യം setProvider() വിളിക്കുക.',
  'monitoring.check.database.notBonded': 'ഡേറ്റാബേസ് ബോണ്ട് കോൺഫിഗർ ചെയ്തിട്ടില്ല.',
  'monitoring.check.database.poolUnavailable': 'ഡാറ്റാബേസ് പൂൾ ലഭ്യമല്ല.',
  'monitoring.check.cache.notBonded': 'കാഷ് ബോണ്ട് കോൺഫിഗർ ചെയ്തിട്ടില്ല.',
  'monitoring.check.cache.providerUnavailable': 'കാഷ് പ്രൊവൈഡർ ലഭ്യമല്ല.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} പ്രതികരണം.',
  'monitoring.check.http.timeout': 'അഭ്യർത്ഥന സമയം കഴിഞ്ഞു.',
  'monitoring.check.http.degraded': 'പ്രതികരണ സമയം {{latencyMs}}ms പരിധി {{thresholdMs}}ms കടന്നു.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' രജിസ്റ്റർ ചെയ്തിട്ടില്ല.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms കഴിഞ്ഞ് പരിശോധന കാലഹരണപ്പെട്ടു.',
}
