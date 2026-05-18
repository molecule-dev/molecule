import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for fi. */
export const fi: Partial<AudioRecorderTranslations> = {
  'audioRecorder.pause': 'Tauko',
  'audioRecorder.resume': 'Jatka',
  'audioRecorder.statusPaused': 'Keskeytetty',
  'audioRecorder.unsupported': 'Äänitallennusta ei tueta tässä selaimessa',
  'audioRecorder.error': 'Tallennus epäonnistui. Yritä uudelleen.',
  'audioRecorder.permissionDenied':
    'Mikrofonin käyttöoikeus evätty. Salli käyttö ja yritä uudelleen.',
  'audioRecorder.stop': 'Stop',
  'audioRecorder.elapsed': 'Kulunut<x> {{aika}}</x>',
  'audioRecorder.statusProcessed': 'Tallennettu',
  'audioRecorder.statusError': 'Virhe',
  'audioRecorder.statusIdle': 'Valmis tallentamaan',
  'audioRecorder.group': 'Ääninauhuri',
}
