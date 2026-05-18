import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for nl. */
export const nl: Partial<AudioRecorderTranslations> = {
  'audioRecorder.pause': 'Pauzeren',
  'audioRecorder.resume': 'Hervatten',
  'audioRecorder.statusPaused': 'Gepauzeerd',
  'audioRecorder.unsupported': 'Audio-opname wordt niet ondersteund in deze browser.',
  'audioRecorder.error': 'Opname mislukt. Probeer het opnieuw.',
  'audioRecorder.permissionDenied':
    'Toegang tot de microfoon geweigerd. Geef toestemming en probeer het opnieuw.',
  'audioRecorder.stop': 'Stop',
  'audioRecorder.elapsed': 'Verstreken<x> {{tijd}}</x>',
  'audioRecorder.statusProcessed': 'Opgenomen',
  'audioRecorder.statusError': 'Fout',
  'audioRecorder.statusIdle': 'Klaar om op te nemen',
  'audioRecorder.group': 'Audio-recorder',
}
