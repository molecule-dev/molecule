import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for gl. */
export const gl: Partial<AudioRecorderTranslations> = {
  'audioRecorder.unsupported': 'A gravación de audio non é compatible con este navegador',
  'audioRecorder.error': 'Fallou a gravación. Téntao de novo.',
  'audioRecorder.permissionDenied':
    'Permiso de micrófono denegado. Permite o acceso e téntao de novo.',
  'audioRecorder.pause': 'Pausa',
  'audioRecorder.resume': 'Currículo',
  'audioRecorder.stop': 'Parar',
  'audioRecorder.elapsed': 'Transcorrido<x> {{hora}}</x>',
  'audioRecorder.statusPaused': 'En pausa',
  'audioRecorder.statusProcessed': 'Gravado',
  'audioRecorder.statusError': 'Erro',
  'audioRecorder.statusIdle': 'Listo para gravar',
  'audioRecorder.group': 'Gravador de son',
}
