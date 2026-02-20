import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Finnish. */
export const fi: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Valvontatarjoajaa ei ole määritetty. Kutsu ensin setProvider().',
  'monitoring.check.database.notBonded': 'Tietokantayhteyttä ei ole määritetty.',
  'monitoring.check.database.poolUnavailable': 'Tietokantapooli ei ole käytettävissä.',
  'monitoring.check.cache.notBonded': 'Välimuistiyhteyttä ei ole määritetty.',
  'monitoring.check.cache.providerUnavailable': 'Välimuistin tarjoaja ei ole käytettävissä.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} -vastaus.',
  'monitoring.check.http.timeout': 'Pyyntö aikakatkaistiin.',
  'monitoring.check.http.degraded': 'Vasteaika {{latencyMs}}ms ylitti kynnyksen {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Yhteys '{{bondType}}' ei ole rekisteröity.",
  'monitoring.check.timedOut': 'Tarkistus aikakatkaistiin {{timeoutMs}}ms jälkeen.',
}
