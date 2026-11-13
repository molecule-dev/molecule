import type { HealthTranslations } from './types.js'

/** Health translations for Dutch. */
export const nl: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}u {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Geen gezondheidsprovider gekoppeld — implementeer de `HealthProvider` interface in uw native runtime (Apple HealthKit / Android Health Connect / Google Fit) en koppel deze met `setProvider()` bij het opstarten. Molecule levert geen provider hiervoor mee. Detecteer de functionaliteit met `hasProvider()` of `getCapabilities().supported` voordat u de functie aanroept — een gezondheidsmeting heeft geen eerlijke standaardwaarde, dus dit genereert een foutmelding in plaats van valse gegevens terug te geven.',
}
