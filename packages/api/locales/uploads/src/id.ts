import type { UploadsTranslations } from './types.js'

/** Uploads translations for Indonesian. */
export const id: UploadsTranslations = {
  'uploads.error.noProvider':
    'Penyedia unggahan belum dikonfigurasi. Panggil setProvider() terlebih dahulu.',
  'uploads.error.streamLimitReached': 'Batas aliran tercapai.',
  'uploads.error.aborted': 'Unggahan dibatalkan.',
  'uploads.error.fileTypeBlocked': 'File dengan jenis {{type}} tidak dapat diunggah.',
  'uploads.error.activeTypeListed':
    'receiveUploads() mencantumkan {{type}}, jenis yang dijalankan browser. Berikan allowActiveTypes: true untuk menyimpannya, dan sajikan file tersebut dengan sendUpload().',
}
