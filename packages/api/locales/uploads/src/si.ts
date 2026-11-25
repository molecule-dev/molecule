import type { UploadsTranslations } from './types.js'

/** Uploads translations for Sinhala. */
export const si: UploadsTranslations = {
  'uploads.error.noProvider': 'උඩුගත කිරීමේ සපයන්නා වින්‍යාස කර නැත. පළමුව setProvider() අමතන්න.',
  'uploads.error.streamLimitReached': 'ප්‍රවාහ සීමාවට ළඟා විය.',
  'uploads.error.aborted': 'උඩුගත කිරීම අවලංගු කරන ලදී.',
  'uploads.error.fileTypeBlocked': '{{type}} වර්ගයේ ගොනු උඩුගත කළ නොහැක.',
  'uploads.error.activeTypeListed':
    'receiveUploads() {{type}} ලැයිස්තුගත කරයි, එය බ්‍රවුසරයක් ධාවනය කරන වර්ගයකි. එය ගබඩා කිරීමට allowActiveTypes: true ලබා දී, එම ගොනු sendUpload() මගින් සපයන්න.',
}
