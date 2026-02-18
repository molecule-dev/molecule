import type { ConfigTranslations } from './types.js'

/** Config translations for Khmer. */
export const km: ConfigTranslations = {
  'config.error.required': "ការកំណត់រចនាសម្ព័ន្ធដែលតម្រូវ '{{key}}' មិនត្រូវបានកំណត់ទេ។",
  'config.error.mustBeNumber': "ការកំណត់រចនាសម្ព័ន្ធ '{{key}}' ត្រូវតែជាលេខ។",
  'config.error.minValue': "ការកំណត់រចនាសម្ព័ន្ធ '{{key}}' ត្រូវតែយ៉ាងហោចណាស់ {{min}}។",
  'config.error.maxValue': "ការកំណត់រចនាសម្ព័ន្ធ '{{key}}' ត្រូវតែច្រើនបំផុត {{max}}។",
  'config.error.mustBeBoolean':
    "ការកំណត់រចនាសម្ព័ន្ធ '{{key}}' ត្រូវតែជា boolean (true/false/1/0)។",
  'config.error.mustBeJson': "ការកំណត់រចនាសម្ព័ន្ធ '{{key}}' ត្រូវតែជា JSON ត្រឹមត្រូវ។",
  'config.error.patternMismatch':
    "ការកំណត់រចនាសម្ព័ន្ធ '{{key}}' មិនត្រូវគ្នានឹងលំនាំ '{{pattern}}' ទេ។",
  'config.error.invalidEnum': "ការកំណត់រចនាសម្ព័ន្ធ '{{key}}' ត្រូវតែជាមួយក្នុងចំណោម៖ {{values}}។",
  'config.error.validationNotSupported':
    'អ្នកផ្តល់សេវាកំណត់រចនាសម្ព័ន្ធបច្ចុប្បន្នមិនគាំទ្រការផ្ទៀងផ្ទាត់ទេ។',
}
