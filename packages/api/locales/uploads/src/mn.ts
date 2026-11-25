import type { UploadsTranslations } from './types.js'

/** Uploads translations for Mongolian. */
export const mn: UploadsTranslations = {
  'uploads.error.noProvider':
    'Байршуулалтын нийлүүлэгч тохируулагдаагүй байна. Эхлээд setProvider() дуудна уу.',
  'uploads.error.streamLimitReached': 'Урсгалын хязгаарт хүрсэн.',
  'uploads.error.aborted': 'Байршуулалт цуцлагдлаа.',
  'uploads.error.fileTypeBlocked': '{{type}} төрлийн файлыг байршуулах боломжгүй.',
  'uploads.error.activeTypeListed':
    'receiveUploads() нь {{type}} төрлийг жагсаадаг бөгөөд үүнийг хөтөч ажиллуулдаг. Хадгалахын тулд allowActiveTypes: true дамжуулж, тэдгээр файлыг sendUpload()-ээр үйлчилнэ үү.',
}
