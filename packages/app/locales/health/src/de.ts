import type { HealthTranslations } from './types.js'

/** Health translations for de. */
export const de: Partial<HealthTranslations> = {
  'health.durationMinutes': '{{minutes}} Min',
  'health.durationHoursMinutes': '{{hours}} H {{minutes}} M',
  'health.error.noProvider':
    '`@molecule/app-health`: Kein Gesundheitsdienstleister eingebunden – implementieren Sie die `HealthProvider` Schnittstelle in Ihrer nativen Laufzeitumgebung (Apple HealthKit / Android Health Connect / Google Fit) und binden Sie sie beim Start mit `setProvider()` ein. Molecule stellt keinen entsprechenden Anbieter bereit. Prüfen Sie vor dem Aufruf mit `hasProvider()` oder `getCapabilities().supported` ob ein Gesundheitsdatenabruf vorhanden ist. Da es keinen eindeutigen Standardwert für einen Gesundheitsdatenabruf gibt, wird eine Ausnahme ausgelöst, anstatt falsche Daten zurückzugeben.',
}
