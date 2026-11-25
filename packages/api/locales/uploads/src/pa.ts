import type { UploadsTranslations } from './types.js'

/** Uploads translations for Punjabi. */
export const pa: UploadsTranslations = {
  'uploads.error.noProvider': 'ਅੱਪਲੋਡ ਪ੍ਰਦਾਤਾ ਸੰਰਚਿਤ ਨਹੀਂ ਹੈ। ਪਹਿਲਾਂ setProvider() ਕਾਲ ਕਰੋ।',
  'uploads.error.streamLimitReached': 'ਸਟ੍ਰੀਮ ਸੀਮਾ ਪਹੁੰਚ ਗਈ।',
  'uploads.error.aborted': 'ਅੱਪਲੋਡ ਰੱਦ ਕਰ ਦਿੱਤਾ ਗਿਆ।',
  'uploads.error.fileTypeBlocked': '{{type}} ਕਿਸਮ ਦੀਆਂ ਫ਼ਾਈਲਾਂ ਅੱਪਲੋਡ ਨਹੀਂ ਕੀਤੀਆਂ ਜਾ ਸਕਦੀਆਂ।',
  'uploads.error.activeTypeListed':
    'receiveUploads() {{type}} ਨੂੰ ਸੂਚੀਬੱਧ ਕਰਦਾ ਹੈ, ਜੋ ਬ੍ਰਾਊਜ਼ਰ ਚਲਾਉਂਦਾ ਹੈ ਅਜਿਹੀ ਕਿਸਮ ਹੈ। ਇਸਨੂੰ ਸਟੋਰ ਕਰਨ ਲਈ allowActiveTypes: true ਦਿਓ, ਅਤੇ ਉਹ ਫ਼ਾਈਲਾਂ sendUpload() ਨਾਲ ਦਿਓ।',
}
