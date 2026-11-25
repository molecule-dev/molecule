import type { UploadsTranslations } from './types.js'

/** Uploads translations for Telugu. */
export const te: UploadsTranslations = {
  'uploads.error.noProvider':
    'అప్‌లోడ్ ప్రొవైడర్ కాన్ఫిగర్ చేయబడలేదు. ముందుగా setProvider() కాల్ చేయండి.',
  'uploads.error.streamLimitReached': 'స్ట్రీమ్ పరిమితి చేరుకుంది.',
  'uploads.error.aborted': 'అప్‌లోడ్ రద్దు చేయబడింది.',
  'uploads.error.fileTypeBlocked': '{{type}} రకం ఫైల్‌లను అప్‌లోడ్ చేయలేరు.',
  'uploads.error.activeTypeListed':
    'receiveUploads() {{type}} ను జాబితా చేస్తుంది, ఇది బ్రౌజర్ అమలు చేసే రకం. దాన్ని నిల్వ చేయడానికి allowActiveTypes: true ఇవ్వండి, ఆ ఫైల్‌లను sendUpload() తో అందించండి.',
}
