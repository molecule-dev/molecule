import type { HealthTranslations } from './types.js'

/** Health translations for Khmer. */
export const km: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ម៉ {{minutes}}ន',
  'health.durationMinutes': '{{minutes}}ន',
  'health.error.noProvider':
    '`@molecule/app-health`: គ្មានអ្នកផ្តល់សេវាសុខភាពណាម្នាក់ត្រូវបានភ្ជាប់ទេ — អនុវត្តចំណុចប្រទាក់ `HealthProvider` នៅលើ runtime ដើមរបស់អ្នក (Apple HealthKit / Android Health Connect / Google Fit) ហើយភ្ជាប់វាជាមួយ `setProvider()` នៅពេលចាប់ផ្តើម។ Molecule មិនដឹកជញ្ជូនអ្នកផ្តល់សេវាសម្រាប់វាទេ។ រកឃើញមុខងារជាមួយ `hasProvider()` ឬ `getCapabilities().supported` មុនពេលហៅ — ការអានសុខភាពមិនមានលំនាំដើមស្មោះត្រង់ទេ ដូច្នេះវាបោះចោលជាជាងប្រគល់ទិន្នន័យក្លែងក្លាយ។',
}
