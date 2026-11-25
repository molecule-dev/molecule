import type { UploadsTranslations } from './types.js'

/** Uploads translations for Korean. */
export const ko: UploadsTranslations = {
  'uploads.error.noProvider':
    '업로드 제공자가 구성되지 않았습니다. 먼저 setProvider()를 호출하세요.',
  'uploads.error.streamLimitReached': '스트림 제한에 도달했습니다.',
  'uploads.error.aborted': '업로드가 중단되었습니다.',
  'uploads.error.fileTypeBlocked': '{{type}} 형식의 파일은 업로드할 수 없습니다.',
  'uploads.error.activeTypeListed':
    'receiveUploads()에 브라우저가 실행하는 형식인 {{type}}이(가) 있습니다. 저장하려면 allowActiveTypes: true을(를) 전달하고 해당 파일은 sendUpload()(으)로 제공하세요.',
}
