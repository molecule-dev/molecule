import type { AiTranslations } from './types.js'

/** Ai translations for Khmer. */
export const km: AiTranslations = {
  'ai.error.noProvider': 'អ្នកផ្តល់ AI មិនត្រូវបានកំណត់រចនាសម្ព័ន្ធទេ។ ភ្ជាប់អ្នកផ្តល់ AI មុនសិន។',
  'ai.error.ambiguousProvider':
    'អ្នកផ្តល់ AI ដែលមានឈ្មោះជាច្រើនត្រូវបានភ្ជាប់ ហើយគ្មានលំនាំដើមត្រូវបានកំណត់ទេ។ ប្រើ getProviderByName(name) ដើម្បីជ្រើសរើសមួយ។',
  'ai.error.responseIncomplete': 'ការឆ្លើយតបរបស់ AI បានបញ្ចប់មុនពេលបញ្ចប់។ សូមព្យាយាមម្តងទៀត។',
  'ai.error.responseTokenLimit':
    'ការឆ្លើយតបរបស់ AI បានឈានដល់ដែនកំណត់សញ្ញាសម្ងាត់ទិន្នផលមុនពេលបញ្ចប់។',
  'ai.error.apiError': 'កំហុសសេវាកម្ម AI។ សូមព្យាយាមម្តងទៀត។',
  'ai.error.noResponseBody': 'គ្មានការឆ្លើយតបពីសេវាកម្ម AI ទេ។',
}
