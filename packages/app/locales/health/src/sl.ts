import type { HealthTranslations } from './types.js'

/** Health translations for Slovenian. */
export const sl: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}u {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Ni povezanega ponudnika zdravstvenih storitev – implementirajte vmesnik `HealthProvider` v svojem izvornem izvajalnem okolju (Apple HealthKit / Android Health Connect / Google Fit) in ga ob zagonu povežite z `setProvider()` . Molecule zanj ne dobavlja nobenega ponudnika. Pred klicem zaznajte funkcije z `hasProvider()` ali `getCapabilities().supported` – branje zdravstvenih podatkov nima poštenih privzetih vrednosti, zato to vrže lažne podatke in ne vrne lažnih.',
}
