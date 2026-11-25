import type { UploadsTranslations } from './types.js'

/** Uploads translations for Kyrgyz. */
export const ky: UploadsTranslations = {
  'uploads.error.noProvider':
    'Жүктөө провайдери конфигурацияланган эмес. Адегенде setProvider() чакырыңыз.',
  'uploads.error.streamLimitReached': 'Агым чегине жетти.',
  'uploads.error.aborted': 'Жүктөө токтотулду.',
  'uploads.error.fileTypeBlocked': '{{type}} түрүндөгү файлдарды жүктөөгө болбойт.',
  'uploads.error.activeTypeListed':
    'receiveUploads() {{type}} түрүн тизмектейт, бул браузер иштеткен түр. Аны сактоо үчүн allowActiveTypes: true бериңиз, ал файлдарды sendUpload() аркылуу бериңиз.',
}
