import type { UploadsTranslations } from './types.js'

/** Uploads translations for Chinese. */
export const zh: UploadsTranslations = {
  'uploads.error.noProvider': '上传提供者未配置。请先调用 setProvider()。',
  'uploads.error.streamLimitReached': '已达到流限制。',
  'uploads.error.aborted': '上传已中止。',
  'uploads.error.fileTypeBlocked': '无法上传 {{type}} 类型的文件。',
  'uploads.error.activeTypeListed':
    'receiveUploads() 列出了 {{type}}，这是浏览器会执行的类型。传入 allowActiveTypes: true 以存储它，并使用 sendUpload() 提供这些文件。',
}
