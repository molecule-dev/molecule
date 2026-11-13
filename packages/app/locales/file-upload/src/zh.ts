import type { FileUploadTranslations } from './types.js'

/** FileUpload translations for zh. */
export const zh: FileUploadTranslations = {
  'fileUpload.error.cancelled': '上传已取消',
  'fileUpload.error.extensionNotAccepted': '文件扩展名“ {{extension}} ”不被接受',
  'fileUpload.error.maxFiles': '已达到最大文件数 ({{maxFiles}})',
  'fileUpload.error.maxSize': '文件大小超过{{maxSize}}字节',
  'fileUpload.error.minSize': '文件大小小于{{minSize}}字节的最小值',
  'fileUpload.error.networkError': '由于网络错误，上传失败。',
  'fileUpload.error.noSource': '没有可用的源文件',
  'fileUpload.error.timedOut': '上传超时',
  'fileUpload.error.typeNotAccepted': '文件类型“ {{type}} ”不被接受',
  'fileUpload.error.uploadFailed': '上传失败',
  'fileUpload.error.uploadFailedStatus': '上传失败，状态为{{status}}',
}
