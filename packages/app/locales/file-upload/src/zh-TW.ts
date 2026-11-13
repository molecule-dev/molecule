import type { FileUploadTranslations } from './types.js'

/** FileUpload translations for zh-TW. */
export const zhTW: FileUploadTranslations = {
  'fileUpload.error.cancelled': '上傳已取消',
  'fileUpload.error.extensionNotAccepted': '檔案副檔名「{{extension}}」不被接受',
  'fileUpload.error.maxFiles': '已達到最大檔案數 ({{maxFiles}})',
  'fileUpload.error.maxSize': '檔案大小超過{{maxSize}}位元組',
  'fileUpload.error.minSize': '檔案大小小於{{minSize}}位元組的最小值',
  'fileUpload.error.networkError': '由於網路錯誤，上傳失敗。',
  'fileUpload.error.noSource': '沒有可用的來源文件',
  'fileUpload.error.timedOut': '上傳逾時',
  'fileUpload.error.typeNotAccepted': '文件類型「{{type}}」不被接受',
  'fileUpload.error.uploadFailed': '上傳失敗',
  'fileUpload.error.uploadFailedStatus': '上傳失敗，狀態為{{status}}',
}
