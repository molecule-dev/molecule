import type { HealthTranslations } from './types.js'

/** Health translations for Kazakh. */
export const kk: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}с {{minutes}}м',
  'health.durationMinutes': '{{minutes}}м',
  'health.error.noProvider':
    '`@molecule/app-health`: Ешқандай денсаулық сақтау провайдері байланыстырылмаған — `HealthProvider` интерфейсін өзіңіздің жергілікті жұмыс уақытыңызда (Apple HealthKit / Android Health Connect / Google Fit) іске қосыңыз және оны іске қосу кезінде `setProvider()` арқылы байланыстырыңыз. Molecule оған ешқандай провайдер жібермейді. Шақыру алдында `hasProvider()` немесе `getCapabilities().supported` арқылы мүмкіндіктерді анықтаңыз — денсаулық сақтау көрсеткішінде шынайы әдепкі мән жоқ, сондықтан бұл жалған деректерді қайтарудың орнына жібереді.',
}
