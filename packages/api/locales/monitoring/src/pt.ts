import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Portuguese. */
export const pt: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Provedor de monitoramento não configurado. Chame setProvider() primeiro.',
  'monitoring.check.database.notBonded': 'Vínculo de banco de dados não configurado.',
  'monitoring.check.database.poolUnavailable': 'Pool de banco de dados indisponível.',
  'monitoring.check.cache.notBonded': 'Vínculo de cache não configurado.',
  'monitoring.check.cache.providerUnavailable': 'Provedor de cache indisponível.',
  'monitoring.check.http.badStatus': 'Resposta HTTP {{status}}.',
  'monitoring.check.http.timeout': 'A solicitação expirou.',
  'monitoring.check.http.degraded':
    'Tempo de resposta {{latencyMs}}ms excedeu o limiar {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "O vínculo '{{bondType}}' não está registrado.",
  'monitoring.check.timedOut': 'Verificação expirou após {{timeoutMs}}ms.',
}
