import type { UploadsTranslations } from './types.js'

/** Uploads translations for Khmer. */
export const km: UploadsTranslations = {
  'uploads.error.noProvider':
    'អ្នកផ្តល់សេវាផ្ទុកឡើងមិនបានកំណត់រចនាសម្ព័ន្ធ។ សូមហៅ setProvider() ជាមុនសិន។',
  'uploads.error.streamLimitReached': 'បានឈានដល់ដែនកំណត់ស្ទ្រីម។',
  'uploads.error.aborted': 'ការផ្ទុកឡើងត្រូវបានបោះបង់។',
  'uploads.error.fileTypeBlocked': 'មិនអាចផ្ទុកឡើងឯកសារប្រភេទ {{type}} បានទេ។',
  'uploads.error.activeTypeListed':
    'receiveUploads() រាយ {{type}} ដែលជាប្រភេទដែលកម្មវិធីរុករកដំណើរការ។ ផ្ដល់ allowActiveTypes: true ដើម្បីរក្សាទុកវា ហើយបម្រើឯកសារទាំងនោះដោយ sendUpload()។',
}
