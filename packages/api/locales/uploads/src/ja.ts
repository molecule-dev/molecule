import type { UploadsTranslations } from './types.js'

/** Uploads translations for Japanese. */
export const ja: UploadsTranslations = {
  'uploads.error.noProvider':
    'アップロードプロバイダーが設定されていません。先にsetProvider()を呼び出してください。',
  'uploads.error.streamLimitReached': 'ストリームの制限に達しました。',
  'uploads.error.aborted': 'アップロードが中止されました。',
  'uploads.error.fileTypeBlocked': '{{type}} 形式のファイルはアップロードできません。',
  'uploads.error.activeTypeListed':
    'receiveUploads() に {{type}} が含まれています。これはブラウザーが実行する形式です。保存するには allowActiveTypes: true を渡し、そのファイルは sendUpload() で配信してください。',
}
