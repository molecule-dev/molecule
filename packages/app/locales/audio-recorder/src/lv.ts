import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for lv. */
export const lv: Partial<AudioRecorderTranslations> = {
  'audioRecorder.unsupported': 'Audio ierakstīšana šajā pārlūkprogrammā netiek atbalstīta.',
  'audioRecorder.error': 'Ierakstīšana neizdevās. Lūdzu, mēģiniet vēlreiz.',
  'audioRecorder.permissionDenied':
    'Mikrofona atļauja liegta. Atļaujiet piekļuvi un mēģiniet vēlreiz.',
  'audioRecorder.pause': 'Pauze',
  'audioRecorder.resume': 'CV',
  'audioRecorder.stop': 'Apstāties',
  'audioRecorder.elapsed': 'Pagājis<x> laiks</x>',
  'audioRecorder.statusPaused': 'Apturēts',
  'audioRecorder.statusProcessed': 'Ierakstīts',
  'audioRecorder.statusError': 'Kļūda',
  'audioRecorder.statusIdle': 'Gatavs ierakstīšanai',
  'audioRecorder.group': 'Audio ierakstītājs',
}
