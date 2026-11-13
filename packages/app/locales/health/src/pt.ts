import type { HealthTranslations } from './types.js'

/** Health translations for Portuguese. */
export const pt: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}h {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Nenhum provedor de saúde vinculado — implemente a interface `HealthProvider` em seu ambiente de execução nativo (Apple HealthKit / Android Health Connect / Google Fit) e vincule-a com `setProvider()` na inicialização. Nenhum provedor é fornecido com a frota. Detecte o recurso com `hasProvider()` ou `getCapabilities().supported` antes de chamar — uma leitura de saúde não tem um valor padrão confiável, portanto, isso lança uma exceção em vez de retornar dados falsos.',
}
