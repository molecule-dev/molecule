import type { UploadsTranslations } from './types.js'

/** Uploads translations for Chinese (Traditional). */
export const zhTW: UploadsTranslations = {
  'uploads.error.noProvider': '上傳提供者未設定。請先呼叫 setProvider()。',
  'uploads.error.streamLimitReached': '已達到串流限制。',
  'uploads.error.aborted': '上傳已中止。',
  'uploads.error.fileTypeBlocked': '無法上傳 {{type}} 類型的檔案。',
  'uploads.error.activeTypeListed':
    'receiveUploads() 列出了 {{type}}，這是瀏覽器會執行的類型。傳入 allowActiveTypes: true 以儲存它，並使用 sendUpload() 提供這些檔案。',
}
