import type { UploadsTranslations } from './types.js'

/** Uploads translations for Albanian. */
export const sq: UploadsTranslations = {
  'uploads.error.noProvider':
    'Ofruesi i ngarkimit nuk është konfiguruar. Thirrisni setProvider() së pari.',
  'uploads.error.streamLimitReached': 'Kufiri i rrjedhës u arrit.',
  'uploads.error.aborted': 'Ngarkimi u anulua.',
  'uploads.error.fileTypeBlocked': 'Skedarët e llojit {{type}} nuk mund të ngarkohen.',
  'uploads.error.activeTypeListed':
    'receiveUploads() rendit {{type}}, një lloj që shfletuesi e ekzekuton. Jepni allowActiveTypes: true për ta ruajtur dhe shërbejini ato skedarë me sendUpload().',
}
