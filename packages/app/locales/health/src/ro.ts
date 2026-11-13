import type { HealthTranslations } from './types.js'

/** Health translations for Romanian. */
export const ro: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}h {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Niciun furnizor de servicii de sănătate asociat — implementează interfața `HealthProvider` în runtime-ul nativ (Apple HealthKit / Android Health Connect / Google Fit) și asociază-o cu `setProvider()` la pornire. Molecule nu oferă niciun furnizor pentru aceasta. Detectează caracteristicile cu `hasProvider()` sau `getCapabilities().supported` înainte de apel — o citire a stării de sănătate nu are o valoare implicită corectă, deci aceasta generează date false în loc să returneze date false.',
}
