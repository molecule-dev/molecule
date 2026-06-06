import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for ca. */
export const ca: Partial<AudioRecorderTranslations> = {
  'audioRecorder.unsupported': "Aquest navegador no admet l'enregistrament d'àudio",
  'audioRecorder.error': "L'enregistrament ha fallat. Torna-ho a intentar.",
  'audioRecorder.permissionDenied':
    "Permís de micròfon denegat. Permet l'accés i torna-ho a provar.",
  'audioRecorder.pause': 'Pausa',
  'audioRecorder.resume': 'Currículum vitae',
  'audioRecorder.stop': 'Atura',
  'audioRecorder.elapsed': 'Transcorregut<x> {{hora}}</x>',
  'audioRecorder.statusPaused': 'En pausa',
  'audioRecorder.statusProcessed': 'Enregistrat',
  'audioRecorder.statusError': 'Error',
  'audioRecorder.statusIdle': 'Llest per gravar',
  'audioRecorder.group': "Gravadora d'àudio",
}
