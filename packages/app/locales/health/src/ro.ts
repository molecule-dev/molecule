import type { HealthTranslations } from './types.js'

/** Health translations for Romanian. */
export const ro: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}h {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Niciun furnizor de servicii de sănătate asociat — implementați interfața `HealthProvider` în runtime-ul nativ (Apple HealthKit / Android Health Connect / Google Fit) și asociați-o cu `setProvider()` la pornire. Niciun furnizor nu este inclus în flota de funcționalități. Detectarea caracteristicilor se face cu `hasProvider()` sau `getCapabilities().supported` înainte de apel — o citire a stării de sănătate nu are o valoare implicită corectă, deci aceasta generează date false în loc să returneze date false.',
}
