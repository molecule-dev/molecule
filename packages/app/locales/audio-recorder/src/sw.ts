import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for sw. */
export const sw: Partial<AudioRecorderTranslations> = {
  'audioRecorder.unsupported': 'Kurekodi sauti hakutumiki katika kivinjari hiki',
  'audioRecorder.error': 'Imeshindwa kurekodi. Tafadhali jaribu tena.',
  'audioRecorder.permissionDenied':
    'Ruhusa ya maikrofoni imekataliwa. Ruhusu ufikiaji na ujaribu tena.',
  'audioRecorder.pause': 'Sitisha',
  'audioRecorder.resume': 'Wasifu',
  'audioRecorder.stop': 'Simamisha',
  'audioRecorder.elapsed': 'Imepita<x> {{wakati}}</x>',
  'audioRecorder.statusPaused': 'Imesitishwa',
  'audioRecorder.statusProcessed': 'Imerekodiwa',
  'audioRecorder.statusError': 'Hitilafu',
  'audioRecorder.statusIdle': 'Tayari kurekodi',
  'audioRecorder.group': 'Kinasa sauti',
}
