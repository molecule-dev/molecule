import type { HealthTranslations } from './types.js'

/** Health translations for Polish. */
export const pl: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}godz {{minutes}}min',
  'health.durationMinutes': '{{minutes}}min',
  'health.error.noProvider':
    '`@molecule/app-health`: Brak powiązanego dostawcy usług medycznych — zaimplementuj interfejs `HealthProvider` w swoim natywnym środowisku uruchomieniowym (Apple HealthKit / Android Health Connect / Google Fit) i powiąż go za pomocą `setProvider()` podczas uruchamiania. Żaden dostawca nie jest dostarczany z flotą. Wykrywanie funkcji za pomocą `hasProvider()` lub `getCapabilities().supported` przed wywołaniem — odczyt danych medycznych nie ma uczciwej wartości domyślnej, więc to powoduje błąd zamiast zwrócić fałszywe dane.',
}
